import { Args } from "@oclif/core";
import BaseCommand from "../base.js";
// import TerraformProject from "../../core/terraform-project.js";
// import SystemConfig from "../../config/system.js";
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
import { readStatusFile } from "../../core/utils/statusUpdater-utils.js";
import { setupServices } from "../../core/utils/healthCheck-utils.js";

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
    AppLogger.configureLogger();
    AppLogger.info("Logger Started ...");
    const { args } = await this.parse(RestartProject);
    const project_config = dotMagikubeConfig(args.name, process.cwd());

    try {
      let responses: Answers = {
        project_name: args.name,
        project_id: uuidv4(),
        dryrun: false,
      };
       
      const projectName = args.name;
      const status =  await readStatusFile(projectName)
      const terraform = await RestartTerraformProject.getProject(this, projectName);
      let command: BaseCommand | undefined;
      const createApp = new CreateApplication(
        command as BaseCommand,
        project_config
      );
      const modules = [
        "module.vpc",
        "module.eks",
        "module.acm",
        "module.ecr-repo",
        "module.gitops",
        "module.repository",
        "module.ingress-controller",
        "module.argo",
        "module.environment",
      ];
      if (terraform) {
        await terraform.createProject(projectName, process.cwd());
        if (project_config.cloud_provider === "aws") {
          await terraform.AWSProfileActivate(project_config["aws_profile"]);
        }
      
        if (
          project_config.cluster_type === "eks-fargate" ||
          project_config.cluster_type === "eks-nodegroup"
        ) {
          // Delay of 15 seconds to allow the user to review the terraform files
          await new Promise((resolve) => setTimeout(resolve, 15000));
          await terraform?.runTerraformInit(process.cwd() + "/" + projectName + "/infrastructure",`${project_config["environment"]}-config.tfvars`, projectName);
          if (status["terraform-apply"] === "fail" || status["terraform-apply"] === "pending") {
          for (const module of modules) {
            try {
              AppLogger.info( `Starting Terraform apply for module: ${module}`, true );
              await terraform?.runTerraformApply( process.cwd() + "/" + projectName + "/infrastructure", module, "terraform.tfvars");
              AppLogger.debug( `Successfully applied Terraform for module: ${module}`);
            } catch (error) {
              AppLogger.error(`Error applying Terraform for module: ${module}, ${error}`, true);
            }
          }
        }
        }
        // if (project_config.cluster_type === "k8s") {
        //   await new Promise((resolve) => setTimeout(resolve, 10000));
        //   await terraform?.runAnsiblePlaybook1(process.cwd() + "/" + projectName);
        //   await terraform?.runAnsiblePlaybook2(process.cwd() + "/" + projectName);
        //   terraform?.startSSHProcess();
        //   const masterIP = await terraform?.getMasterIp( process.cwd() + "/" + projectName);
        //   await terraform?.editKubeConfigFile(process.cwd() + "/" + projectName + "/templates/aws/ansible/config/" +masterIP + "/etc/kubernetes/admin.conf");
        //   await terraform?.runTerraform(process.cwd() + "/" + projectName + "/k8s_config", `../${responses["environment"]}-config.tfvars`, "module.ingress-controller", "../terraform.tfvars");
        //   terraform?.stopSSHProcess();
        // }

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

        
        const configObject: ConfigObject = {token,userName,orgName, sourceCodeRepo, region, projectName, awsAccessKey, awsSecretKey, environment,};
        if (status["auth-service"] === "fail" || status["auth-service"] === "pending") {
          const statusAuthenticationService =
            await createApp.setupAuthenticationService(project_config);
          if (statusAuthenticationService) {
            configObject.appName = "auth-service";
            configObject.appType = "auth-service";
            await ManageRepository.pushCode(configObject);
          }
        }

        if (status["keycloak"] === "fail" || status["keycloak"] === "pending") {
          const statusKeycloakService = await createApp.setupKeyCloak(project_config);
          if (statusKeycloakService) {
            configObject.appName = "keycloak";
            configObject.appType = "keycloak-service";
            await ManageRepository.pushCode(configObject);
          }
        }

        if (status["my-node-app"] === "fail" || status["my-node-app"] === "pending") {
          if (project_config["backend_app_type"]) {
            const projectConfig = dotMagikubeConfig(configObject.projectName, process.cwd())
            configObject.appName = project_config["node_app_name"];
            configObject.appType = project_config["backend_app_type"];
            await createApp.handleAppCreation(project_config["backend_app_type"],configObject, projectConfig);
          }
        }

        if (project_config["frontend_app_type"]) {
            const frontendAppType = project_config["frontend_app_type"]
            if (status[frontendAppType] === "fail" || status[frontendAppType] === "pending") {  
            const projectConfig = dotMagikubeConfig(configObject.projectName, process.cwd())
            configObject.appType = project_config["frontend_app_type"]
            await createApp.handleAppCreation(project_config["frontend_app_type"], configObject, projectConfig);
          }
        }


        if (status["gitops"] === "fail" || status["gitops"] === "pending"){
        const setupGitopsServiceStatus = await createApp.setupGitops(project_config);
          if (setupGitopsServiceStatus) {
            configObject.appName = `${environment}`;
            configObject.appType = "gitops";
            await ManageRepository.pushCode(configObject);
          }
       }
      }

      await createApp.MoveFiles(projectName);
      await setupServices(args, responses, project_config);
    } catch (error) {
      AppLogger.error(
        `An error occurred during the setup process: ${error}`,
        true
      );
      process.exit(1);
    }
  }
}
