// import { Args } from "@oclif/core";
// import BaseCommand from "../../base.js";
// import { Answers } from "inquirer";
// import SystemConfig from "../../../config/system.js";
// import { AppLogger } from "../../../logger/appLogger.js";
// import {
//   initializeStatusFile,
//   readStatusFile,
// } from "../../../core/utils/statusUpdater-utils.js";
// import { services, modules } from "../../../core/constants/constants.js";
// import path from "path";
// import fs from "fs";
// import SubModuleTemplateProject from "../../../core/submoduleTerraform.js";
// import { Colours } from "../../../prompts/constants.js";
// import { cloneAndCopyTemplates } from "../../../core/utils/copyTemplates-utils.js";
// import { handlePrompts } from "../../../core/utils/handlePrompts-utils.js";
// import { executeCommandWithRetry } from "../../../core/common-functions/execCommands.js";

// function validateModuleInput(input: string): void {
//   const pattern = /^[a-zA-Z0-9_-]+$/;
//   if (!pattern.test(input)) {
//     console.error(
//       `\n \n  ${Colours.boldText}${Colours.redColor} ERROR: ${Colours.colorReset} Module Name "${Colours.boldText}${input}${Colours.colorReset}" is invalid. It must contain only alphanumeric characters, dashes (-), or underscores (_).\n \n`
//     );
//     process.exit(1);
//   }
// }

// export default class NewModule extends BaseCommand {
//   static args = {
//     projectName: Args.string({
//       description: "Base project name",
//       required: true,
//     }),
//     moduleType: Args.string({
//       description: "Type of module (e.g., eks-fargate, k8s)",
//       required: true,
//     }),
//     moduleName: Args.string({
//       description: "Name of the module to be created",
//       required: true,
//     }),
//   };

//   static description = "Create a new module in an existing Magikube project";
//   static examples = [
//     `<%= config.bin %> <%= command.id %> myProject eks-fargate myNewModule
//     Creates a new module named 'myNewModule' of type 'eks-fargate' in the project 'myProject'`,
//   ];

//   async run(): Promise<void> {
//     const { args, flags } = await this.parse(NewModule);

//     // Validate module name
//     if (args.moduleName) {
//       validateModuleInput(args.moduleName);
//     }
//     const { projectName, moduleName } = args;
//     let { moduleType } = args;
//     AppLogger.configureLogger(args.projectName);
//     AppLogger.info(
//       `Starting new module setup: ${moduleName} of type ${moduleType} in project ${projectName}`,
//       true
//     );

//     try {
//       const template = "";
//       let responses: Answers = await handlePrompts(
//         projectName,
//         this.id,
//         template,
//         moduleType
//       );
//       // Check for .magikube file
//       const projectDir = path.resolve(projectName);
//       const dotmagikubeFilePath = path.join(projectDir, ".magikube");
//       if (!fs.existsSync(dotmagikubeFilePath)) {
//         throw new Error(
//           `The .magikube file is missing in the project: ${projectName}`
//         );
//       }

//       await cloneAndCopyTemplates();
//       const magikubeContent = JSON.parse(
//         fs.readFileSync(dotmagikubeFilePath, "utf-8")
//       );
//       if (!Array.isArray(magikubeContent.moduleType)) {
//         magikubeContent.moduleType = magikubeContent.moduleType
//           ? [magikubeContent.moduleType]
//           : [];
//       }
//       if (!magikubeContent.moduleType.includes(moduleType)) {
//         magikubeContent.moduleType.push(moduleType);
//       }
//       if (!Array.isArray(magikubeContent.moduleName)) {
//         magikubeContent.moduleName = magikubeContent.moduleName
//           ? [magikubeContent.moduleName]
//           : [];
//       }
//       if (!magikubeContent.moduleName.includes(moduleName)) {
//         magikubeContent.moduleName.push(moduleName);
//       }
//       if (responses && responses.cidrBlock) {
//         if (!Array.isArray(magikubeContent.cidr_blocks)) {
//           magikubeContent.cidr_blocks = magikubeContent.cidr_blocks
//             ? [magikubeContent.cidr_blocks]
//             : [];
//         }
//         if (!magikubeContent.cidr_blocks.includes(responses.cidrBlock)) {
//           magikubeContent.cidr_blocks.push(responses.cidrBlock);
//         }
//       }
//       if (responses && responses.domain) {
//         if (!Array.isArray(magikubeContent.domains)) {
//           magikubeContent.domains = magikubeContent.domains
//             ? [magikubeContent.domains]
//             : [];
//         }

