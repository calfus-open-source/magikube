import { Args, Flags } from "@oclif/core";
import BaseCommand from "../../base.js";
import { Answers } from "inquirer";
import SystemConfig from "../../../config/system.js";
import { AppLogger } from "../../../logger/appLogger.js";
import { handlePrompts } from "../../../core/utils/handlePrompts-utils.js";
import * as fs from "fs";
import path, { join } from "path";
import { Colours } from "../../../prompts/constants.js";
import RestartTerraformProject from "../../../core/restartTerraform-project.js";
import { eksVpcmodules } from "../../../core/constants/constants.js";

function validateUserInput(input: string): void {
  const pattern = /^(?=.{3,8}$)(?!.*_$)[a-z][a-z0-9]*(?:_[a-z0-9]*)?$/;
  if (pattern.test(input)) {
    console.log("Input is valid.");
  } else {
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
      description: "Create a project using the specified template.",
    }),
  };

  static description =
    "Create a project either using a template or as an empty project with .magikube";

  // List of predefined templates
  private predefinedTemplates = ["demoeks", "demonode", "demovpc"];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CustomTemplatesProject);
    console.log(flags.template, "flags.template");
    validateUserInput(args.name);
    const projectFolderPath = path.join(process.cwd(), args.name);
    const projectConfigFile = join(projectFolderPath, ".magikube");

    // Check if the template is present
    if (flags.template) {
      AppLogger.configureLogger();
      AppLogger.info("Logger Started ...");
      const template = flags.template.trim();
      if (this.predefinedTemplates.includes(template)) {
        const responses: Answers = await handlePrompts(args, flags, this.id);
        responses.template = template;
        SystemConfig.getInstance().mergeConfigs(responses);
        const projectConfig = SystemConfig.getInstance().getConfig();
        if (!fs.existsSync(projectFolderPath)) {
          fs.mkdirSync(projectFolderPath, { recursive: true });
          fs.writeFileSync(
            projectConfigFile,
            JSON.stringify(projectConfig, null, 4)
          );
        }
        AppLogger.info(`Creating project with template: ${template}`, true);
        AppLogger.debug(`Creating project '${args.name}' in the path`, true);
        const terraform = await RestartTerraformProject.getProject(
          this,
          args.name
        );
        //const projectPath = path.join(process.cwd(), args.name);
        const infrastructurePath = path.join(
          projectFolderPath,
          "infrastructure"
        );
        console.log(terraform, "<<<<<<terraform");
        if (terraform) {
          await terraform.createProject(args.name, process.cwd());
          if (projectConfig.cloud_provider === "aws") {
            console.log(projectConfig["aws_profile"],"projectConfig[aws_profile]");
            await terraform.AWSProfileActivate(projectConfig["aws_profile"]);
          }
          // await new Promise((resolve) => setTimeout(resolve, 15000));
          console.log("***************")
          console.log(`${projectConfig["environment"]}-config.tfvars`,"________________________");
          
          await terraform?.runTerraformInit(
            process.cwd() + "/" + args.name + "/infrastructure",
            `${projectConfig["environment"]}-config.tfvars`,
            args.name
          );
          console.log("++++++++++++++++++++++++++++++")
          for (const module of eksVpcmodules) {
            await terraform?.runTerraformApply(
              process.cwd() + "/" + args.name + "/infrastructure",
              module,
              "terraform.tfvars"
            );
          }
          console.log("##############")
        }
      } else {
        AppLogger.error(`Template : ${flags.template} is not valid `);
        process.exit(1);
      }
    } else {
      AppLogger.configureLogger(args.name);
      AppLogger.info("Logger Started ...");
      const responses: Answers = await handlePrompts(args, flags, this.id);
      AppLogger.info("Creating an empty project...", true);
      SystemConfig.getInstance().mergeConfigs(responses);
      const projectConfig = SystemConfig.getInstance().getConfig();
      AppLogger.debug(`Creating project '${args.name}' in the path`, true);
      if (!fs.existsSync(projectFolderPath)) {
        fs.mkdirSync(projectFolderPath, { recursive: true });
        fs.writeFileSync(
          projectConfigFile,
          JSON.stringify(projectConfig, null, 4)
        );
      }
    }

    process.exit(0);
  }
}
