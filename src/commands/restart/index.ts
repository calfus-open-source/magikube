import { Args } from "@oclif/core";
import BaseCommand from "../base.js";
import * as fs from "fs";
import { AppLogger } from "../../logger/appLogger.js";
import CreateApplication from "../../core/setup-application.js";
import { ManageRepository } from "../../core/manage-repository.js";
import { ConfigObject } from "../../core/interface.js";
import { Answers } from "inquirer";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { dotMagikubeConfig } from "../../core/utils/projectConfigReader-utils.js";
import RestartTerraformProject from "../../core/restartTerraform-project.js";
import {
  readStatusFile,
  updateStatusFile,
} from "../../core/utils/statusUpdater-utils.js";
import { serviceHealthCheck } from "../../core/utils/healthCheck-utils.js";
import { runTerraformUnlockCommands } from "../../core/utils/unlockTerraformState-utils.js";
import { executeCommandWithRetry } from "../../core/utils/executeCommandWithRetry-utils.js";
import { modules } from "../../core/constants/constants.js";
import { setupAndPushServices } from "../../core/utils/setupAndPushService-utils.js";
import SystemConfig from "../../config/system.js";

export default class RestartProject extends BaseCommand {
  static args = {
    name: Args.string({
      description: "Project name to be restarted",
      required: true,
    }),
  };

  static description = "Restart the magikube project from where it left off";

  static examples = [
    `<%= config.bin %> <%= command.id %> sample 
     Restarting magikube project named 'sample' from where it left off`,
  ];

  async run(): Promise<void> {
    const { args } = await this.parse(RestartProject);
    // Initialize the logger
    AppLogger.configureLogger();
    AppLogger.info("Logger Started ...");

    //  Read the .magikube file
    const responses = dotMagikubeConfig(args.name, process.cwd());
    responses.command = this.id;
    SystemConfig.getInstance().mergeConfigs(responses);
    // Read project configurations
    const project_config = SystemConfig.getInstance().getConfig();

    try {
      let responses: Answers = {
        project_name: args.name,
        project_id: uuidv4(),
        dryrun: false,
      };

      const projectName = args.name;
      const status = await readStatusFile(project_config);
      const terraform = await RestartTerraformProject.getProject(
        this,
        projectName
      );
      const projectPath = path.join(process.cwd(), args.name);
      const infrastructurePath = path.join(projectPath, "infrastructure");

      if (terraform) {
        await terraform.createProject(projectName, process.cwd());

        //Activate the AWS profile
        if (project_config.cloud_provider === "aws") {
          await terraform.AWSProfileActivate(project_config["aws_profile"]);
        }

        // setup infrastructure if cluster type is eks-fargate OR eks-nodegroup
        if (
          project_config.cluster_type === "eks-fargate" ||
          project_config.cluster_type === "eks-nodegroup"
        ) {
          // Delay of 15 seconds to allow the user to review the terraform files
          await new Promise((resolve) => setTimeout(resolve, 15000));

          //initialize terraform 
          await terraform.runTerraformInit(
            `${process.cwd()}/${projectName}/infrastructure`,
            `${project_config["environment"]}-config.tfvars`,
            projectName
          );

          let allModulesAppliedSuccessfully = true;
          let unlockCommandsExecuted = false;
          
          //Unlock terraform tfstate 
          if (
            status.services["terraform-apply"] === "fail" ||
            status.services["terraform-apply"] === "pending"
          ) {
            if (!unlockCommandsExecuted) {
              await runTerraformUnlockCommands(projectPath, project_config);
              unlockCommandsExecuted = true;
            }

            for (const module of modules) {
              if (status.modules[module] === "fail") {
                await executeCommandWithRetry(
                  `export AWS_PROFILE=${responses.aws_profile}`,
                  { cwd: infrastructurePath },
                  1
                );
                await executeCommandWithRetry(
                  `terraform destroy -target=${module} `,
                  { cwd: infrastructurePath },
                  1
                );
              }

              if (
                status.modules[module] === "fail" ||
                status.modules[module] === "pending"
              ) {
                try {
                  AppLogger.info(
                    `Starting Terraform apply for module: ${module}`,
                    true
                  );
                  updateStatusFile(projectName, module, "fail");
                  await terraform.runTerraformApply(
                    `${process.cwd()}/${projectName}/infrastructure`,
                    module,
                    "terraform.tfvars"
                  );
                  AppLogger.debug(
                    `Successfully applied Terraform for module: ${module}`
                  );
                  updateStatusFile(projectName, module, "success");
                } catch (error) {
                  AppLogger.error(
                    `Error applying Terraform for module: ${module}, ${error}`,
                    true
                  );
                  allModulesAppliedSuccessfully = false;
                  updateStatusFile(projectName, module, "fail");
                }
              }
            }

            if (allModulesAppliedSuccessfully) {
              updateStatusFile(projectName, "terraform-apply", "success");
            } else {
              updateStatusFile(projectName, "terraform-apply", "fail");
            }
          }
        }

        const {
          github_access_token: token,
          git_user_name: userName,
          github_owner: orgName,
          source_code_repository: sourceCodeRepo,
          aws_region: region,
          aws_access_key_id: awsAccessKey,
          aws_secret_access_key: awsSecretKey,
          environment: environment,
        } = project_config;

        const configObject: ConfigObject = {
          token,
          userName,
          orgName,
          sourceCodeRepo,
          region,
          projectName,
          awsAccessKey,
          awsSecretKey,
          environment,
        };

        // create microservices
        await setupAndPushServices(project_config, configObject);
      }

      // check the status of microservice
      await serviceHealthCheck(args, responses, project_config);
    } catch (error) {
      AppLogger.error(
        `An error occurred during the setup process: ${error}`,
        true
      );
      process.exit(1);
    }
  }
}
