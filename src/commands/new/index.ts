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
import { ConfigObject } from '../../core/interface.js';
import { ManageRepository } from '../../core/manage-repository.js';

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

    const promptGenerator = new PromptGenerator();
    const credentialsPrompts = new CredentialsPrompts();

    let appRouter;
    for (const prompt of promptGenerator.getCloudProvider()) {
      const resp = await inquirer.prompt(prompt);
      responses = { ...responses, ...resp };

      for (const prompt of promptGenerator.getCloudProviderPrompts(resp['cloud_provider'])) {
        const resp = await inquirer.prompt(prompt);
        responses = { ...responses, ...resp };
      }

      const prompts = credentialsPrompts.getCredentialsPrompts(resp['cloud_provider'], responses);
      if (prompts.length > 0) {
        for( const prompt of prompts) {
          const resp = await inquirer.prompt(prompt);
          responses = { ...responses, ...resp };        
        }
        credentialsPrompts.saveCredentials(responses);
      }
       
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

      const dir = `${process.cwd()}/magikube-templates`;
      if (!fs.existsSync(dir)) {
        execSync('git clone https://github.com/calfus-open-source/magikube-templates.git', {
            cwd: `${process.cwd()}`,
            stdio: 'inherit'
        });
      }
      if (!fs.existsSync(`${process.cwd()}/dist`)) {
       try{
        execSync("mkdir dist", 
          {
            cwd: `${process.cwd()}`,
            stdio: 'inherit'
          })
        } catch(error){   
            throw error
          }      
      }
      const copyTemplateResult = execSync(`rsync -av magikube-templates/* dist/ --prune-empty-dirs`, {
        cwd: `${process.cwd()}`,
        stdio: 'pipe'
      });
      execSync(`rm -rf ${dir}`)
      AppLogger.debug(`Templates copied | ${copyTemplateResult}`);
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

    AppLogger.debug(`Creating new magikube project named '${args.name}' in the current directory`)
    SystemConfig.getInstance().mergeConfigs(responses);

    // Get the project name from the command line arguments
    const projectName = args.name;
    const terraform = await TerraformProject.getProject(this);
    const projectConfig = SystemConfig.getInstance().getConfig();
    let command: BaseCommand | undefined;
    const createApp = new CreateApplication(command as BaseCommand, projectConfig)
    if (terraform) {
      await terraform.createProject(projectName, process.cwd());
      if (responses['cloud_provider'] === 'aws') {
        await terraform.AWSProfileActivate(responses['aws_profile']);
      }
      // Delay of 15 seconds to allow the user to review the terraform files
      await new Promise(resolve => setTimeout(resolve, 15000));
      await terraform?.runTerraform(process.cwd()+"/"+projectName+"/infrastructure", `${responses['environment']}-config.tfvars`);
      if (responses['cluster_type'] === 'k8s') {
        await new Promise(resolve => setTimeout(resolve, 10000));
        await terraform?.runAnsiblePlaybook1(process.cwd()+"/"+projectName);
        await terraform?.runAnsiblePlaybook2(process.cwd()+"/"+projectName);
        terraform?.startSSHProcess();
        const masterIP = await terraform?.getMasterIp(process.cwd()+"/"+projectName);
        await terraform?.editKubeConfigFile(process.cwd()+"/"+projectName+"/templates/aws/ansible/config/"+masterIP+"/etc/kubernetes/admin.conf");
        await terraform?.runTerraform(process.cwd()+"/"+projectName+"/k8s_config", `../${responses['environment']}-config.tfvars`, "module.ingress-controller", '../terraform.tfvars');
        terraform?.stopSSHProcess();
      } 

      const projectConfig = SystemConfig.getInstance().getConfig();
      let command: BaseCommand | undefined;
      const createApp = new CreateApplication(command as BaseCommand, projectConfig)

      // Running the actual app setups
      const  { github_access_token: token, git_user_name: userName, github_owner: orgName, 
               source_code_repository: sourceCodeRepo, aws_region: region, aws_access_key_id: awsAccessKey,
               aws_secret_access_key: awsSecretKey, environment:environment} = projectConfig;
      
      const configObject: ConfigObject = {
        token,
        userName,
        orgName,
        sourceCodeRepo,
        region,
        projectName,
        awsAccessKey,
        awsSecretKey
      };
     const statusAuthenticationService = await createApp.setupAuthenticationService(projectConfig);
      if(statusAuthenticationService){
                  configObject.appName = 'auth-service';
                  configObject.appType = 'auth-service';
        await ManageRepository.pushCode(configObject)

      }
      const statuskeyclockService = await createApp.setupKeyCloak(projectConfig);
      if(statuskeyclockService){
                configObject.appName = 'keycloak';
                configObject.appType = 'keycloak-service';
            await ManageRepository.pushCode(configObject)

          }

      if (responses['backend_app_type']) {
        await createApp.handleAppCreation(responses['backend_app_type'], configObject);
      }
      if (responses['frontend_app_type']) {
        await createApp.handleAppCreation(responses['frontend_app_type'], configObject);
      }
      const setupGitopsservicestatus =  await createApp.setupGitops(projectConfig);
      if(setupGitopsservicestatus){
                        configObject.appName = `${environment}`;
                        configObject.appType = `gitops`;
              await ManageRepository.pushCode(configObject)

            }
    }

      await createApp.MoveFiles(projectName)

  }
}
