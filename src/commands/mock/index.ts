import {Args, Command, Flags} from '@oclif/core'
import BaseCommand from '../base.js'
import { v4 as uuidv4 } from 'uuid';
import inquirer from 'inquirer';
import fs from 'fs';
import os from 'os';
import AWSProject from '../../core/aws/aws-project.js';
import TerraformProject from '../../core/terraform-project.js';
import PromptGenerator from '../../prompts/prompt-generator.js';
import { execSync } from 'child_process';

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
    let projectConfig = JSON.parse(fs.readFileSync(`${process.cwd()}/${args.name}/.magikube`, 'utf8'));
    // log the project config
    this.log(JSON.stringify(projectConfig, null, 2));
    const projectName = args.name;
    const promptGenerator = new PromptGenerator();
    const terraform = await TerraformProject.mockGetProject(this, projectConfig);

    for (const prompt of promptGenerator.getApplicationType()) {
      const resp = await inquirer.prompt(prompt);
      this.log('resp:', resp);
      projectConfig = { ...projectConfig, ...resp };
    
      if (resp.application_type === 'react') {
        this.log('React app selected');
        let appNamePrompt;
        for (const prompt of promptGenerator.getAppName()) {
          appNamePrompt = await inquirer.prompt(prompt);
        }
        projectConfig = { ...projectConfig, ...appNamePrompt };
        let createReactAppCommand = `npx create-react-app ${appNamePrompt?.app_name}`;

      // Check for typescript feature
      for (const prompt of promptGenerator.getUseTypeScript()) {
        const resp = await inquirer.prompt(prompt);
        projectConfig = { ...projectConfig, ...resp };
        if (resp.use_typescript === 'Yes') {
          createReactAppCommand += ' --template typescript';
        }
      }

      this.log('Creating a new React app');
      // check for eslint feature
      // TODO: adding customized params for eslint
      for (const prompt of promptGenerator.getUseESLint()) {
        const resp = await inquirer.prompt(prompt);
        projectConfig = { ...projectConfig, ...resp };
        if (resp.use_eslint === 'Yes') {
          // Install ESLint
          this.log('Installing ESLint');
        }
      }

      // check for tailwindcss feature
      for (const prompt of promptGenerator.getUseTailwind()) {
        const resp = await inquirer.prompt(prompt);
        projectConfig = { ...projectConfig, ...resp };
        if (resp.use_tailwind === 'Yes') {
          // Install Tailwind CSS
          this.log('Installing Tailwind CSS');
        }
      }
      }

      if (resp.application_type === 'node-express') {
        this.log('Node Expressapp selected');
        let resp;
        for (const prompt of promptGenerator.getAppName()) {
          resp = await inquirer.prompt(prompt);
          projectConfig = { ...projectConfig, ...resp };
        }

        let expressCommand = `npx express-generator ${resp?.app_name} --no-view`;
        let expressCommandTs = `npx express-generator-typescript ${resp?.app_name} --no-view`;
        for (const prompt of promptGenerator.getUseTypeScript()) {
          const resp = await inquirer.prompt(prompt);
          projectConfig = { ...projectConfig, ...resp };
          if (resp.use_typescript === 'No') {
            execSync(expressCommand);
          }
          else if (resp.use_typescript === 'Yes') {
            execSync(expressCommandTs);
          }
        }
      }
    if (projectConfig['cluster_type'] === 'k8s') {
      // Enter dev commands here
      // This will only work once the cluster is up and running and the .magikube file is created in the project directory
      // You can create the functions in the magikube/src/core/aws/aws-project.ts file similar to runAnsiblePlaybook1 or runTerraformCommand1 functions
      // and call them here
      
      if(projectConfig['application_type'] === 'react') {
        terraform?.createReactApp(process.cwd(), projectConfig);
      } else if (projectConfig['application_type'] === 'node-express') {
        terraform?.createNodeExpressApp(process.cwd(), projectConfig);
      } else {
        console.log('Application type not supported');
      }
    }
  }
}
}