//         if (!magikubeContent.domains.includes(responses.domain)) {
//           magikubeContent.domains.push(responses.domain);
//         }
//       }
//       magikubeContent.command = this.id;
//       fs.writeFileSync(
//         dotmagikubeFilePath,
//         JSON.stringify(magikubeContent, null, 2),
//         "utf-8"
//       );
//       SystemConfig.getInstance().mergeConfigs(magikubeContent);
//       const terraform = await SubModuleTemplateProject.getProject(
//         this,
//         args.projectName
//       );
//       const predefinedOrder = ["vpc", "eks", "rds", "acm"];
//       let appliedModules:any[] = [];

//       initializeStatusFile(projectName, predefinedOrder, services);
//       const projectConfig = SystemConfig.getInstance().getConfig();
//       await readStatusFile(projectName);

//       if (terraform) {
//         await terraform.createProject(projectName, process.cwd());
//         if (projectConfig["cloud_provider"] === "aws") {
//           await terraform.AWSProfileActivate(projectConfig["aws_profile"]);
//         }
//         await new Promise((resolve) => setTimeout(resolve, 15000));
//         await terraform?.runTerraformInit(
//           process.cwd() + "/" + projectName + "/infrastructure",
//           `${projectConfig["environment"]}-config.tfvars`,
//           projectName
//         );
//         try {
//           if (moduleType === "eks-nodegroup" || moduleType === "eks-fargate") {
//             moduleType = "eks";
//           }
//           AppLogger.info(
//             `Starting Terraform apply for module: ${moduleType}`,
//             true
//           );
//           await terraform?.runTerraformApply(
//             `${process.cwd()}/${projectName}/infrastructure`,
//             moduleType,
//             moduleName,
//             "terraform.tfvars"
//           );
//           if (!appliedModules.includes(moduleType)) {
//             appliedModules.push(moduleType);
//           }
//           AppLogger.debug(
//             `Successfully applied Terraform for module: ${moduleType}`,
//             true
//           );
//         } catch (error) {
//           AppLogger.error(
//             `Error applying Terraform for module: ${module}, ${error}`,
//             true
//           );
//         }
//       }

//       appliedModules = appliedModules.sort(
//         (a, b) => predefinedOrder.indexOf(a) - predefinedOrder.indexOf(b)
//       );
//       console.log("Applied modules in order:", appliedModules);

