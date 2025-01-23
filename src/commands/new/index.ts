import { Args, Flags } from "@oclif/core";
import BaseCommand from "../base.js";
import { Answers } from "inquirer";
import TerraformProject from "../../core/terraform-project.js";
import SystemConfig from "../../config/system.js";
import { AppLogger } from "../../logger/appLogger.js";
import CreateApplication from "../../core/setup-application.js";
import { ConfigObject } from "../../core/interface.js";
import { Colours } from "../../prompts/constants.js";
import { initializeStatusFile, readStatusFile } from "../../core/utils/statusUpdater-utils.js";
import AWSAccount from "../../core/aws/aws-account.js";
import { serviceHealthCheck } from "../../core/utils/healthCheck-utils.js";
import { handlePrompts } from "../../core/utils/handlePrompts-utils.js";
import { cloneAndCopyTemplates } from "../../core/utils/copyTemplates-utils.js";
import { services, modules, RestrictedCommands } from "../../core/constants/constants.js";
import { handleEKS, handleK8s} from "../../core/utils/terraformHandlers-utils.js";
import { setupAndPushServices } from "../../core/utils/setupAndPushService-utils.js";
import { createEmptyMagikubeProject } from "../../core/utils/createEmptyProject-utils.js";
import { handleTemplateFlag } from "../../core/utils/handleTemplateProject-utils.js";

function validateUserInput(input: string): void {
  const pattern = /^(?=.{3,8}$)(?!.*_$)[a-z][a-z0-9]*(?:_[a-z0-9]*)?$/;
  if (!pattern.test(input)) {
    console.error(`\n \n  ${Colours.boldText}${Colours.redColor} ERROR: ${Colours.colorReset} Project Name "${Colours.boldText}${input}${Colours.colorReset}" is invalid. It must start with an alphabet, must include only lowercase alphabets, numbers, or underscores, length of string must be [3-8] and must not end with an underscore. \n \n`);
    process.exit(1);
  } 
}

function validateRestrictedInputs(input: string): void {
  const restrictedCommands = [...RestrictedCommands];
  if (restrictedCommands.includes(input)) {
    console.error(
      `\n \n  ${Colours.boldText}${Colours.redColor} ERROR: ${Colours.colorReset} Command "${Colours.boldText}${input}${Colours.colorReset}" is restricted and cannot be executed using "magikube new". \n \n`
    );
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
      template: Flags.string({
        char: "t",
        description: "Template name for the project",
        required: false,
      }),
    };

    private predefinedTemplates = [
      "eks-fargate-vpc",
      "eks-nodegroup-vpc",
      "rds-vpc",
      "ec2-vpc",
      "vpc-rds-nodegroup-acm-ingress",
    ];

    static description =
      "Create new magikube project with a specific template or as an empty project.";
    static examples = [
      `<%= config.bin %> <%= command.id %> sample -t empty`,
      `<%= config.bin %> <%= command.id %> sample -t eks-fargate-vpc`,
    ];

    async run(): Promise<void> {
      const { args, flags } = await this.parse(CreateProject);
      validateUserInput(args.name);
      AppLogger.configureLogger(args.name);
      AppLogger.info("Logger Started ...");

      // Check if flag is provided but empty
      if (flags.template === "empty") {
        const responses: Answers = await handlePrompts(args,this.id,flags.template);
        SystemConfig.getInstance().mergeConfigs(responses);
        await createEmptyMagikubeProject(args.name, responses);
        AppLogger.info( `Created an empty project named '${args.name}' with .magikube folder populated with configurations.`);
        process.exit(0);
      }

      // Check if -t flag is provided with valid template
      if (
        flags.template &&
        this.predefinedTemplates.includes(flags.template.trim())
      ) {
        await handleTemplateFlag(args, this.id, flags.template);
        process.exit(0)
      }
      
      try {
        let responses: Answers = await handlePrompts(args, this.id);
        responses.command = this.id;
        await cloneAndCopyTemplates();
        AppLogger.debug(
          `Creating new magikube project named '${args.name}' in the current directory`
        );
        SystemConfig.getInstance().mergeConfigs(responses);

        // Get the project name from the command line arguments
        const projectName = args.name;
        const terraform = await TerraformProject.getProject(this);
        const projectConfig = SystemConfig.getInstance().getConfig();
        let command: BaseCommand | undefined;
        const createApp = new CreateApplication(
          command as BaseCommand,
          projectConfig
        );

        // const services = getServices(responses["frontend_app_type"]);
        initializeStatusFile(projectName, modules, services);
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
        const accountId = await AWSAccount.getAccountId(
          awsAccessKey,
          awsSecretKey,
          region
        );
        SystemConfig.getInstance().mergeConfigs({ accountId: accountId });
        const setupGitopsServiceStatus = await createApp.setupGitops(
          projectConfig
        );

        if (terraform) {
          await terraform.createProject(projectName, process.cwd());
          if (responses["cloud_provider"] === "aws") {
            await terraform.AWSProfileActivate(responses["aws_profile"]);
          }
          if (
            responses["cluster_type"] === "eks-fargate" ||
            responses["cluster_type"] === "eks-nodegroup"
          ) {
            await handleEKS(
              projectName,
              responses,
              terraform,
              setupGitopsServiceStatus,
              configObject
            );
          }
          if (responses["cluster_type"] === "k8s") {
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