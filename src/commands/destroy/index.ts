import {Args, Command, Flags} from '@oclif/core'
import BaseCommand from '../base.js'

import TerraformProject from '../../core/terraform-project.js';
import SystemConfig from '../../config/system.js';

import * as fs from 'fs';
import { join } from 'path';

export default class DestroyProject extends BaseCommand {  
  static args = {
    name: Args.string({description: 'Infrastructure project name to be created', required: true}),
  }

  static description = 'Create a new infrastructure as code project'

  static examples = [
    `<%= config.bin %> <%= command.id %> sample 
Creating a new infrastructure as code project named 'sample' in the current directory
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
    //read config and responses form project level config
    const responses = await this.readProjectConfig(args.name, process.cwd());

    this.log(`Destroying infrastructure as code project named '${args.name}' in the current directory`)
    SystemConfig.getInstance().mergeConfigs(responses);
    this.log('Config:', SystemConfig.getInstance().getConfig());

    // Get the project name from the command line arguments
    const projectName = args.name;
    const terraform = await TerraformProject.getProject(this);
    if (terraform)
      await terraform.destroyProject(projectName, process.cwd());
  }
}
