import {Args, Command, Flags} from '@oclif/core'
import BaseCommand from '../base.js'
import inquirer, { Answers } from 'inquirer';
import SystemConfig from '../../config/system.js';
import { v4 as uuidv4 } from 'uuid';
import TerraformProject from '../../core/terraform-project.js';
import { AppLogger } from '../../logger/appLogger.js';
import PromptGenerator from '../../prompts/prompt-generator.js';
import CredentialsPrompts from '../../prompts/credentials-prompts.js';
import TerraformUtils from '../../core/utils/terraform-utils.js';
import AnsibleUtils from '../../core/utils/ansible-utils.js';


export default class CreateCluster extends BaseCommand {  
    static args = {
      name: Args.string({description: 'Kubernetes cluster to be created', required: true}),
    }
      
    static flags = {
      dryrun: Flags.boolean({char: 'd', description: 'Dry run the create operation'}),
      // add more flags here
      // existing: Flags.boolean({char: 'e', description: 'Existing cluster configuration'})
    }
    
    static description = 'Create a new cluster'
    static examples = [
      `<%= config.bin %> <%= command.id %> sample 
      Creating a new cluster.
    `,
    ]

  async run(): Promise<void> {
    AppLogger.configureLogger();
    AppLogger.info('Logger Started ...');
    const {args, flags} = await this.parse(CreateCluster);
    let responses: Answers = { 
      "project_name": args.name, 
      "project_id": uuidv4(),
      "dryrun": flags.dryrun || false,
    };
    const promptGenerator = new PromptGenerator();
    const credentialsPrompts = new CredentialsPrompts();
    AppLogger.info("Creating a new cluster", responses['project_name']);
   
// ---------------------------------------PROMPTS-------------------------------------------

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
    }
// ---------------------------------------END OF PROMPTS-------------------------------------------
    // Consolidating the configuration of the project
    SystemConfig.getInstance().mergeConfigs(responses);

    // Get the project name from the command line arguments
    const projectName = args.name;
    const terraformUtils = new TerraformUtils();
    const ansibleUtils = new AnsibleUtils(this, this.config);

    const terraform = await TerraformProject.getProject(this);
    if (terraform) {
      await terraform.createProject(responses['project_name'], process.cwd());
      if (responses['cloud_provider'] === 'aws') {
        await terraform.AWSProfileActivate(responses['aws_profile']);
      }
    }
    await new Promise(resolve => setTimeout(resolve, 15000));
    await terraformUtils?.runTerraform(process.cwd()+"/"+projectName, `${responses['environment']}-config.tfvars`);
    if (responses['cluster_type'] === 'k8s') {
      await terraform?.k8sPreProcessing(ansibleUtils, terraformUtils, responses, projectName);
    }
  }
}