import { Args, Flags } from '@oclif/core';
import BaseCommand from '../base.js';
import TerraformProject from '../../core/terraform-project.js';
import SystemConfig from '../../config/system.js';
import { AppLogger } from '../../logger/appLogger.js';
import { readStatusFile } from '../../core/utils/statusUpdater-utils.js';
import { dotMagikubeConfig } from "../../core/utils/projectConfigReader-utils.js";
import { runTerraformUnlockCommands } from '../../core/utils/unlockTerraformState-utils.js';
import path from 'path';
import { executeCommandWithRetry } from '../../core/common-functions/execCommands.js';
import * as fs from 'fs';
import TemplateTerraformProject from '../../core/templatesTerraform-projects.js';
import SubModuleTemplateProject from '../../core/submoduleTerraform.js';

 
export default class DestroyProject extends BaseCommand {  
  static args = {
    name: Args.string({ description: 'Project name to be destroyed', required: true }),
  };
 
  static flags = {
    dryrun: Flags.boolean({ char: 'd', description: 'Simulates execution of the command, showing what would happen without making any real changes to the system.' })
  };
 
  static description = 'Destroy magikube project';
 
  static examples = [
    `<%= config.bin %> <%= command.id %> sample
Destroying magikube project named 'sample' in the current directory`,
  ];
 
  async run(): Promise<void> {
    const { args, flags } = await this.parse(DestroyProject);
    const projectPath = path.join(process.cwd(), args.name);
    AppLogger.configureLogger(args.name, false);
    const responses = dotMagikubeConfig(args.name, process.cwd());
    const readFile = readStatusFile(args.name);
    const infrastructurePath = path.join(projectPath, 'infrastructure')
    responses.dryrun = flags.dryrun || false;
    AppLogger.debug(`Destroying magikube project named '${args.name}' in the current directory`);
    SystemConfig.getInstance().mergeConfigs(responses);
    AppLogger.debug(`Config: ${JSON.stringify(SystemConfig.getInstance().getConfig(), null, 4)}`);
    const project_config = SystemConfig.getInstance().getConfig()
    let terraform; // Use `let` to allow reassignment
    if (project_config.command === "new") {
      terraform = await TerraformProject.getProject(this);
    } else if (project_config.command === "new_template") {
      terraform = await TemplateTerraformProject.getProject(this);
    } else if (project_config.command === "new_module"){
      terraform = await SubModuleTemplateProject.getProject(this, args.name);
    }
    if (terraform && responses.cloud_provider === 'aws') {  
      await terraform.AWSProfileActivate(responses['aws_profile'])
      if (readFile.services["terraform-apply"] === "fail") {
        await runTerraformUnlockCommands(projectPath, responses);
      }  
      if (
        project_config.command === "new_template" ||
        project_config.command === "new_module"
      ) {
        await executeCommandWithRetry(`terraform init -backend-config=${project_config.environment}-config.tfvars`, { cwd: infrastructurePath }, 1);
        await terraform?.runTerraformDestroyTemplate(infrastructurePath,"terraform.tfvars");
        AppLogger.debug(`Removing folder '${process.cwd()}/${project_config.profileName}'`, true);
        fs.rmSync(`${process.cwd()}/${project_config.project_name}'`, { recursive: true });
      } else{
        await terraform.destroyProject(args.name, process.cwd());
      } 

    } else {
      AppLogger.error('Terraform project initialization failed or unsupported cloud provider.', true);
    }
  }
}