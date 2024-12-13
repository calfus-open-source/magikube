import { Args } from "@oclif/core";
import BaseCommand from "../../base.js";
import { Answers } from "inquirer";
import SystemConfig from "../../../config/system.js";
import { AppLogger } from "../../../logger/appLogger.js";
import { initializeStatusFile, readStatusFile } from "../../../core/utils/statusUpdater-utils.js";
import {getServices,modules,} from "../../../core/constants/constants.js";
import path from "path";
import fs from "fs"
import SubModuleTemplateProject from "../../../core/submoduleTerraform.js";
import { Colours } from "../../../prompts/constants.js";
import { cloneAndCopyTemplates } from "../../../core/utils/copyTemplates-utils.js";
import { handlePrompts } from "../../../core/utils/handlePrompts-utils.js";
import { executeCommandWithRetry } from "../../../core/common-functions/execCommands.js";

function validateModuleInput(input: string): void {
  const pattern = /^[a-zA-Z0-9_-]+$/;
  if (pattern.test(input)) {
    console.log("Module name is valid.");
  } else {
    console.error(
      `\n \n  ${Colours.boldText}${Colours.redColor} ERROR: ${Colours.colorReset} Module Name "${Colours.boldText}${input}${Colours.colorReset}" is invalid. It must contain only alphanumeric characters, dashes (-), or underscores (_).\n \n`
    );
    process.exit(1);
  }
}

export default class NewModule extends BaseCommand {
  static args = {
    projectName: Args.string({
      description: "Base project name",
      required: true,
    }),
    moduleType: Args.string({
      description: "Type of module (e.g., eks-fargate, k8s)",
      required: true,
    }),
    moduleName: Args.string({
      description: "Name of the module to be created",
      required: true,
    }),
  };

  static description = "Create a new module in an existing Magikube project";
  static examples = [
    `<%= config.bin %> <%= command.id %> myProject eks-fargate myNewModule
    Creates a new module named 'myNewModule' of type 'eks-fargate' in the project 'myProject'`,
  ];

 async run(): Promise<void> {
  const { args,flags } = await this.parse(NewModule);

  // Validate module name
  if(args.moduleName){
  validateModuleInput(args.moduleName);
  }
  const { projectName, moduleType, moduleName } = args;
  AppLogger.configureLogger();
  AppLogger.info(`Starting new module setup: ${moduleName} of type ${moduleType} in project ${projectName}`, true);

  try {
    const template = "";
    let responses: Answers = await handlePrompts(projectName, this.id,template, moduleType);
    // Check for .magikube file
    const projectDir = path.resolve(projectName);
    const dotmagikubeFilePath = path.join(projectDir, ".magikube");
    if (!fs.existsSync(dotmagikubeFilePath)) {
       throw new Error(`The .magikube file is missing in the project: ${projectName}`);
    }
   
    await cloneAndCopyTemplates();
    const magikubeContent = JSON.parse(fs.readFileSync(dotmagikubeFilePath, "utf-8"));
    if (!Array.isArray(magikubeContent.moduleType)) {
      magikubeContent.moduleType = magikubeContent.moduleType ? [magikubeContent.moduleType] : [];
    }
    if (!magikubeContent.moduleType.includes(moduleType)) {
      magikubeContent.moduleType.push(moduleType);
    }
    if (!Array.isArray(magikubeContent.moduleName)) {
      magikubeContent.moduleName = magikubeContent.moduleName ? [magikubeContent.moduleName] : [];
    }
    if (!magikubeContent.moduleName.includes(moduleName)) {
      magikubeContent.moduleName.push(moduleName);
    }
    const cidrBlock = responses.cidrBlock;
    if (cidrBlock) {
      if (!Array.isArray(magikubeContent.cidr_blocks)) {
        magikubeContent.cidr_blocks = magikubeContent.cidr_blocks
          ? [magikubeContent.cidr_blocks]
          : [];
      }
      if (!magikubeContent.cidr_blocks.includes(cidrBlock)) {
        magikubeContent.cidr_blocks.push(cidrBlock);
      }
    }
    const domainName = responses.domain;
    if(domainName){
      if (!Array.isArray(magikubeContent.domains)) {
        magikubeContent.domains = magikubeContent.domains
          ? [magikubeContent.domains]
          : [];
      }
      if (!magikubeContent.domains.includes(domainName)) {
        magikubeContent.domains.push(domainName);
      }
    }  
    magikubeContent.command = this.id;
    fs.writeFileSync(dotmagikubeFilePath, JSON.stringify(magikubeContent, null, 2), "utf-8");
    SystemConfig.getInstance().mergeConfigs(magikubeContent);
    const terraform = await SubModuleTemplateProject.getProject(this, args.projectName);
  
    const services = getServices(responses["frontend_app_type"]);
    initializeStatusFile(projectName, modules, services);
    const projectConfig = SystemConfig.getInstance().getConfig();
    await readStatusFile(projectName);
    
      if (terraform) {
        await terraform.createProject(projectName, process.cwd());
        if (projectConfig["cloud_provider"] === "aws") {
          await terraform.AWSProfileActivate(projectConfig["aws_profile"]);
        }
        await new Promise((resolve) => setTimeout(resolve, 15000));
        await terraform?.runTerraformInit( process.cwd() + "/" + projectName + "/infrastructure",`${projectConfig["environment"]}-config.tfvars`,projectName);
          try {AppLogger.info(`Starting Terraform apply for module: ${moduleType}`, true);
              await terraform?.runTerraformApply(process.cwd() + "/" + projectName + "/infrastructure",moduleType, moduleName, "terraform.tfvars");
            // await executeCommandWithRetry(`terraform apply`, { cwd: `${process.cwd()}/${projectName}/infrastructure` }, 1);
            AppLogger.debug(`Successfully applied Terraform for module: ${moduleType}`,true);
          } catch (error) {
            AppLogger.error( `Error applying Terraform for module: ${module}, ${error}`,true);
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

