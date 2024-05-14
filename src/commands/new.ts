import { Command, Flags } from '@oclif/core';
import inquirer from 'inquirer';
import { Liquid } from 'liquidjs';
import * as fs from 'node:fs';
import * as path from 'node:path';

export default class BuildCluster extends Command {
  static description = 'Build a new cluster with the basic setup files';
    
  static flags = {
    help: Flags.help({ char: 'h' }),
  };

  private templates: Record<string, string> = {}; // Define a property to store templates

  constructor(argv: string[], config: any) {
    super(argv, config);
    // console.log(new URL('.', import.meta.url).pathname);
    console.log("Initializing building cluster!");

    // Load templates from a folder when the class is instantiated
    // this.loadTemplatesFromFolder('../src/templates/aws/common');
  }

  async askAWSBasicVariables() {
    return inquirer.prompt([
      {
        default: 'us-east-1',
        message: 'Enter the AWS region:',
        name: 'region',
        type: 'input',
      },
      {
        message: 'Enter the name of the S3 bucket for Terraform state:',
        name: 'tfstate_bucket',
        type: 'input',
      },
      {
        choices: ['true', 'false'],
        default: 'true',
        message: 'Enable encryption for the Terraform state bucket?',
        name: 'tfstate_bucket_encryption',
        type: 'list',
      },
      {
        default: 'variables.tfvars',
        message: 'Enter the name of the Terraform state file:',
        name: 'tfstate_key',
        type: 'input',
      },
    ]);
  }

  async buildServers(cloudProvider: string) {
    const liquid = new Liquid();
    const templateFile = fs.readFileSync(path.join(new URL('.', import.meta.url).pathname, "..", "templates", cloudProvider, "common", "variables.liquid"), 'utf8');
    try {
      const awsBasicVariables = await this.askAWSBasicVariables();
      const renderedTemplate = await liquid.parseAndRender(templateFile, awsBasicVariables);
      fs.writeFileSync(path.join(new URL('.', import.meta.url).pathname, "..", "templates", cloudProvider, "common", "variables.tfvars"), renderedTemplate);

      this.log('variables.tfvars file generated successfully.');
    } catch {
      this.error(`Error generating variables.tfvars file: ${this.error}`);
    }
  }

  async EKSVariables() {
    return inquirer.prompt([
      {
        default: 'nebula',
        message: 'Enter the Cluster name:',
        name: 'cluster_name',
        type: 'input',
      },
      {
        default: '1.29',
        message: 'Enter the version of the cluster to be used:',
        name: 'cluster_version',
        type: 'input',
      },
      {
        choices: ['true', 'false'],
        default: 'true',
        message: 'Enable cluster public access through endpoint?',
        name: 'cluster_endpoint_public_access',
        type: 'list',
      },
      {
        default: 'variables.tfvars',
        message: 'Do you already have a VPC for the cluster:',
        name: 'existing_vpc',
        type: 'confirm',
        validate(input) {
          return input ? true : 'Please confirm to proceed';
        },
      },
      {
        message: 'Enter the VPC ID that is already present:',
        name: 'vpc_id',
        type: 'input',
        when(answers) {
            if(!answers.existing_vpc) {
              console.log("Calling VPC creation module to create one for the cluster... If this was a mistake then please cancel the command and run again!")
            }
        },
      }
    ])
  };
  
  extractBaseFilename(filePath: string): string {
    const baseFilename = path.basename(filePath);
    const filenameWithoutExtension = path.parse(baseFilename).name;
    return filenameWithoutExtension;
  }

  loadTemplatesFromFolder(folderPath: string): void {
    const files = fs.readdirSync(folderPath);

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const source = fs.readFileSync(filePath, 'utf8');

      this.templates[this.extractBaseFilename(filePath)] = source;
      this.log(`Template '${file}' loaded successfully.`);
    }
  }


  // async processTemplate(templateRequest: TemplateRequestDto, context: Record<string, any>): Promise<string> {
  //   try {
  //     const template = this.templates[templateRequest.id];
  //     if (!template) {
  //       throw new Error('Template not found');
  //     }

  //     const liquid = new Liquid();
  //     return liquid.parseAndRender(template, context);
  //   } catch (error) {
  //     this.error('Error processing template:', error);
  //     throw new Error('Failed to process template');
  //   }
  // }

  async run() {
    // Prompt the user for confirmation
    const buildServer = await inquirer.prompt([
      {
        message: 'Do you really want to build a master server?👊🏻',
        name: 'buildServerConfirmation',
        type: 'confirm',
        validate(input) {
          return input ? true : 'Please confirm to proceed';
        },
      },
    ]);

    // Check user confirmation
    if (buildServer.buildServerConfirmation) {
      const { cloudProvider } = await inquirer.prompt([
        {
          choices: ['aws'],
          message: 'Select a cloud provider:',
          name: 'cloudProvider',
          type: 'list',
        },
      ]);

      // Build the master and worker servers
      this.log('Building master and worker servers...');
      await this.buildServers(cloudProvider);
    } else {
      this.log('The basic server can be provisioned too!');
    }
  }
}