//       process.exit(0);
//     } catch (error) {
//       AppLogger.error(
//         `An error occurred during the module creation process: ${error}`,
//         true
//       );
//       process.exit(1);
//     }
//   }
// }

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
    const { args, flags } = await this.parse(NewModule);

    // Validate module name
    if (args.moduleName) {
      validateModuleInput(args.moduleName);
    }
    const { projectName, moduleName } = args;
    let { moduleType } = args;
    AppLogger.configureLogger(args.projectName);
    AppLogger.info(
      `Starting new module setup: ${moduleName} of type ${moduleType} in project ${projectName}`,
      true
    );

    const appliedModulesFilePath = path.join(
      projectName,
      "appliedModules.json"
    );
    let appliedModules = [];

    try {
      // Load existing applied modules
      if (fs.existsSync(appliedModulesFilePath)) {
        appliedModules = JSON.parse(
          fs.readFileSync(appliedModulesFilePath, "utf-8")
        );
      }

      const template = "";
      let responses: Answers = await handlePrompts(
        projectName,
        this.id,
        template,
        moduleType
      );

      const projectDir = path.resolve(projectName);
      const dotmagikubeFilePath = path.join(projectDir, ".magikube");
      if (!fs.existsSync(dotmagikubeFilePath)) {
        throw new Error(
          `The .magikube file is missing in the project: ${projectName}`
        );
      }

      await cloneAndCopyTemplates();
      const magikubeContent = JSON.parse(
        fs.readFileSync(dotmagikubeFilePath, "utf-8")
      );
      if (!Array.isArray(magikubeContent.moduleType)) {
        magikubeContent.moduleType = magikubeContent.moduleType
          ? [magikubeContent.moduleType]
          : [];
      }
      if (!magikubeContent.moduleType.includes(moduleType)) {
        magikubeContent.moduleType.push(moduleType);
      }
      if (!Array.isArray(magikubeContent.moduleName)) {
        magikubeContent.moduleName = magikubeContent.moduleName
          ? [magikubeContent.moduleName]
          : [];
      }
      if (!magikubeContent.moduleName.includes(moduleName)) {
        magikubeContent.moduleName.push(moduleName);
      }
      if (responses && responses.cidrBlock) {
        if (!Array.isArray(magikubeContent.cidr_blocks)) {
          magikubeContent.cidr_blocks = magikubeContent.cidr_blocks
            ? [magikubeContent.cidr_blocks]
            : [];
        }
        if (!magikubeContent.cidr_blocks.includes(responses.cidrBlock)) {
          magikubeContent.cidr_blocks.push(responses.cidrBlock);
        }
      }
      if (responses && responses.domain) {
        if (!Array.isArray(magikubeContent.domains)) {
          magikubeContent.domains = magikubeContent.domains
            ? [magikubeContent.domains]
            : [];
        }

        if (!magikubeContent.domains.includes(responses.domain)) {
          magikubeContent.domains.push(responses.domain);
        }
      }

      magikubeContent.command = this.id;
      fs.writeFileSync(
        dotmagikubeFilePath,
        JSON.stringify(magikubeContent, null, 2),
        "utf-8"
      );
      SystemConfig.getInstance().mergeConfigs(magikubeContent);
      const terraform = await SubModuleTemplateProject.getProject(
        this,
        args.projectName
      );
      const predefinedOrder = ["vpc", moduleType, "rds", "acm"];

      initializeStatusFile(projectName, predefinedOrder, services);
      const projectConfig = SystemConfig.getInstance().getConfig();
      await readStatusFile(projectName);

      if (terraform) {
        await terraform.createProject(projectName, process.cwd());
        if (projectConfig["cloud_provider"] === "aws") {
          await terraform.AWSProfileActivate(projectConfig["aws_profile"]);
        }
        await new Promise((resolve) => setTimeout(resolve, 15000));
        await terraform?.runTerraformInit(
          process.cwd() + "/" + projectName + "/infrastructure",
          `${projectConfig["environment"]}-config.tfvars`,
          projectName
        );
        const  originalModule = moduleType
        try {
          if (moduleType === "eks-nodegroup" || moduleType === "eks-fargate") {
            moduleType = "eks";
          }
          AppLogger.info(
            `Starting Terraform apply for module: ${moduleType}`,
            true
          );
          await terraform?.runTerraformApply(`${process.cwd()}/${projectName}/infrastructure`, moduleType, moduleName, "terraform.tfvars");
          moduleType = originalModule;
          // Add the module to appliedModules and sort it
          if (!appliedModules.includes(moduleType)) {
            appliedModules.push(moduleType);
          }

          appliedModules = appliedModules
            .filter((module: string) => predefinedOrder.includes(module))
            .sort(
              (a: string, b: string) => predefinedOrder.indexOf(a) - predefinedOrder.indexOf(b)
            );

          AppLogger.debug( `Successfully applied Terraform for module: ${moduleType}`, true );
        } catch (error) {
          AppLogger.error( `Error applying Terraform for module: ${moduleType}, ${error}`,true );
        }
      }

      fs.writeFileSync(
        appliedModulesFilePath,
        JSON.stringify(appliedModules, null, 2),
        "utf-8"
      );
      // array is getting created with the modules that are created but it is creating the new file with appliedmodules.json
      console.log("Applied modules in order:", appliedModules);
      SystemConfig.getInstance().mergeConfigs({appliedModules: appliedModules});
      const config = SystemConfig.getInstance().getConfig();
      fs.writeFileSync(
        dotmagikubeFilePath,
        JSON.stringify(config, null, 2),
        "utf-8"
      );
      console.log(config, "<<<<config");
      process.exit(0);
    } catch (error) {
      AppLogger.error(`An error occurred during the module creation process: ${error}`,true);
      process.exit(1);
    }
  }
}


