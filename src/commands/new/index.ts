import { Args, Flags } from "@oclif/core";
import BaseCommand from "../base.js";
import { Answers } from "inquirer";
import fs from "fs";
import TerraformProject from "../../core/terraform-project.js";
import SystemConfig from "../../config/system.js";
import { AppLogger } from "../../logger/appLogger.js";
import CreateApplication from "../../core/setup-application.js";
import { Colours } from "../../prompts/constants.js";
import { initializeStatusFile } from "../../core/utils/statusUpdater-utils.js";
import AWSAccount from "../../core/aws/aws-account.js";
import { serviceHealthCheck } from "../../core/utils/healthCheck-utils.js";
import { handlePrompts } from "../../core/utils/handlePrompts-utils.js";
import { cloneAndCopyTemplates } from "../../core/utils/copyTemplates-utils.js";
import {
  services,
  aws_modules,
  InvalidProjectNames,
  supportedTemplates,
  azure_modules,
} from "../../core/constants/constants.js";
import {
  handleEKSandAKS,
  handleK8s,
} from "../../core/utils/terraformHandlers-utils.js";
import { setupAndPushServices } from "../../core/utils/setupAndPushService-utils.js";
import { createBlankMagikubeProject } from "../../core/utils/createEmptyProject-utils.js";
import { handleTemplateFlag } from "../../core/utils/groupingTemplateProject-utils.js";
import {
  BASTION_SYSTEM_CONFIG,
  MASTER_SYSTEM_CONFIG,
  WORKER_SYSTEM_CONFIG,
  KUBERNETES_SYSTEM_CONFIG,
  EKSNODEGROUP_SYSTEM_CONFIG,
  NEXT_APP_CONFIG,
  REACT_APP_CONFIG,
  GEN_AI_CONFIG,
  NODE_APP_CONFIG,
  AWS_SPECIFIC_CONFIG,
  AZURE_SPECIFIC_CONFIG,
} from "../../core/constants/systemDefaults.js";
import { FullConfigObject } from "../../core/interface.js";
import AzurePolicies from "../../core/azure/azure-iam.js";

// Validates the project name input using regex rules
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

// Prevents usage of restricted or reserved project names
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

// Main class for creating a new project using Magikube CLI
export default class CreateProject extends BaseCommand {
  static description =
    "Create new Magikube project with a specific template or as an empty project.";

  static examples = [
    `<%= config.bin %> <%= command.id %> sample -t empty`,
    `<%= config.bin %> <%= command.id %> sample -t eks-fargate-vpc`,
  ];

  // Accepts a required project name as argument
  static args = {
    name: Args.string({
      description: "Project name to be created",
      required: true,
    }),
  };

  // Accepts an optional template flag for project creation
  static flags = {
    template: Flags.string({
      char: "t",
      description: "Template name for the project",
      required: false,
    }),
  };

  // List of predefined templates supported by Magikube
  private predefinedTemplates = [...supportedTemplates];

