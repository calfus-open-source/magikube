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
    this.log(process.cwd());
    console.log(new URL('.', import.meta.url).pathname);

    // Load templates from a folder when the class is instantiated
    // this.loadTemplatesFromFolder('../src/templates/aws/common');
  }

  async askBasicAWSVariables() {
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
        default: 'terraform.tfstate',
        message: 'Enter the name of the Terraform state file:',
        name: 'tfstate_key',
        type: 'input',
      },
    ]);
  }

  async buildServers() {
    // Create Liquid instance
    const liquid = new Liquid();

    // Read the Liquid template file
    const templateFile = fs.readFileSync(path.join(new URL('.', import.meta.url).pathname, "..", "templates", "aws", "common", "variables.liquid"), 'utf8');

    // Ask the user for variable values
    const basicAWSVariables = await this.askBasicAWSVariables();

    try {
      // Parse and render the Liquid template with variables
      const renderedTemplate = await liquid.parseAndRender(templateFile, basicAWSVariables);
      this.log(renderedTemplate);
      // Write the rendered template to a new file
      fs.writeFileSync(path.join(new URL('.', import.meta.url).pathname, "..", "templates", "aws", "common", "variables.tfvars"), renderedTemplate);

      this.log('variables.tfvars file generated successfully.');
    } catch {
      this.error(`Error generating variables.tfvars file: ${this.error}`);
    }
  }

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
      // Build the master and worker servers
      this.log('Building master and worker servers...');
      await this.buildServers();
    } else {
      this.log('The basic server can be provisioned too!');
    }
  }
}
