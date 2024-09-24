import { Args, Flags } from "@oclif/core";
import BaseCommand from "../base.js";
import inquirer, { Answers } from "inquirer";
import TerraformProject from "../../core/terraform-project.js";
import PromptGenerator from "../../prompts/prompt-generator.js";
import { v4 as uuidv4 } from "uuid";
import SystemConfig from "../../config/system.js";
import fs from "fs";
import { AppLogger } from "../../logger/appLogger.js";
import CreateApplication from "../../core/setup-application.js";
import CredentialsPrompts from "../../prompts/credentials-prompts.js";
import { ConfigObject } from "../../core/interface.js";
import { ManageRepository } from "../../core/manage-repository.js";
import { executeCommandWithRetry } from "../../core/common-functions/execCommands.js";
import { Colours } from "../../prompts/constants.js";
import {checkServiceStatus, waitForServiceToUP,} from "../../core/utils/checkStatus-utils.js";
import { execSync } from "child_process";
import { readProjectConfig } from "../../core/utils/magikubeConfigreader.js";
 
 
function validateUserInput(input: string): void {
  const pattern = /^(?=.{3,8}$)(?!.*_$)[a-z][a-z0-9]*(?:_[a-z0-9]*)?$/;
  if (pattern.test(input)) {
    console.log("Input is valid.");
  } else {
    console.error(`\n \n  ${Colours.boldText}${Colours.redColor} ERROR: ${Colours.colorReset} Project Name "${Colours.boldText}${input}${Colours.colorReset}" is invalid. It must start with an alphabet, must include only lowercase alphabets, numbers, or underscores, length of string must be [3-8] and must not end with an underscore. \n \n`);
    process.exit(1);
  }
}
export default class CreateProject extends BaseCommand {
  static args = {
    name: Args.string({
      description: "Project name to be created",
      required: true,
    }),
  };
 
  static flags = {
    dryrun: Flags.boolean({
      char: "d",
      description:"Simulates execution of the command, showing what would happen without making any real changes to the system.",
    }),
  };
 
  static description = "Create new magikube project";
  static examples = [
    `<%= config.bin %> <%= command.id %> sample
Creating a new magikube project named 'sample' in the current directory
`,
  ];
 
