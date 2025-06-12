import { Args, Flags } from "@oclif/core";
import BaseCommand from "../base.js";
import { Answers } from "inquirer";
import fs from "fs";
import TerraformProject from "../../core/terraform-project.js";
import SystemConfig from "../../config/system.js";
import { AppLogger } from "../../logger/appLogger.js";
import CreateApplication from "../../core/setup-application.js";
import { ConfigObject } from "../../core/interface.js";
import { Colours } from "../../prompts/constants.js";
import {initializeStatusFile,} from "../../core/utils/statusUpdater-utils.js";
import AWSAccount from "../../core/aws/aws-account.js";
import { serviceHealthCheck } from "../../core/utils/healthCheck-utils.js";
import { handlePrompts } from "../../core/utils/handlePrompts-utils.js";
import { cloneAndCopyTemplates } from "../../core/utils/copyTemplates-utils.js";
import { services, modules, InvalidProjectNames, supportedTemplates } from "../../core/constants/constants.js";
import { handleEKS, handleK8s } from "../../core/utils/terraformHandlers-utils.js";
import { setupAndPushServices } from "../../core/utils/setupAndPushService-utils.js";
import { createEmptyMagikubeProject } from "../../core/utils/createEmptyProject-utils.js";
import { handleTemplateFlag } from "../../core/utils/groupingTemplateProject-utils.js";
import { BASTION_SYSTEM_CONFIG,MASTER_SYSTEM_CONFIG, WORKER_SYSTEM_CONFIG, KUBERNETES_SYSTEM_CONFIG, EKSNODEGROUP_SYSTEM_CONFIG, NEXT_APP_CONFIG, REACT_APP_CONFIG, GEN_AI_CONFIG, NODE_APP_CONFIG, } from "../../core/constants/systemDefaults.js";

function validateUserInput(input: string): void {
  const pattern = /^(?=.{3,8}$)(?!.*_$)[a-z][a-z0-9]*(?:_[a-z0-9]*)?$/;
  if (!pattern.test(input)) {
    console.error(
      `\n\n  ${Colours.boldText}${Colours.redColor} ERROR: ${Colours.colorReset} ` +
        `Project Name "${Colours.boldText}${input}${Colours.colorReset}" is invalid. ` +
        `It must start with an alphabet, include only lowercase alphabets, numbers, or underscores, ` +
        `be 3-8 characters long, and must not end with an underscore. \n\n`
    );
    process.exit(1);
  }
}

function validateRestrictedInputs(input: string): void {
  const restrictedCommands = [...InvalidProjectNames];
  if (restrictedCommands.includes(input)) {
    console.error(
      `\n\n  ${Colours.boldText}${Colours.redColor} ERROR: ${Colours.colorReset} ` +
        `Command "${Colours.boldText}${input}${Colours.colorReset}" is restricted ` +
        `and cannot be executed using "magikube new". \n\n`
    );
    process.exit(1);
  }
}

export default class CreateProject extends BaseCommand {
  static description =
    "Create new Magikube project with a specific template or as an empty project.";

  static examples = [
    `<%= config.bin %> <%= command.id %> sample -t empty`,
    `<%= config.bin %> <%= command.id %> sample -t eks-fargate-vpc`,
  ];

  static args = {
    name: Args.string({
      description: "Project name to be created",
      required: true,
    }),
  };

  static flags = {
    template: Flags.string({
      char: "t",
      description: "Template name for the project",
      required: false,
    }),
  };

