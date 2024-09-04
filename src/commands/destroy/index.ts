import {Args, Flags} from '@oclif/core'
import BaseCommand from '../base.js'

import TerraformProject from '../../core/terraform-project.js';
import SystemConfig from '../../config/system.js';

import * as fs from 'fs';
import { join } from 'path';
import { AppLogger } from '../../logger/appLogger.js';

export default class DestroyProject extends BaseCommand {  
  static args = {
    name: Args.string({description: 'Project name to be destroyed', required: true}),
  }

  static flags = {
    dryrun: Flags.boolean({char: 'd', description: 'Simulates execution of the command, showing what would happen without making any real changes to the system.'})
  }

  static description = 'Destroy magikube project'

  static examples = [
    `<%= config.bin %> <%= command.id %> sample 
Destroying magikube project named 'sample' in the current directory
`,
  ]

  async readProjectConfig(name: string, path: string): Promise<any> {
    //read config and responses form project level config
    const projectPath = join(path, name);
    const projectConfigFile = join(projectPath, '.magikube');
    if (fs.existsSync(projectConfigFile)) {
      return JSON.parse(fs.readFileSync(projectConfigFile).toString());
    }
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(DestroyProject);
    AppLogger.configureLogger(args.name, false);
    //read config and responses form project level config
    const responses = await this.readProjectConfig(args.name, process.cwd());
    responses['dryrun'] = flags.dryrun || false;

    AppLogger.debug(`Destroying magikube project named '${args.name}' in the current directory`)
    SystemConfig.getInstance().mergeConfigs(responses);
    AppLogger.debug(`Config:, ${JSON.stringify(SystemConfig.getInstance().getConfig(), null, 4)}`);

    // Get the project name from the command line arguments
    const projectName = args.name;
    const terraform = await TerraformProject.getProject(this);
    if (terraform) {
      if (responses['cloud_provider'] === 'aws') {
        await terraform.AWSProfileActivate(responses['aws_profile']);
      }
      await terraform.destroyProject(projectName, process.cwd());
    }
  }
}
