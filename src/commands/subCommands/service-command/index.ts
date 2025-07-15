import BaseCommand from "../../base.js";
import { AppLogger } from "../../../logger/appLogger.js";
import path, { join } from "path";
import fs from "fs";
import { handlePrompts } from "../../../core/utils/handlePrompts-utils.js";
import { cloneAndCopyTemplates } from "../../../core/utils/copyTemplates-utils.js";
import SystemConfig from "../../../config/system.js";
import {
  initializeStatusFile,
  updateStatusFile,
} from "../../../core/utils/statusUpdater-utils.js";
import { services } from "../../../core/constants/constants.js";
import { readStatusFile } from "../../../core/utils/statusUpdater-utils.js";
import MicroserviceProject from "../../../core/microserviceTerraform.js";
import { dotMagikubeConfig } from "../../../core/utils/projectConfigReader-utils.js";
import { Args } from "@oclif/core";
import { setupAndPushServices } from "../../../core/utils/setupAndPushService-utils.js";
import { FullConfigObject } from "../../../core/interface.js";
import { updateProjectConfigArrays } from "../../../core/utils/updateDotMagikube-utils.js";
import {
  GEN_AI_CONFIG,
  NEXT_APP_CONFIG,
  NODE_APP_CONFIG,
  REACT_APP_CONFIG,
} from "../../../core/constants/systemDefaults.js";
export default class Microservice extends BaseCommand {
  // Define the expected arguments
  static args = {
    name: Args.string({
      description: "Project name to be created",
      required: true,
    }),
  };
  static description =
    "Create a new microservice in the current Magikube project";

  static examples = [
    `$ magikube create microservice Creates a new microservice in the current project`,
  ];

  async run(): Promise<void> {
    // Extract the argument
    const { args } = await this.parse(Microservice);
    AppLogger.configureLogger(args.name, this.id);
    // Check if the argument is "microservice"
    if (args.name !== "microservice") {
      AppLogger.error(
        `Invalid argument. Expected 'microservice', but received '${args.name}'.`,
        true
      );
      process.exit(1);
    }

    try {
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
      const resp = dotMagikubeConfig("", process.cwd());
      const projectName = path.basename(currentDir);
      // Handle prompts and create the microservice
      const responses = await handlePrompts({}, this.id, "", "", "");
      responses.command = this.id;
      updateProjectConfigArrays(resp, "service_names", responses.service_name);
      if (responses.service_type === "frontend-service") {
        updateProjectConfigArrays(
          resp,
          "services",
          responses.frontend_app_type
        );
      } else if (responses.service_type === "backend-service") {
        updateProjectConfigArrays(resp, "services", responses.backend_app_type);
      } else {
        updateProjectConfigArrays(resp, "services", responses.service_type);
      }
      AppLogger.configureLogger(projectName, this.id);
      const distFolderPath = path.resolve(process.cwd(), "..");

      // Create dist folder if not exist
      if (!fs.existsSync(`${distFolderPath}/dist`)) {
        await cloneAndCopyTemplates(this.id, resp.cloud_provider);
      }

      AppLogger.debug(
        `Creating new Magikube project named in the current directory`,
        true
      );
      const serviceConfig: any =
        responses.frontend_app_type === "react"
          ? { ...REACT_APP_CONFIG }
          : responses.frontend_app_type === "next"
          ? { ...NEXT_APP_CONFIG }
          : responses.backend_app_type === "node-express"
          ? { ...NODE_APP_CONFIG }
          : responses.service_type === "gen-ai-service"
          ? { ...GEN_AI_CONFIG }
          : undefined;

      const combinedConfig = { ...resp, ...serviceConfig, ...responses };
      SystemConfig.getInstance().mergeConfigs(combinedConfig);
      const projectConfig = SystemConfig.getInstance().getConfig();
      const projectConfigFile = join(process.cwd(), ".magikube");
      fs.writeFileSync(
        projectConfigFile,
        JSON.stringify(combinedConfig, null, 4)
      );
      const terraform = await MicroserviceProject.getProject(this);
      initializeStatusFile("", [], [responses.service_type]);
      const {
        github_access_token: token,
        git_user_name: userName,
        github_owner: orgName,
        source_code_repository: sourceCodeRepo,
        aws_region: region,
        aws_access_key_id: awsAccessKey,
        aws_secret_access_key: awsSecretKey,
        environment,
      } = projectConfig;
       
      const configObject: FullConfigObject = {
        common: {
          token,
          userName,
          orgName,
          sourceCodeRepo,
          projectName: projectConfig.project_name,
          environment,
        },
      };
      // Read the status.json file
      await readStatusFile(projectConfig, this.id);
      if (terraform) {
        await terraform.createProject(projectName, process.cwd(), this.id);
        //Activate AWS Profile
        if (projectConfig["cloud_provider"] === "aws") {
          await terraform.AWSProfileActivate(projectConfig["aws_profile"]);
        }
        // Add delay of 15 sec
        await new Promise((resolve) => setTimeout(resolve, 15000));
        // Initialize the terraform
        await terraform?.runTerraformInit(
          `${currentDir}/infrastructure`,
          `${projectConfig["environment"]}-config.tfvars`,
          ""
        );
        try {
          AppLogger.info(
            `Starting Terraform apply for module: module.repository`,
            true
          );
          updateStatusFile(
            projectConfig.project_name,
            `terraform-apply`,
            "fail"
          );
          // Apply terraform on module.repository module
          await terraform?.runTerraformApply(
            `${currentDir}/infrastructure`,
            "module.repository",
            "",
            "terraform.tfvars"
          );
          updateStatusFile(
            projectConfig.project_name,
            `terraform-apply`,
            "success"
          );
          AppLogger.debug(
            `Successfully applied Terraform for module: module.repository`,
            true
          );
        } catch (error) {
          AppLogger.error(
            `Error applying Terraform for module: module.repository, ${error}`,
            true
          );
        }

        // Create the microservice
        await setupAndPushServices(projectConfig, configObject);
        process.exit(0);
      }
    } catch (error) {
      AppLogger.error(
        `An error occurred during the setup process: ${error}`,
        true
      );
      process.exit(1);
    }
  }
}
