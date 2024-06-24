import {Args, Command, Flags} from '@oclif/core'
import BaseCommand from '../base.js'
import { v4 as uuidv4 } from 'uuid';
import inquirer from 'inquirer';
import fs from 'fs';
import os from 'os';
import AWSProject from '../../core/aws/aws-project.js';
import TerraformProject from '../../core/terraform-project.js';
import PromptGenerator from '../../prompts/prompt-generator.js';

export default class Mock extends BaseCommand {
  static args = {
    name: Args.string({description: 'Infrastructure project name to be used', required: true}),
  }
  
  static override description = 'describe the command here'

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static override flags = {
    // flag with no value (-f, --force)
    force: Flags.boolean({char: 'f'}),
    // flag with a value (-n, --name=VALUE)
    name: Flags.string({char: 'n', description: 'name to print'}),
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(Mock);

    // read the .magikube json file in the current directory inside the project name
    const projectConfig = JSON.parse(fs.readFileSync(`${process.cwd()}/${args.name}/.magikube`, 'utf8'));
    // log the project config
    this.log(JSON.stringify(projectConfig, null, 2));
    const projectName = args.name;
    const promptGenerator = new PromptGenerator();
    const terraform = await TerraformProject.mockGetProject(this, projectConfig);
    this.log(`Project Name ==========>: ${projectName}`);
    if (projectConfig['cluster_type'] === 'k8s') {
      // Enter dev commands here
      // This will only work once the cluster is up and running and the .magikube file is created in the project directory
      // You can create the functions in the magikube/src/core/aws/aws-project.ts file similar to runAnsiblePlaybook1 or runTerraformCommand1 functions
      // and call them here
      
      console.log('Running.....!', projectConfig);

      terraform?.createReactApp(process.cwd(), 'sample');
      console.log('Completed.....!');
    }
  }
}
