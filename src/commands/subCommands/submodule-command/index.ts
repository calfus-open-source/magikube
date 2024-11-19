
import * as fs from "fs";
import * as path from "path";
import { AppLogger } from "../../../logger/appLogger.js";
import { Colours } from "../../../prompts/constants.js";
import BaseCommand from "../../base.js";
import { Args,Flags } from "@oclif/core";
import SubModuleTemplate from "../../../core/submoduleTerraform.js";


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

  export default class SingleModuleTemplatesProject extends BaseCommand{
    static args = {
        moduleType: Args.string({
            description:"Module to be created",
            required:true
        }),
        moduleName: Args.string({
            description:"Module name to be created",
            required:true
        }),
    };

    // static flags:{
    //     template: Flags.string({
    //         char:"p"
    //     }),
    // };

    static description = "Create an individual module";

    static examples = [
        `<%= config.bin %> <%= command.id %> sample
        Creating a new module in the project of the current directory`,
        `<%= config.bin %> <%= command.id %> sample -p templateName
        Creating a new module named 'sample' using 'templateName' template in the current directory`,
    ];

    async run(): Promise<void>{
        const { args, flags } = await this.parse(SingleModuleTemplatesProject);
        validateUserInput(args.moduleName);
        const moduleType = args.moduleType;
        const moduleName = args.moduleName || ''; // Default to an empty string if not provided
        AppLogger.configureLogger(args.moduleName);
        AppLogger.info("Logger Started ...");

        const currentWorkingDirectory = process.cwd();
        const magikubeFilePath = path.join(currentWorkingDirectory, ".magikube");

        if (!fs.existsSync(magikubeFilePath)) {
            console.error(
              `\n \n  ${Colours.boldText}${Colours.redColor} ERROR: ${Colours.colorReset} The .magikube file is missing in the current directory (${currentWorkingDirectory}). Please ensure the file exists before proceeding. \n \n`
            );
            process.exit(1);
          }
      
          // Continue execution if the file exists
          AppLogger.info(`The .magikube file exists in the directory: ${currentWorkingDirectory}. Proceeding...`);
          
          const commandId = this.id || "unknown_command";
          console.log(commandId,"<<<<<<<<commandId")
          const terraform = await SubModuleTemplate.getProject(this,moduleType, commandId);

        }

    }