import {Args, Command, Flags} from '@oclif/core'
import BaseCommand from '../base.js'
import inquirer, { Answers } from 'inquirer';

import TerraformProject from '../../core/terraform-project.js';
import PromptGenerator from '../../prompts/prompt-generator.js';
import { v4 as uuidv4 } from 'uuid';
import SystemConfig from '../../config/system.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

export default class CreateProject extends BaseCommand {  
  static args = {
    name: Args.string({description: 'Infrastructure project name to be created', required: true}),
  }
  
  static flags = {
    dryrun: Flags.boolean({char: 'd', description: 'Dry run the create operation'})
  }

  static description = 'Create a new infrastructure as code project'
  static examples = [
    `<%= config.bin %> <%= command.id %> sample 
Creating a new infrastructure as code project named 'sample' in the current directory
`,
  ]

  async parseAwsCredentialsFile(): Promise<any> {
    const credentialsFilePath = `${os.homedir()}/.aws/credentials`;
    if (fs.existsSync(credentialsFilePath)) {
      const credentialsFileContent = fs.readFileSync(credentialsFilePath, 'utf8');
      const profileRegex = /\[([^\]]+)\]/g;
      const profiles = [];
      let match;
      while ((match = profileRegex.exec(credentialsFileContent))) {
        const profileName = match[1];
        const profileContent = credentialsFileContent.substring(match.index + match[0].length);
        const awsAccessKey = /aws_access_key_id = (\S+)/.exec(profileContent)?.[1] || '';
        const awsSecretAccessKey = /aws_secret_access_key = (\S+)/.exec(profileContent)?.[1] || '';
        profiles.push({ profileName, awsAccessKey, awsSecretAccessKey });
      }
      return { profiles };
    }
    return { profiles: [] };
  }

  async addAwsCredentialsToFile(profileName: string, awsAccessKey: string, awsSecretAccessKey: string): Promise<void> {
    const awsDirectoryPath = path.join(os.homedir(), '.aws');
    const credentialsFilePath = path.join(awsDirectoryPath, 'credentials');

    // Create the .aws directory if it doesn't exist
    if (!fs.existsSync(awsDirectoryPath)) {
      fs.mkdirSync(awsDirectoryPath);
    }

    // Create the credentials file if it doesn't exist
    if (!fs.existsSync(credentialsFilePath)) {
      fs.writeFileSync(credentialsFilePath, '');
    }

    const credentialsFileContent = fs.readFileSync(credentialsFilePath, 'utf8');
    const newProfile = `[${profileName}]
  aws_access_key_id = ${awsAccessKey}
  aws_secret_access_key = ${awsSecretAccessKey}
  `;

    fs.writeFileSync(credentialsFilePath, `${credentialsFileContent}\n${newProfile}`);
  }

  async run(): Promise<void> {
    const {args, flags} = await this.parse(CreateProject);
    let responses: Answers = { 
      "project_name": args.name, 
      "project_id": uuidv4(),
      "dryrun": flags.dryrun || false,
    };    

    const promptGenerator = new PromptGenerator();
    const awsProfileCreds = this.parseAwsCredentialsFile();
    for (const prompt of promptGenerator.getCloudProvider()) {
      const resp = await inquirer.prompt(prompt);
      responses = { ...responses, ...resp };

      for (const prompt of promptGenerator.getCloudProviderPrompts(resp['cloud_provider'])) {
        const resp = await inquirer.prompt(prompt);
        responses = { ...responses, ...resp };
      }
      const awsProfileCredsResult = await awsProfileCreds;
      if(awsProfileCredsResult.profiles.some((profile: { profileName: any; }) => profile.profileName === responses['aws_profile'])) {
        // AWS profile exists and set the keys from the file
        this.log('AWS Profile exists');
        responses['aws_access_key_id'] = awsProfileCredsResult.profiles.find((profile: { profileName: any; }) => profile.profileName === responses['aws_profile']).awsAccessKey;
        responses['aws_secret_access_key'] = awsProfileCredsResult.profiles.find((profile: { profileName: any; }) => profile.profileName === responses['aws_profile']).awsSecretAccessKey;
      } else {
        //Ask for the awsCreds prompt
        this.log('AWS Profile does not exist');
        this.log('Adding AWS Profile to the file');
        for (const prompt of promptGenerator.getAWSCredentials()) {
          const resp = await inquirer.prompt(prompt);
          responses = { ...responses, ...resp };
        }
        this.addAwsCredentialsToFile(responses['aws_profile'], responses['aws_access_key_id'], responses['aws_secret_access_key']);
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
    if (terraform) {
      await terraform.createProject(projectName, process.cwd());
      // Delay of 5 seconds to allow the user to review the terraform files
      await new Promise(resolve => setTimeout(resolve, 5000));
      if (responses['cluster_type'] === 'k8s') {
        await terraform?.runTerraform(process.cwd()+"/"+projectName, `${responses['environment']}-config.tfvars`);
        await new Promise(resolve => setTimeout(resolve, 10000));
        await terraform?.runAnsiblePlaybook1(process.cwd()+"/"+projectName);
        await terraform?.runAnsiblePlaybook2(process.cwd()+"/"+projectName);
        terraform?.startSSHProcess();
        const masterIP = await terraform?.getMasterIp(process.cwd()+"/"+projectName);
        await terraform?.editKubeConfigFile(process.cwd()+"/"+projectName+"/templates/aws/ansible/config/"+masterIP+"/etc/kubernetes/admin.conf");
        await terraform?.runTerraform(process.cwd()+"/"+projectName+"/k8s_config", `../${responses['environment']}-config.tfvars`, "module.ingress-controller", '../terraform.tfvars');
        terraform?.stopSSHProcess();
      } 
    }
  }
}
