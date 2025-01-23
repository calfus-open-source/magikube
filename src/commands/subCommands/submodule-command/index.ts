import { Args } from "@oclif/core";
import BaseCommand from "../../base.js";
import { Answers } from "inquirer";
import SystemConfig from "../../../config/system.js";
import { AppLogger } from "../../../logger/appLogger.js";
import {
  initializeStatusFile,
  readStatusFile,
} from "../../../core/utils/statusUpdater-utils.js";
import { services, modules } from "../../../core/constants/constants.js";
import path from "path";
import fs from "fs";
import SubModuleTemplateProject from "../../../core/submoduleTerraform.js";
import { Colours } from "../../../prompts/constants.js";
import { cloneAndCopyTemplates } from "../../../core/utils/copyTemplates-utils.js";
import { handlePrompts } from "../../../core/utils/handlePrompts-utils.js";
import { executeCommandWithRetry } from "../../../core/common-functions/execCommands.js";
import { updateMagikubeArrayProperty } from "../../../core/utils/updateDotMagikube-utils.js";

// Helper function to validate module input
function validateModuleInput(input: string): void {
  const pattern = /^[a-zA-Z0-9_-]+$/;
  if (!pattern.test(input)) {
    console.error(
      `\n \n  ${Colours.boldText}${Colours.redColor} ERROR: ${Colours.colorReset} Module Name "${Colours.boldText}${input}${Colours.colorReset}" is invalid. It must contain only alphanumeric characters, dashes (-), or underscores (_).\n \n`
    );
    process.exit(1);
  }
}

export default class NewModule extends BaseCommand {
  static args = {
    moduleType: Args.string({
      description: "Type of module (e.g., eks-fargate, k8s)",
      required: true,
    }),
    moduleName: Args.string({
      description: "Name of the module to be created",
      required: true,
    }),
  };

  static description = "Create a new module in the current Magikube project";
  static examples = [
    `<%= config.bin %> <%= command.id %> eks-fargate myNewModule
    Creates a new module named 'myNewModule' of type 'eks-fargate' in the current project`,
  ];

  async run(): Promise<void> {
    const { args } = await this.parse(NewModule);

    // Validate module name
    if (args.moduleName) {
      validateModuleInput(args.moduleName);
    }
    const { moduleName } = args;
    let { moduleType } = args;

    // Check for .magikube file in the current directory
    const currentDir = process.cwd();
    const dotmagikubeFilePath = path.join(currentDir, ".magikube");
    if (!fs.existsSync(dotmagikubeFilePath)) {
      AppLogger.error(
        `The .magikube file is missing in the current directory: ${currentDir}`,
        true
      );
      process.exit(1);
    }

    // Read the .magikube file
    const dotMagikubeContent = JSON.parse(fs.readFileSync(dotmagikubeFilePath, "utf-8"));
    AppLogger.configureLogger(dotMagikubeContent.project_name);
    AppLogger.info(`Starting new module setup: ${moduleName} of type ${moduleType} in the current project`,true);

    try {
      const template = "";
      let responses: Answers = await handlePrompts("", this.id, template, moduleType);
      await cloneAndCopyTemplates(this.id);
      updateMagikubeArrayProperty(dotMagikubeContent, "moduleType", moduleType);
      updateMagikubeArrayProperty(dotMagikubeContent, "moduleName", moduleName);
      // Handle CIDR block and domain responses if provided
      if (responses?.cidrBlock) {
        updateMagikubeArrayProperty(dotMagikubeContent, "cidr_blocks", responses.cidrBlock);
      }

      if (responses?.domain) {
        updateMagikubeArrayProperty(dotMagikubeContent, "domains", responses.domain);
      }
      
      dotMagikubeContent.command = this.id;

      // Write the updated content back to .magikube file
      fs.writeFileSync(
        dotmagikubeFilePath,
        JSON.stringify(dotMagikubeContent, null, 2),
        "utf-8"
      );

      // Merge configurations and initialize project
      SystemConfig.getInstance().mergeConfigs(dotMagikubeContent);
      const terraform = await SubModuleTemplateProject.getProject(this, "");

      initializeStatusFile("", modules, services);
      const projectConfig = SystemConfig.getInstance().getConfig();
      await readStatusFile(projectConfig);
      
      if (terraform) {
        // Run Terraform initialization and apply
        await terraform.createProject("", process.cwd());
        if (projectConfig["cloud_provider"] === "aws") {
          await terraform.AWSProfileActivate(projectConfig["aws_profile"]);
        }
        await new Promise((resolve) => setTimeout(resolve, 15000));
        await terraform?.runTerraformInit(
          `${currentDir}/infrastructure`,
          `${projectConfig["environment"]}-config.tfvars`,
          ""
        );

        try {
          // Handle module-specific Terraform apply
          if (moduleType === "eks-nodegroup" || moduleType === "eks-fargate") {
            moduleType = "eks";
          }
          AppLogger.info(
            `Starting Terraform apply for module: ${moduleType}`,
            true
          );
          await terraform?.runTerraformApply(
            `${currentDir}/infrastructure`,
            moduleType,
            moduleName,
            "terraform.tfvars"
          );
          AppLogger.debug(
            `Successfully applied Terraform for module: ${moduleType}`,
            true
          );
        } catch (error) {
          AppLogger.error(
            `Error applying Terraform for module: ${moduleName}, ${error}`,
            true
          );
        }
      }

      process.exit(0);
    } catch (error) {
      AppLogger.error(
        `An error occurred during the module creation process: ${error}`,
        true
      );
      process.exit(1);
    }
  }
}
