import { Args, Flags } from "@oclif/core";
import BaseCommand from "../base.js";
import TerraformProject from "../../core/terraform-project.js";
import SystemConfig from "../../config/system.js";
import { AppLogger } from "../../logger/appLogger.js";
import { readStatusFile } from "../../core/utils/statusUpdater-utils.js";
import { dotMagikubeConfig } from "../../core/utils/projectConfigReader-utils.js";
import { runTerraformUnlockCommands } from "../../core/utils/unlockTerraformState-utils.js";
import path from "path";
import { executeCommandWithRetry } from "../../core/common-functions/execCommands.js";
import * as fs from "fs";
import TemplateTerraformProject from "../../core/templatesTerraform-projects.js";
import SubModuleTemplateProject from "../../core/submoduleTerraform.js";

export default class DestroyProject extends BaseCommand {
  static args = {
    name: Args.string({
      description: "Project name to be destroyed",
      required: true,
    }),
  };

  static flags = {
    dryrun: Flags.boolean({
      char: "d",
      description:
        "Simulates execution of the command, showing what would happen without making any real changes to the system.",
    }),
  };

  static description = "Destroy magikube project";

  static examples = [
    `<%= config.bin %> <%= command.id %> sample
Destroying magikube project named 'sample' in the current directory`,
  ];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(DestroyProject);
    const projectPath = path.join(process.cwd(), args.name);
    AppLogger.configureLogger(args.name, false);
    const responses = dotMagikubeConfig(args.name, process.cwd());
    const readFile = readStatusFile(responses);
    const infrastructurePath = path.join(projectPath, "infrastructure");
    responses.dryrun = flags.dryrun || false;
    AppLogger.debug( `Destroying magikube project named '${args.name}' in the current directory`, true);
    SystemConfig.getInstance().mergeConfigs(responses);
    const project_config = SystemConfig.getInstance().getConfig();
    let terraform; 
    if (project_config.command === "new") {
      terraform = await TerraformProject.getProject(this);
    } else if (project_config.command === "new_template") {
      terraform = await TemplateTerraformProject.getProject(this);
    } else if (project_config.command === "module") {
      terraform = await SubModuleTemplateProject.getProject(this, args.name);
    }
    if (terraform && responses.cloud_provider === "aws") {
      await terraform.AWSProfileActivate(responses["aws_profile"]);
      await runTerraformUnlockCommands(projectPath, responses);
      if (
        project_config.command === "new_template" ||
        project_config.command === "module"
      ) {
        await executeCommandWithRetry(
          `terraform init -backend-config=${project_config.environment}-config.tfvars`,
          { cwd: infrastructurePath },
          1
        );
        await terraform?.runTerraformDestroyTemplate(
          infrastructurePath,
          "terraform.tfvars"
        );
        if (fs.existsSync(`${process.cwd()}/${args.name}`)) {
          AppLogger.debug(
            `Removing folder ${process.cwd()}/${args.name}`,
            true
          );
          await executeCommandWithRetry(`rm -rf ${process.cwd()}/${args.name}`, { cwd: `${process.cwd()}/${args.name}` }, 1);
        } else {
          AppLogger.debug(
            `Folder ${process.cwd()}/${args.name} does not exist in the path`,
            true
          );
        }
      } else {
        await terraform.destroyProject(args.name, process.cwd());
      }
    } else {
      AppLogger.error(
        "Terraform project initialization failed or unsupported cloud provider.",
        true
      );
    }
  }
}