  private predefinedTemplates = [...supportedTemplates];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CreateProject);
    const projectName = args.name;
    // validate the project name
    validateUserInput(args.name);
    validateRestrictedInputs(args.name);
    AppLogger.configureLogger(args.name, this.id);
    AppLogger.info("Logger Started ...");

    try {
      // Handle empty project creation
      if (flags.template === "empty") {
        const responses: Answers = await handlePrompts(
          args,
          this.id,
          flags.template
        );
        // merge the response in system config
        SystemConfig.getInstance().mergeConfigs(responses);
        await createEmptyMagikubeProject(args.name, responses);
        AppLogger.info(
          `Created an empty project named '${args.name}' with .magikube folder populated with configurations.`,
          true
        );
        process.exit(0);
      }
      
      //Create project with valid predefined template
      if (
        flags.template &&
        this.predefinedTemplates.includes(flags.template.trim())
      ) {
        await handleTemplateFlag(args, this.id, flags.template);
        process.exit(0);
      }

      // Default project creation process
      
      // default system config values
      const systemConfig = {
        ...BASTION_SYSTEM_CONFIG,
        ...MASTER_SYSTEM_CONFIG,
        ...WORKER_SYSTEM_CONFIG,
        ...KUBERNETES_SYSTEM_CONFIG,
        ...EKSNODEGROUP_SYSTEM_CONFIG,
        ...NEXT_APP_CONFIG,
        ...REACT_APP_CONFIG,
        ...NODE_APP_CONFIG,
        ...GEN_AI_CONFIG
      };

      //taking input from user
      const responses: Answers = await handlePrompts(args, this.id);
      // check if dist folder present
      responses.command = this.id;
      if (!fs.existsSync(`${process.cwd()}/dist`)) {
        await cloneAndCopyTemplates(this.id);
      }
      
      AppLogger.debug( `Creating new Magikube project named '${args.name}' in the current directory`, true);
      const combinedConfig = { ...systemConfig, ...responses };
      SystemConfig.getInstance().mergeConfigs(combinedConfig);
      const terraform = await TerraformProject.getProject(this);
      const projectConfig = SystemConfig.getInstance().getConfig();
      const createApp = new CreateApplication(this, projectConfig);
      initializeStatusFile(projectName, modules, services);

      const {
        github_access_token: token,
        git_user_name: userName,
        github_owner: orgName,
        source_code_repository: sourceCodeRepo,
        aws_region: region,
        aws_access_key_id: awsAccessKey,
        aws_secret_access_key: awsSecretKey,
        azure_location: azureLocation,
        azure_client_id: azureClientId,
        azure_client_secret: azureClientSecret,
        azure_tenant_id: azureTenantId,
        azure_subscription_id: azureSubscriptionId,
        environment,
      } = projectConfig;

      let configObject: ConfigObject;
      let accountId: string | undefined;

      if (projectConfig.cloud_provider === "aws") {
        configObject = {
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
        
        //get Account ID and merge it in systemConfig
        accountId = await AWSAccount.getAccountId(awsAccessKey,awsSecretKey,region);
        SystemConfig.getInstance().mergeConfigs({ accountId });
      } else if (projectConfig.cloud_provider === "azure") {
        configObject = {
          token,
          userName,
          orgName,
          sourceCodeRepo,
          region: azureLocation,
          projectName,
          awsAccessKey: azureClientId, // Using same interface for simplicity
          awsSecretKey: azureClientSecret, // Using same interface for simplicity
          environment,
        };
      } else {
        // Default to AWS for backward compatibility
        configObject = {
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
        
        //get Account ID and merge it in systemConfig
        accountId = await AWSAccount.getAccountId(awsAccessKey,awsSecretKey,region);
        SystemConfig.getInstance().mergeConfigs({ accountId });
      }
      
      //setup Gitops service
      const setupGitopsServiceStatus = await createApp.setupGitops(projectConfig);

      if (terraform) {
        await terraform.createProject(projectName, process.cwd());
        if (responses.cloud_provider === "aws" && 'AWSProfileActivate' in terraform) {
          await (terraform as any).AWSProfileActivate(responses.aws_profile);
        } else if (responses.cloud_provider === "azure" && 'AzureProfileActivate' in terraform) {
          await (terraform as any).AzureProfileActivate(responses.azure_profile);
        }

        // setup infrastructure if cluster type is eks-fargate OR eks-nodegroup
        if (
          responses.cluster_type === "eks-fargate" ||
          responses.cluster_type === "eks-nodegroup"
        ) {
          await handleEKS(
            projectName,
            responses,
            terraform,
            setupGitopsServiceStatus,
            configObject
          );
        }

        // setup infrastructure if cluster type is aks
        if (responses.cluster_type === "aks") {
          // Handle AKS similar to EKS
          await handleEKS(
            projectName,
            responses,
            terraform,
            setupGitopsServiceStatus,
            configObject
          );
        }

        // setup infrastructure if cluster type is K8S
        if (responses.cluster_type === "k8s") {
          await handleK8s(
            projectName,
            responses,
            terraform,
            setupGitopsServiceStatus,
            configObject
          );
        }
        // create microservices
        await setupAndPushServices(projectConfig, configObject);
      }
      
      // check the status of microservice
      await serviceHealthCheck(args, responses, projectConfig);
      process.exit(0);
    } catch (error) {
      AppLogger.error(
        `An error occurred during the setup process: ${error}`,
        true
      );
      process.exit(1);
    }
  }
}