  // Main execution logic for the command
  async run(): Promise<void> {
    const { args, flags } = await this.parse(CreateProject);
    const projectName = args.name;

    // Validate project name format and ensure it’s not restricted
    validateUserInput(args.name);
    validateRestrictedInputs(args.name);

    // Initialize logging for the CLI command
    AppLogger.configureLogger(args.name, this.id);
    AppLogger.info("Logger Started ...");

    try {
      // If template is 'empty', generate a skeleton project with config only
      if (flags.template === "empty") {
        const responses: Answers = await handlePrompts(
          args,
          this.id,
          flags.template
        );
        SystemConfig.getInstance().mergeConfigs(responses);
        await createBlankMagikubeProject(args.name, responses);
        AppLogger.info(
          `Created an empty project named '${args.name}' with .magikube folder populated with configurations.`,
          true
        );
        process.exit(0);
      }

      // Handle other predefined template-based project generation
      if (
        flags.template &&
        this.predefinedTemplates.includes(flags.template.trim())
      ) {
        await handleTemplateFlag(args, this.id, flags.template);
        process.exit(0);
      }

      // Default flow (no template): Prompt for user inputs interactively
      let responses: Answers = await handlePrompts(args, this.id);

      // Special handling for Azure login if selected as provider
      if (responses["cloud_provider"] === "azure") {
        AppLogger.info("Attempting Azure login...", true);
        try {
          const loginResp = await AzurePolicies.getAzureLogin();
          if (loginResp === false) {
            AppLogger.error("Azure login failed!");
          } else {
            AppLogger.info("Azure login successful!", true);
            responses = { ...responses, ...loginResp };
          }
        } catch (error) {
          AppLogger.error(`Azure login error: ${error}`, true);
        }
      }

      // Inject CLI command ID into responses
      responses.command = this.id;

      // Merge system-level configuration with user responses
      const systemConfig = {
        ...(responses.cloud_provider === "aws" ? AWS_SPECIFIC_CONFIG : {}),
        ...(responses.cloud_provider === "azure" ? AZURE_SPECIFIC_CONFIG : {}),
        ...BASTION_SYSTEM_CONFIG,
        ...MASTER_SYSTEM_CONFIG,
        ...WORKER_SYSTEM_CONFIG,
        ...KUBERNETES_SYSTEM_CONFIG,
        ...EKSNODEGROUP_SYSTEM_CONFIG,
        ...NEXT_APP_CONFIG,
        ...REACT_APP_CONFIG,
        ...NODE_APP_CONFIG,
        ...GEN_AI_CONFIG,
      };

      // Clone base templates locally for customization
      await cloneAndCopyTemplates(this.id, responses.cloud_provider);

      AppLogger.info(
        `Creating new Magikube project named '${args.name}' in the current directory`,
        true
      );

      // Combine user input and default configurations
      const combinedConfig = { ...systemConfig, ...responses };
      SystemConfig.getInstance().mergeConfigs(combinedConfig);

      // Terraform and application setup logic
      const terraform = await TerraformProject.getProject(this);
      const projectConfig = SystemConfig.getInstance().getConfig();
      const createApp = new CreateApplication(this, projectConfig);

      // Choose modules based on cloud provider
      const modules =
        projectConfig.cloud_provider === "aws" ? aws_modules : azure_modules;

      // Initialize a status file to track provisioning progress
      initializeStatusFile(projectName, modules, services);

      // Extracting required config values
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

      // Building a structured config object
      const configObject: FullConfigObject = {
        common: {
          token,
          userName,
          orgName,
          sourceCodeRepo,
          projectName: args.name,
          environment,
        },
      };

      // Populate cloud-specific configuration
      if (projectConfig.cloud_provider === "aws") {
        configObject.aws = {
          region,
          awsAccessKey,
          awsSecretKey,
        };

        // Fetch AWS account ID and store in config
        const accountId = await AWSAccount.getAccountId(
          awsAccessKey,
          awsSecretKey,
          region
        );

        configObject.aws.accountId = accountId;
        SystemConfig.getInstance().mergeConfigs({ accountId });
      } else if (projectConfig.cloud_provider === "azure") {
        configObject.azure = {
          location: azureLocation,
          clientId: azureClientId,
          clientSecret: azureClientSecret,
          tenantId: azureTenantId,
          subscriptionId: azureSubscriptionId,
        };

        const resource_group_name = `${projectName}-rg`;
        SystemConfig.getInstance().mergeConfigs({ resource_group_name });
      }

      // Setup GitOps repository/service
      const setupGitopsServiceStatus = await createApp.setupGitops(
        projectConfig
      );

      if (terraform) {
        // Run Terraform project generation
        await terraform.createProject(projectName, process.cwd());

        // Activate AWS profile if applicable
        if (responses.cloud_provider === "aws") {
          await (terraform as any).AWSProfileActivate(responses.aws_profile);
        }

        // Conditional handling for Kubernetes cluster setup
        if (
          responses.cluster_type === "eks-fargate" ||
          responses.cluster_type === "eks-nodegroup" ||
          responses.cluster_type === "aks"
        ) {
          await handleEKSandAKS(
            projectName,
            responses,
            terraform,
            setupGitopsServiceStatus,
            configObject
          );
        }

        // Conditional setup for generic Kubernetes clusters
        if (responses.cluster_type === "k8s") {
          await handleK8s(
            projectName,
            responses,
            terraform,
            setupGitopsServiceStatus,
            configObject
          );
        }

        // Final step to setup and push application services (frontend/backend/auth etc.)
        await setupAndPushServices(projectConfig, configObject);
      }

      // Perform health check to ensure services are live
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
