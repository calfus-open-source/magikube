import {Args, Command, Flags} from '@oclif/core'
import BaseCommand from '../base.js'
import inquirer, { Answers } from 'inquirer';
import SystemConfig from '../../config/system.js';
import { v4 as uuidv4 } from 'uuid';
import PromptGenerator from '../../prompts/prompt-generator.js';
import { AppLogger } from '../../logger/appLogger.js';
import ServiceUtils from '../../core/utils/service-utils.js';
import TerraformUtils from '../../core/utils/terraform-utils.js';
import AnsibleUtils from '../../core/utils/ansible-utils.js';
import BaseProject from '../../core/base-project.js';

export default class CreateService extends BaseCommand {  
    static args = {
        name: Args.string({description: 'Service to be created', required: true}),
    }
      
    static flags = {
      dryrun: Flags.boolean({char: 'd', description: 'Dry run the create operation'}),
      // existing: Flags.boolean({char: 'e', description: 'Existing project name'}),
      // add more flags here
    }

    static description = 'Create a new service'
    static examples = [
      `<%= config.bin %> <%= command.id %> sample 
      Creating a new service.
    `,
    ]

  async run(): Promise<void> {
    AppLogger.configureLogger();
    AppLogger.info('Logger Started ...');
    const {args, flags} = await this.parse(CreateService);
    let responses: Answers = { 
      "project_name": args.name, 
      "project_id": uuidv4(),
      "dryrun": flags.dryrun || false,
    };
    const promptGenerator = new PromptGenerator();
    AppLogger.info("Creating a new service", responses['project_name']);
    const serviceUtils = new ServiceUtils(this, this.config);

    // Ask the user if it is a frontend or a backend type of application
    for (const prompt of promptGenerator.getApplicationType()) {
      const resp = await inquirer.prompt(prompt);
      responses = { ...responses, ...resp };
    }

    // The create functions are assuming that the user only has Github as source code repository
    // Need to modularize it to accept other source code repos
    if(responses['application_type'] == "Frontend"){
      for (const prompt of promptGenerator.getFrontendApplicationType()) {
        const resp = await inquirer.prompt(prompt);
        responses = { ...responses, ...resp };
      }

      if (responses['frontend_app_type'] == "next") {
        serviceUtils.createNextApp(responses);
      }
      if (responses['frontend_app_type'] == "react") {
        serviceUtils.createReactApp(responses);
      }
    } 
    if(responses['application_type'] == "Backend"){
      for (const prompt of promptGenerator.getBackendApplicationType()) {
        const resp = await inquirer.prompt(prompt);
        responses = { ...responses, ...resp };
      }
      if (responses['backend_app_type'] == "node-express") {
        serviceUtils.createNodeExpressApp(responses);
      }
    }

    SystemConfig.getInstance().mergeConfigs(responses);
    await serviceUtils.createProject(responses['project_name'], process.cwd())
    // const terraformUtils = new TerraformUtils();
    // const ansibleUtils = new AnsibleUtils(this, this.config);
    AppLogger.info('The services have been initialized and the code has been uploaded to the source code repository!')
  }
}