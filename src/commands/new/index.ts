import {Args, Command, Flags} from '@oclif/core'
import BaseCommand from '../base.js'
import inquirer from 'inquirer';

import TerraformProject from '../../core/terraform-project.js';
import PromptGenerator from '../../prompts/prompt-generator.js';
import { v4 as uuidv4 } from 'uuid';
import SystemConfig from '../../config/system.js';


export default class CreateProject extends BaseCommand {  
  static args = {
    name: Args.string({description: 'Infrastructure project name to be created', required: true}),
  }

  static description = 'Create a new infrastructure as code project'

  static examples = [
    `<%= config.bin %> <%= command.id %> sample 
Creating a new infrastructure as code project named 'sample' in the current directory
`,
  ]

  async run(): Promise<void> {
    const {args, flags} = await this.parse(CreateProject);
    let responses:any = { "project_name": args.name, "project_id": uuidv4() };    
    const promptGenerator = new PromptGenerator();

    for (const prompt of promptGenerator.getCloudProvider()) {
      const resp = await inquirer.prompt(prompt);
      responses = { ...responses, ...resp };

      for (const prompt of promptGenerator.getCloudProviderPrompts(resp['cloud_provider'])) {
        const resp = await inquirer.prompt(prompt);
        responses = { ...responses, ...resp };
      }

      for (const prompt of promptGenerator.getEnvironment()) {
        const resp = await inquirer.prompt(prompt);
        responses = { ...responses, ...resp };

        for (const prompt of promptGenerator.getLifecycles(resp['environment'])) {
          const resp = await inquirer.prompt(prompt);
          responses = { ...responses, ...resp };
        }
        // for (const prompt of promptGenerator.getClusterPrompts(responses['cluster_type'])) {
        //   const resp = await inquirer.prompt(prompt);
        //   responses = { ...responses, ...resp };
        // }
      }
    }

    this.log(`Creating a new infrastructure as code project named '${args.name}' in the current directory`)
    SystemConfig.getInstance().mergeConfigs(responses);
    this.log('Config:', SystemConfig.getInstance().getConfig());

    // Get the project name from the command line arguments
    const projectName = args.name;
    const terraform = await TerraformProject.getProject(this);
    if (terraform)
      await terraform.createProject(projectName, process.cwd());
  }
}
