import { Args, Flags } from "@oclif/core";
import BaseCommand from "../../base.js";
import { Answers } from "inquirer";
import SystemConfig from "../../../config/system.js";
import { AppLogger } from "../../../logger/appLogger.js";
import { Colours } from "../../../prompts/constants.js";
import {
  initializeStatusFile,
  readStatusFile,
} from "../../../core/utils/statusUpdater-utils.js";
import { handlePrompts } from "../../../core/utils/handlePrompts-utils.js";
import { cloneAndCopyTemplates } from "../../../core/utils/copyTemplates-utils.js";
import {
  eksVpcModules,
  getServices,
  modules,
} from "../../../core/constants/constants.js";
import AWSAccount from "../../../core/aws/aws-account.js";
import TemplateTerraformProject from "../../../core/templatesTerraform-projects.js";
import { createEmptyMagikubeProject } from "../../../core/utils/createEmptyProject-utils.js";

function validateUserInput(input: string): void {
  const pattern = /^(?=.{3,8}$)(?!.*_$)[a-z][a-z0-9]*(?:_[a-z0-9]*)?$/;
  if (!pattern.test(input)) {
    console.error(
      `\n \n  ${Colours.boldText}${Colours.redColor} ERROR: ${Colours.colorReset} Project Name "${Colours.boldText}${input}${Colours.colorReset}" is invalid. It must start with an alphabet, must include only lowercase alphabets, numbers, or underscores, length of string must be [3-8] and must not end with an underscore. \n \n`
    );
    process.exit(1);
  }
}
export default class CustomTemplatesProject extends BaseCommand {
  static args = {
    name: Args.string({
      description: "Project name to be created",
      required: true,
    }),
  };

  static flags = {
    template: Flags.string({
      char: "t",
      description: "Template name to use for project creation (optional)",
      required: false,
    }),
  };

  static description = "Create new magikube project with custom templates";

  static examples = [
    `<%= config.bin %> <%= command.id %> sample
    Creating a new magikube project named 'sample' in the current directory`,
    `<%= config.bin %> <%= command.id %> sample -t templateName
    Creating a new magikube project named 'sample' using 'templateName' template in the current directory`,
  ];

  private predefinedTemplates = ["first", "second", "third"];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CustomTemplatesProject);
    validateUserInput(args.name);
    AppLogger.configureLogger(args.name);
    AppLogger.info("Logger Started ...");

    try {
      // Check if template flag is provided but empty
      if (flags.template === undefined) {
        const responses: Answers = await handlePrompts(args, flags, this.id);
        await createEmptyMagikubeProject(args.name, responses);
        AppLogger.info(
          `Created an empty project named '${args.name}' with .magikube folder populated with configurations.`
        );
        process.exit(0);
      }
      if (
        flags.template &&
        !this.predefinedTemplates.includes(flags.template.trim())
      ) {
        console.error(
          `\n \n  ${Colours.boldText}${Colours.redColor} ERROR: ${
            Colours.colorReset
          } Template "${
            flags.template
          }" is not available. Please select from: ${this.predefinedTemplates.join(
            ", "
          )}.\n \n`
        );
        process.exit(1);
      }

      let responses: Answers = await handlePrompts(args, flags, this.id);
      await cloneAndCopyTemplates();
      AppLogger.debug(
        `Creating new magikube project named '${args.name}' in the current directory`,
        true
      );
      const projectName = args.name;

      // if a valid predefined template is specified
      if (flags.template) {
        const templates: any = [];
        const template = flags.template.trim();
        responses.template = template;
        SystemConfig.getInstance().mergeConfigs(responses);
        const projectConfig = SystemConfig.getInstance().getConfig();
        const terraform = await TemplateTerraformProject.getProject(this);
        AppLogger.info(`Using template '${template}' for project setup.`, true);
        const services = getServices(responses["frontend_app_type"]);
        initializeStatusFile(projectName, modules, services);
        const {
          aws_region: region,
          aws_access_key_id: awsAccessKey,
          aws_secret_access_key: awsSecretKey,
          environment: environment,
        } = projectConfig;
        const accountId = await AWSAccount.getAccountId(
          awsAccessKey,
          awsSecretKey,
          region
        );
        SystemConfig.getInstance().mergeConfigs({ accountId: accountId });

        if (terraform) {
          await terraform.createProject(projectName, process.cwd());
          if (responses["cloud_provider"] === "aws") {
            await terraform.AWSProfileActivate(responses["aws_profile"]);
          }
          await new Promise((resolve) => setTimeout(resolve, 15000));
          await terraform?.runTerraformInit(
            process.cwd() + "/" + projectName + "/infrastructure",
            `${responses["environment"]}-config.tfvars`,
            projectName
          );
          for (const module of eksVpcModules) {
            try {
              AppLogger.info(
                `Starting Terraform apply for module: ${module}`,
                true
              );
              await terraform?.runTerraformApply(
                process.cwd() + "/" + projectName + "/infrastructure",
                module,
                "terraform.tfvars"
              );
              AppLogger.debug(
                `Successfully applied Terraform for module: ${module}`,
                true
              );
            } catch (error) {
              AppLogger.error(
                `Error applying Terraform for module: ${module}, ${error}`,
                true
              );
            }
          }
        }
      }
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