  async run(): Promise<void> {
    const { args, flags } = await this.parse(CreateProject);
 
    // Check the project name condition
    validateUserInput(args.name);
    AppLogger.configureLogger(args.name);
    AppLogger.info("Logger Started ...");
 
    try {
      let responses: Answers = {
        project_name: args.name,
        project_id: uuidv4(),
        dryrun: flags.dryrun || false,
      };
 
      const promptGenerator = new PromptGenerator();
      const credentialsPrompts = new CredentialsPrompts();
 
      let appRouter;
      for (const prompt of promptGenerator.getCloudProvider()) {
        const resp = await inquirer.prompt(prompt);
        responses = { ...responses, ...resp };
 
        for (const prompt of promptGenerator.getCloudProviderPrompts(resp["cloud_provider"])) {
          const resp = await inquirer.prompt(prompt);
          responses = { ...responses, ...resp };
        }
 
        const prompts = credentialsPrompts.getCredentialsPrompts( resp["cloud_provider"],responses);
 
        if (prompts.length > 0) {
          for (const prompt of prompts) {
            const resp = await inquirer.prompt(prompt);
            responses = { ...responses, ...resp };
          }
          credentialsPrompts.saveCredentials(responses);
        }
 
        for (const prompt of promptGenerator.getVersionControlPrompts(responses["source_code_repository"])) {
          const resp = await inquirer.prompt(prompt);
          responses = { ...responses, ...resp };
        }
 
        for (const prompt of promptGenerator.getEnvironment()) {
          const resp = await inquirer.prompt(prompt);
          responses = { ...responses, ...resp };
 
          for (const prompt of promptGenerator.getLifecycles(resp["environment"])) {
            const resp = await inquirer.prompt(prompt);
            responses = { ...responses, ...resp };
          }
        }
 
        for (const prompt of promptGenerator.getDomainPrompt()) {
          const resp = await inquirer.prompt(prompt);
          responses = { ...responses, ...resp };
        }
 
        const dir = `${process.cwd()}/magikube-templates`;
        const path = process.cwd();
        if (!fs.existsSync(dir)) {
          await executeCommandWithRetry(
            "git clone https://github.com/calfus-open-source/magikube-templates.git",
            { cwd: path },
            1
          );
        }
 
        if (!fs.existsSync(`${process.cwd()}/dist`)) {
          await executeCommandWithRetry("mkdir dist", { cwd: path }, 1);
        }
 
        const copyTemplateResult = executeCommandWithRetry(
          "rsync -av magikube-templates/* dist/ --prune-empty-dirs",
          { cwd: path },
          1
        );
        await executeCommandWithRetry(`rm -rf ${dir}`, { cwd: path }, 1);
 
        AppLogger.debug(`Templates copied | ${copyTemplateResult}`);
      }
 
      // Asking for the frontend and backend prompts
      for (const prompt of promptGenerator.getFrontendApplicationType()) {
        const resp = await inquirer.prompt(prompt);
        responses = { ...responses, ...resp };
      }
      for (const prompt of promptGenerator.getBackendApplicationType()) {
        const resp = await inquirer.prompt(prompt);
        responses = { ...responses, ...resp };
      }
 
    AppLogger.debug(`Creating new magikube project named '${args.name}' in the current directory`)
    SystemConfig.getInstance().mergeConfigs(responses);
 
    // Get the project name from the command line arguments
 
    const projectName = args.name;
    const terraform = await TerraformProject.getProject(this);
    const projectConfig = SystemConfig.getInstance().getConfig();
    console.log(projectConfig,"______projectConfig")
    const aws= projectConfig.aws_profile;
    const path =`${process.cwd()}`
    let command: BaseCommand | undefined;
    const createApp = new CreateApplication(command as BaseCommand, projectConfig)
    const modules = [
      "module.vpc",
      "module.eks",
      "module.acm",
      "module.ecr-repo",
      "module.gitops",
      "module.repository",
      "module.ingress-controller",
      "module.argo",
      "module.environment"
  ];
  const {
    github_access_token: token,
    git_user_name: userName,
    github_owner: orgName,
    source_code_repository: sourceCodeRepo,
    aws_region: region,
    aws_access_key_id: awsAccessKey,
    aws_secret_access_key: awsSecretKey,
    environment: environment,
  } = projectConfig;

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
  const setupGitopsServiceStatus = await createApp.setupGitops( projectConfig);
    if (terraform) {
      await terraform.createProject(projectName, process.cwd());
      if (responses['cloud_provider'] === 'aws') {
        await terraform.AWSProfileActivate(responses['aws_profile']);
      }
      // Delay of 15 seconds to allow the user to review the terraform files
      if (responses['cluster_type'] === 'eks-fargate' || responses['cluster_type'] === 'eks-nodegroup' ) {
        await new Promise(resolve => setTimeout(resolve, 15000));
        await terraform?.runTerraformInit(process.cwd()+"/"+projectName+"/infrastructure", `${responses['environment']}-config.tfvars`);
        for (const module of modules) {
          try {
              AppLogger.info(`Starting Terraform apply for module: ${module}`, true);
              await terraform?.runTerraformApply(process.cwd()+"/"+projectName+"/infrastructure", module, 'terraform.tfvars');        
              AppLogger.debug(`Successfully applied Terraform for module: ${module}`);
          } catch (error) {
              AppLogger.error(`Error applying Terraform for module: ${module}, ${error}`, true);
          }
      }
      }
      if (responses['cluster_type'] === 'k8s') {
 
        const dotmagikube = readProjectConfig(projectName,process.cwd())
        console.log(fs.existsSync(`${process.cwd()}/${projectName}/templates/aws/ansible/environments`),)
        await new Promise(resolve => setTimeout(resolve, 20000));
        await terraform?.runTerraformInit(process.cwd()+"/"+projectName+"/infrastructure", `${responses['environment']}-config.tfvars`);
        await terraform?.runTerraformApply(process.cwd()+"/"+projectName+"/infrastructure");
        try{
          AppLogger.info("AWS export command executing... ",true)
          execSync(`export AWS_PROFILE=${aws} `,
        {
          cwd: `${process.cwd()}/${projectName}/templates/aws/ansible/environments`,
          stdio: 'inherit'
        });
        AppLogger.info("AWS export command  executed.",true)
        }catch(error){
          AppLogger.error("AWS export command  NOT executed",true)
        }
        if (setupGitopsServiceStatus) {
          configObject.appName = `${environment}`;
          configObject.appType = "gitops";
          await ManageRepository.pushCode(configObject);
        }
        await terraform?.runAnsiblePlaybook1(process.cwd()+"/"+projectName);
        await terraform?.runAnsiblePlaybook2(process.cwd()+"/"+projectName);
        await terraform?.runAnsiblePlaybook3(process.cwd()+"/"+projectName);
        await terraform?.runAnsiblePlaybook4(process.cwd()+"/"+projectName);
        terraform?.startSSHProcess();
        const masterIP = await terraform?.getMasterIp(process.cwd()+"/"+projectName+"/infrastructure");
        await terraform?.editKubeConfigFile(process.cwd()+"/"+projectName+"/templates/aws/ansible/config/"+masterIP+"/etc/kubernetes/admin.conf");
        // await terraform?.runTerraform(process.cwd()+"/"+projectName+"/k8s_config", `../${responses['environment']}-config.tfvars`, "module.ingress-controller", '../terraform.tfvars');
        terraform?.stopSSHProcess();
      
 
        const projectConfig = SystemConfig.getInstance().getConfig();
        
        let command: BaseCommand | undefined;
        const createApp = new CreateApplication(
          command as BaseCommand,
          projectConfig
        );
 
        // Running the actual app setups
       
 
        const statusAuthenticationService =
          await createApp.setupAuthenticationService(projectConfig);
        if (statusAuthenticationService) {
          configObject.appName = "auth-service";
          configObject.appType = "auth-service";
          await ManageRepository.pushCode(configObject);
        }
 
        const statusKeycloakService = await createApp.setupKeyCloak(
          projectConfig
        );
        if (statusKeycloakService) {
          configObject.appName = "keycloak";
          configObject.appType = "keycloak-service";
          await ManageRepository.pushCode(configObject);
        }
 
        if (responses["backend_app_type"]) {
          await createApp.handleAppCreation(
            responses["backend_app_type"],
            configObject
          );
        }
 
        if (responses["frontend_app_type"]) {
          await createApp.handleAppCreation(
            responses["frontend_app_type"],
            configObject
          );
        }
        
       
      }
 
      }
      await createApp.MoveFiles(projectName);
 
      const keycloakConfigPath = `${process.cwd()}/${args.name}/keycloak/config.sh`;
      const keycloakurl = `http://${responses.domain}/keycloak`;
      const frontendURL = `http://${responses.domain}`;
      const argocdURL = `http://argocd.${responses.domain}`;
      const isKeycloakUp = await waitForServiceToUP(keycloakurl, "keycloak");
      if (isKeycloakUp && fs.existsSync(keycloakConfigPath)) {
        await executeCommandWithRetry(
          `chmod +x config.sh && /bin/sh ./config.sh`,
          { cwd: `${process.cwd()}/${args.name}/keycloak` },
          1
        );
      } else {
        AppLogger.error(
          "Cannot run the script because Keycloak service is not up or config.sh does not exist."
        );
      }
      const frontendAppType = projectConfig.frontend_app_type;
      const isArgoCDUp = await waitForServiceToUP(argocdURL, "argocd");
      const isFrontendUp = await waitForServiceToUP(frontendURL, frontendAppType);
       if (isKeycloakUp && isArgoCDUp && isFrontendUp) {
       const clickableLink = `\u001b]8;;${frontendURL}\u001b\\\u001b[34;4m${frontendURL}\u001b[0m\u001b]8;;\u001b\\`;
          const username = "magikube_user@example.com";
          const password = "welcome";
          AppLogger.info(
            `Magikube application is up and running at ${clickableLink}`,
            true
          );
         AppLogger.info(
           `Login using\nUsername: ${username}\nPassword: ${password}`,
           true
         );
       } else {
           AppLogger.error(
             "One or more services failed to start. Please check the service.",
             true
           );
       }
      
      process.exit(1);
    } catch (error) {
      AppLogger.error(
        `An error occurred during the setup process: ${error}`,
        true
      );
      process.exit(1);
    }
  }
}
 
 