import {Args, Flags} from '@oclif/core'
import BaseCommand from '../base.js'
import inquirer, { Answers } from 'inquirer';

import TerraformProject from '../../core/terraform-project.js';
import PromptGenerator from '../../prompts/prompt-generator.js';
import { v4 as uuidv4 } from 'uuid';
import SystemConfig from '../../config/system.js';
import fs from 'fs';
import { execSync } from 'child_process';
import { AppLogger } from '../../logger/appLogger.js';
import CreateApplication from '../../core/setup-application.js';
import CredentialsPrompts from '../../prompts/credentials-prompts.js';
import ServiceUtils from '../../core/utils/service-utils.js';
import TerraformUtils from '../../core/utils/terraform-utils.js';
import AnsibleUtils from '../../core/utils/ansible-utils.js';

export default class CreateProject extends BaseCommand {
  static args = {
    name: Args.string({description: 'Project name to be created', required: true}),
  }
  
  static flags = {
    dryrun: Flags.boolean({char: 'd', description: 'Simulates execution of the command, showing what would happen without making any real changes to the system.'})
  }

  static description = 'Create new magikube project'
  static examples = [
    `<%= config.bin %> <%= command.id %> sample 
Creating a new magikube project named 'sample' in the current directory
`,
  ]

  async run(): Promise<void> {
    AppLogger.configureLogger();
    AppLogger.info('Logger Started ...');
    const {args, flags} = await this.parse(CreateProject);
    let responses: Answers = { 
      "project_name": args.name, 
      "project_id": uuidv4(),
      "dryrun": flags.dryrun || false,
    };    

// ---------------------------------------PROMPTS-------------------------------------------
    const promptGenerator = new PromptGenerator();
    const credentialsPrompts = new CredentialsPrompts();

    for (const prompt of promptGenerator.getCloudProvider()) {
      const resp = await inquirer.prompt(prompt);
      responses = { ...responses, ...resp };

      for (const prompt of promptGenerator.getCloudProviderPrompts(resp['cloud_provider'])) {
        const resp = await inquirer.prompt(prompt);
        responses = { ...responses, ...resp };
      }

      for( const prompt of credentialsPrompts.getCredentialsPrompts(resp['cloud_provider'], responses)) {
        const resp = await inquirer.prompt(prompt);
        responses = { ...responses, ...resp };        
      }
      credentialsPrompts.saveCredentials(responses);

      for (const prompt of promptGenerator.getVersionControlPrompts(responses['source_code_repository'])) {
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
      }

      const dir = `${process.cwd()}/../magikube-templates`;
      if (!fs.existsSync(dir)) {
        execSync('git clone https://github.com/calfus-open-source/magikube-templates.git', {
            cwd: `${process.cwd()}/..`,
            stdio: 'inherit'
        });
      }
      const copyTemplateResult = execSync('npm run copy-app-templates', {
        cwd: `${process.cwd()}`,
        stdio: 'pipe'
      });
      AppLogger.debug(`Templates copied | ${copyTemplateResult}`);

      for (const prompt of promptGenerator.getGitUserName()) {
        const resp = await inquirer.prompt(prompt);
        responses = { ...responses, ...resp };
      }
      }

      // Asking for the frontend and backend prompts
      for (const prompt of promptGenerator.getFrontendApplicationType()) {
        const resp = await inquirer.prompt(prompt);
        responses = { ...responses, ...resp };
      }
      for (const prompt of promptGenerator.getBackendApplicationType()) {
        const resp = await inquirer.prompt(prompt);
        responses = { ...responses, ...resp };
      }

// ---------------------------------------END OF PROMPTS-------------------------------------------
    AppLogger.debug(`Creating new magikube project named '${args.name}' in the current directory`)
    // Consolidating the configuration of the project
    SystemConfig.getInstance().mergeConfigs(responses);

    // Get the project name from the command line arguments
    const projectName = args.name;
    const serviceUtils = new ServiceUtils(this, this.config);
    const terraformUtils = new TerraformUtils();
    const ansibleUtils = new AnsibleUtils(this, this.config);

    const terraform = await TerraformProject.getProject(this);
    if (terraform) {
      await terraform.createProject(projectName, process.cwd());
      if (responses['cloud_provider'] === 'aws') {
        await terraform.AWSProfileActivate(responses['aws_profile']);
      }
      // Delay of 15 seconds to allow the user to review the terraform files
      await new Promise(resolve => setTimeout(resolve, 15000));
      await terraformUtils?.runTerraform(process.cwd()+"/"+projectName, `${responses['environment']}-config.tfvars`);
      if (responses['cluster_type'] === 'k8s') {
        await terraform.k8sPreProcessing(ansibleUtils, terraformUtils, responses, projectName);
      } 

      // Running the actual app setups
      const projectConfig = SystemConfig.getInstance().getConfig();
      if (responses['backend_app_type'] === 'node-express') {
        serviceUtils?.createNodeExpressApp(responses);
      } 
      if (responses['frontend_app_type'] === 'next') {
        serviceUtils?.createNextApp(responses);
      }
      if (responses['frontend_app_type'] === 'react') {
        serviceUtils?.createReactApp(projectConfig);
      }
    }
  }
}
