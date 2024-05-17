import {Args, Command, Flags} from '@oclif/core'
import BaseCommand from '../base.js'
import inquirer from 'inquirer';
import cloudProviderPrompts from '../../prompts/provider.js';
import awsPrompts from '../../prompts/aws.js';
import TerraformProject from '../../core/terraform-project.js';

export default class Project extends BaseCommand {  
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
    const {args, flags} = await this.parse(Project);
    let responses = { "project_name": args.name };

    // Get the cloud provider from the prompt
    for (const propmt of cloudProviderPrompts) {
      const resp = await inquirer.prompt(propmt);
      responses = { ...responses, ...resp };
    }

    if ('cloud_provider' in responses && responses['cloud_provider'] === 'aws') {
      for (const propmt of awsPrompts) {
        const resp = await inquirer.prompt(propmt);
        responses = { ...responses, ...resp };
      }
    }

    this.log(`Creating a new infrastructure as code project named '${args.name}' in the current directory`)
    this.log('Config:', this.systemConfig.getConfig());
    this.log('Responses: ', responses);

    // Get the project name from the command line arguments
    const projectName = args.name;
    const terraform = await TerraformProject.generateProject(this, this.systemConfig, responses);
    if (terraform)
      await terraform.createProject(projectName, process.cwd());
  }
}
