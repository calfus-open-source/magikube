import { Args, Flags } from "@oclif/core";
import BaseCommand from "../../base.js";
import { Answers } from "inquirer";
import SystemConfig from "../../../config/system.js";
import { AppLogger } from "../../../logger/appLogger.js";
import { handlePrompts } from "../../../core/utils/handlePrompts-utils.js";
import * as fs from "fs";
import path, { join } from "path";
import { Colours } from "../../../prompts/constants.js";

function validateUserInput(input: string): void {
  const pattern = /^(?=.{3,8}$)(?!.*_$)[a-z][a-z0-9]*(?:_[a-z0-9]*)?$/;
  if (pattern.test(input)) {
    console.log("Input is valid.");
  } else {
    console.error(`\n \n  ${Colours.boldText}${Colours.redColor} ERROR: ${Colours.colorReset} Project Name "${Colours.boldText}${input}${Colours.colorReset}" is invalid. It must start with an alphabet, must include only lowercase alphabets, numbers, or underscores, length of string must be [3-8] and must not end with an underscore. \n \n`);
    process.exit(1);
  }
}

export default class CreateEmptyProject extends BaseCommand {
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

  static description = "Create a project either using a template or as an empty project with .magikube";

  // List of predefined templates
  private predefinedTemplates = ["template1", "template2", "template3", "template4", "template5", "template6"];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CreateEmptyProject);
    validateUserInput(args.name);
    AppLogger.configureLogger(args.name);
    AppLogger.info("Logger Started ...");

    const projectFolderPath = path.join(process.cwd(), args.name);
    const projectConfigFile = join(projectFolderPath, '.magikube');

    // Check if the template flag is provided and not empty
    if (flags.template) {
      const template = flags.template.trim();
       console.log(template,"<<<<<<template")
      if (this.predefinedTemplates.includes(template)) {
        // Create the project folder and the .magikube file after handling template logic
        AppLogger.info(`Creating project with template: ${template}`, true);

        const responses: Answers = await handlePrompts(args, flags);
        SystemConfig.getInstance().mergeConfigs(responses);
        const projectConfig = SystemConfig.getInstance().getConfig();

        AppLogger.debug(`Creating project '${args.name}' in the path`, true);
        if (!fs.existsSync(projectFolderPath)) {
          fs.mkdirSync(projectFolderPath, { recursive: true });
          fs.writeFileSync(projectConfigFile, JSON.stringify(projectConfig, null, 4));
        }
      } else {
        AppLogger.error(`Template : ${flags.template} is not valid `);
        process.exit(1);
      }
    } 
    else {
      // If no template is provided, create an empty project
      AppLogger.info("Creating an empty project...", true);

      const responses: Answers = await handlePrompts(args, flags);
      SystemConfig.getInstance().mergeConfigs(responses);
      const projectConfig = SystemConfig.getInstance().getConfig();

      AppLogger.debug(`Creating project '${args.name}' in the path`, true);
      if (!fs.existsSync(projectFolderPath)) {
        fs.mkdirSync(projectFolderPath, { recursive: true });
        fs.writeFileSync(projectConfigFile, JSON.stringify(projectConfig, null, 4));
      }
    }

    process.exit(0);
  }
}
