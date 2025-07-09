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
  handleEKS,
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

    validateUserInput(args.name);
    validateRestrictedInputs(args.name);
    AppLogger.configureLogger(args.name, this.id);
    AppLogger.info("Logger Started ...");

    try {
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

      if (
        flags.template &&
        this.predefinedTemplates.includes(flags.template.trim())
      ) {
        await handleTemplateFlag(args, this.id, flags.template);
        process.exit(0);
      }

      // default project creation
      let responses: Answers = await handlePrompts(args, this.id);

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

      responses.command = this.id;

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

      if (!fs.existsSync(`${process.cwd()}/dist`)) {
        await cloneAndCopyTemplates(this.id, responses.cloud_provider);
      }

      AppLogger.info(
        `Creating new Magikube project named '${args.name}' in the current directory`,
        true
      );

      const combinedConfig = { ...systemConfig, ...responses };
      SystemConfig.getInstance().mergeConfigs(combinedConfig);

      const terraform = await TerraformProject.getProject(this);
      const projectConfig = SystemConfig.getInstance().getConfig();
      const createApp = new CreateApplication(this, projectConfig);

      const modules = projectConfig.cloud_provider === "aws" ? aws_modules : azure_modules;

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

      if (projectConfig.cloud_provider === "aws") {
        configObject.aws = {
          region,
          awsAccessKey,
          awsSecretKey,
        };

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

      const setupGitopsServiceStatus = await createApp.setupGitops(
        projectConfig
      );

      if (terraform) {
        await terraform.createProject(projectName, process.cwd());

        if (responses.cloud_provider === "aws") {
          await (terraform as any).AWSProfileActivate(responses.aws_profile);
        }

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

        if (responses.cluster_type === "aks") {
          await handleEKS(
            projectName,
            responses,
            terraform,
            setupGitopsServiceStatus,
            configObject
          );
        }

        if (responses.cluster_type === "k8s") {
          await handleK8s(
            projectName,
            responses,
            terraform,
            setupGitopsServiceStatus,
            configObject
          );
        }

        await setupAndPushServices(projectConfig, configObject);
      }

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
