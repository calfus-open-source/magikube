import {Args, Command, Config, Flags} from '@oclif/core'
import BaseCommand from '../base.js'
import { v4 as uuidv4 } from 'uuid';
import inquirer from 'inquirer';
import fs from 'fs';
import os from 'os';
import AWSProject from '../../core/aws/aws-project.js';
import TerraformProject from '../../core/terraform-project.js';
import PromptGenerator from '../../prompts/prompt-generator.js';
import SystemConfig from '../../config/system.js';
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
    if (projectConfig['cluster_type'] === 'k8s') {
      // Enter dev commands here
      // This will only work once the cluster is up and running and the .magikube file is created in the project directory
      // You can create the functions in the magikube/src/core/aws/aws-project.ts file similar to runAnsiblePlaybook1 or runTerraformCommand1 functions
      // and call them here
      let resp;
      let responses: any = {};
      let appRouter;
      for (const prompt of promptGenerator.getFrontendPrompts()) {
        resp = await inquirer.prompt(prompt);
        responses = { ...responses, ...resp };
      }
      for (const prompt of promptGenerator.getBackendPrompts()) {
        resp = await inquirer.prompt(prompt);
        responses = { ...responses, ...resp };
      }
      console.log(responses);
      if (responses['frontend_app'] == true || responses['backend_app'] == true) {
          const dir = `${process.cwd()}/../magikube-templates`;
          if (!fs.existsSync(dir)) {
            execSync('git clone https://github.com/calfus-open-source/magikube-templates.git', {
                cwd: `${process.cwd()}/..`,
                stdio: 'inherit'
            });
          }
          execSync('npm run copy-app-templates', {
            cwd: `${process.cwd()}`,
            stdio: 'inherit'
          });
          for (const prompt of promptGenerator.getOrganizationName()) {
            resp = await inquirer.prompt(prompt);
            responses = { ...responses, ...resp };
          }
          for (const prompt of promptGenerator.getGitUserName()) {
            resp = await inquirer.prompt(prompt);
            responses = { ...responses, ...resp };
          }
      }

      if(responses['frontend_app'] == true) {
        for (const prompt of promptGenerator.getFrontendApplicationType()) {
          resp = await inquirer.prompt(prompt);
          responses = { ...responses, ...resp };
        }
        for (const prompt of promptGenerator.getFrontendAppName()) {
          resp = await inquirer.prompt(prompt);
          responses = { ...responses, ...resp };
        }
        for (const prompt of promptGenerator.getAppRouterPrompts()) {
          const resp = await inquirer.prompt(prompt);
          appRouter = resp['app_router'];
          this.log(`App router type is => ${appRouter}` );
        }
      } 

      if(responses['backend_app'] == true) {
        for (const prompt of promptGenerator.getBackendApplicationType()) {
          resp = await inquirer.prompt(prompt);
          responses = { ...responses, ...resp };
        }
        for (const prompt of promptGenerator.getBackendAppName()) {
          resp = await inquirer.prompt(prompt);
          responses = { ...responses, ...resp };
        }
      }

        SystemConfig.getInstance().mergeConfigs(responses);
        const systemConfig = SystemConfig.getInstance().getConfig();
        if (systemConfig['backend_app_type'] === 'node-express') {
          terraform?.createNodeExpressApp(systemConfig);
        } 
        if (systemConfig['frontend_app_type'] === 'next') {
          terraform?.createNextApp(appRouter, systemConfig);
        }
    }
  }
}
