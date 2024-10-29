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
import { readStatusFile, updateStatusFile } from "../../core/utils/statusUpdater-utils.js";
import { serviceHealthCheck } from "../../core/utils/healthCheck-utils.js";
import { runTerraformUnlockCommands } from "../../core/utils/unlockTerraformState-utils.js";
import { executeCommandWithRetry } from "../../core/common-functions/execCommands.js";

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
      const projectPath = path.join(process.cwd(), args.name);
      const infrastructurePath = path.join(projectPath, 'infrastructure');
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
          let allModulesAppliedSuccessfully = true; 
          let unlockCommandsExecuted = false
          if (status.services["terraform-apply"] === "fail" || status.services["terraform-apply"] === "pending") {
           if (!unlockCommandsExecuted) {
              await runTerraformUnlockCommands(projectPath, responses.aws_profile);
              unlockCommandsExecuted = true;
          }
          for (const module of modules) {
            if(status.modules[module] === "fail"){
              await executeCommandWithRetry(`export AWS_PROFILE=${responses.aws_profile}`, { cwd: infrastructurePath }, 1);
              await executeCommandWithRetry(`terraform destroy -target=${module} `, { cwd: infrastructurePath }, 1);
            }
            if(status.modules[module] === "fail" || status.modules[module] === "pending"){
            try {
              AppLogger.info( `Starting Terraform apply for module: ${module}`, true );
              updateStatusFile(projectName, module, "fail");
              await terraform?.runTerraformApply( process.cwd() + "/" + projectName + "/infrastructure", module, "terraform.tfvars");
              AppLogger.debug( `Successfully applied Terraform for module: ${module}`);
              updateStatusFile(projectName, module, "success");
            } catch (error) {
              AppLogger.error(`Error applying Terraform for module: ${module}, ${error}`, true);
              allModulesAppliedSuccessfully = false; 
              updateStatusFile(projectName, module, "fail");
            }
           }
          }
           if (allModulesAppliedSuccessfully) {
             updateStatusFile(projectName, "terraform-apply", "success");
          }else{
            updateStatusFile(projectName, "terraform-apply", "fail");
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
        if (status.services["auth-service"] === "fail" || status.services["auth-service"] === "pending") {
          const statusAuthenticationService =
            await createApp.setupAuthenticationService(project_config);
          if (statusAuthenticationService) {
            configObject.appName = "auth-service";
            configObject.appType = "auth-service";
            await ManageRepository.pushCode(configObject);
          }
        }

        if (status.services["keycloak"] === "fail" || status.services["keycloak"] === "pending") {
          const statusKeycloakService = await createApp.setupKeyCloak(project_config);
          if (statusKeycloakService) {
            configObject.appName = "keycloak";
            configObject.appType = "keycloak-service";
            await ManageRepository.pushCode(configObject);
          }
        }

        if (status.services["my-node-app"] === "fail" || status.services["my-node-app"] === "pending") {
          if (project_config["backend_app_type"]) {
            const projectConfig = dotMagikubeConfig(configObject.projectName, process.cwd())
            configObject.appName = project_config["node_app_name"];
            configObject.appType = project_config["backend_app_type"];
            await createApp.handleAppCreation(project_config["backend_app_type"],configObject, projectConfig);
          }
        }

        if (project_config["frontend_app_type"]) {
            const frontendAppType = project_config["frontend_app_type"]
            if (status.services[frontendAppType] === "fail" || status.services[frontendAppType] === "pending") {  
            const projectConfig = dotMagikubeConfig(configObject.projectName, process.cwd())
            configObject.appType = project_config["frontend_app_type"]
            await createApp.handleAppCreation(project_config["frontend_app_type"], configObject, projectConfig);
          }
        }


        if (status.services["gitops"] === "fail" || status.services["gitops"] === "pending"){
        const setupGitopsServiceStatus = await createApp.setupGitops(project_config);
          if (setupGitopsServiceStatus) {
            configObject.appName = `${environment}`;
            configObject.appType = "gitops";
            await ManageRepository.pushCode(configObject);
          }
       }
      }

      createApp.MoveFiles(projectName);
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
