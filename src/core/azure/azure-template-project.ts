import BaseProject from '../base-project.js';
import AzureProject from './azure-project.js';
import BaseCommand from '../../commands/base.js';
import SystemConfig from '../../config/system.js';
import { AppLogger } from '../../logger/appLogger.js';
import fs from 'fs';
import { join } from 'path';

export default class AzureTemplateProject extends AzureProject {
  private templatePath: string;
  private projectConfig: any;

  constructor(command: BaseCommand, config: any, templatePath?: string) {
    super(command, config);
    this.templatePath = templatePath || '';
    this.projectConfig = SystemConfig.getInstance().getConfig();
  }

  async createProject(name: string, path: string): Promise<void> {
    AppLogger.info(`Creating Azure template project: ${name}`, true);
    
    // Call parent createProject if needed
    await super.createProject(name, path);
    
    // Create template-specific files
    await this.createTemplateFiles(path, name);
  }

  async createTemplateFiles(projectPath: string, projectName: string): Promise<void> {
    const templateBasePath = join(projectPath, projectName);
    
    try {
      // Create main template structure
      await this.createMainTemplate(templateBasePath);
      await this.createVariablesTemplate(templateBasePath);
      await this.createOutputsTemplate(templateBasePath);
      await this.createBackendConfig(templateBasePath);
      
      AppLogger.info('Azure template files created successfully', true);
    } catch (error) {
      AppLogger.error(`Error creating Azure template files: ${error}`, true);
      throw error;
    }
  }

  async createMainTemplate(basePath: string): Promise<void> {
    const templatePath = `${process.cwd()}/dist/templates/azure/template/main.tf.liquid`;
    this.createFile(
      'main.tf',
      templatePath,
      '/infrastructure',
      true
    );
  }

  async createVariablesTemplate(basePath: string): Promise<void> {
    const templatePath = `${process.cwd()}/dist/templates/azure/template/variables.tf.liquid`;
    this.createFile(
      'variables.tf',
      templatePath,
      '/infrastructure',
      true
    );
  }

  async createOutputsTemplate(basePath: string): Promise<void> {
    const templatePath = `${process.cwd()}/dist/templates/azure/template/outputs.tf.liquid`;
    this.createFile(
      'outputs.tf',
      templatePath,
      '/infrastructure',
      true
    );
  }

  async createBackendConfig(basePath: string): Promise<void> {
    const templatePath = `${process.cwd()}/dist/templates/azure/template/backend-config.tfvars.liquid`;
    this.createFile(
      `${this.config.environment}-config.tfvars`,
      templatePath,
      '/infrastructure',
      true
    );
  }

  async createProviderTemplate(basePath: string): Promise<void> {
    const templatePath = `${process.cwd()}/dist/templates/azure/template/providers.tf.liquid`;
    this.createFile(
      'providers.tf',
      templatePath,
      '/infrastructure',
      true
    );
  }

  async createTerraformVars(basePath: string): Promise<void> {
    const templatePath = `${process.cwd()}/dist/templates/azure/template/terraform.tfvars.liquid`;
    this.createFile(
      'terraform.tfvars',
      templatePath,
      '/infrastructure',
      true
    );
  }

  async customizeTemplate(templateType: string): Promise<void> {
    AppLogger.info(`Customizing Azure template for type: ${templateType}`, true);
    
    switch (templateType) {
      case 'aks':
        await this.createAKSTemplate();
        break;
      case 'app-service':
        await this.createAppServiceTemplate();
        break;
      case 'function-app':
        await this.createFunctionAppTemplate();
        break;
      case 'storage':
        await this.createStorageTemplate();
        break;
      default:
        AppLogger.warn(`Unknown template type: ${templateType}`, true);
    }
  }

  private async createAKSTemplate(): Promise<void> {
    // Create AKS specific template files
    this.createAKS();
    this.createVNet();
    this.createACR();
  }

  private async createAppServiceTemplate(): Promise<void> {
    // Create App Service specific template files
    const templatePath = `${process.cwd()}/dist/templates/azure/modules/app-service/main.tf.liquid`;
    this.createFile(
      'main.tf',
      templatePath,
      '/infrastructure/modules/app-service',
      true
    );
  }

  private async createFunctionAppTemplate(): Promise<void> {
    // Create Function App specific template files
    const templatePath = `${process.cwd()}/dist/templates/azure/modules/function-app/main.tf.liquid`;
    this.createFile(
      'main.tf',
      templatePath,
      '/infrastructure/modules/function-app',
      true
    );
  }

  private async createStorageTemplate(): Promise<void> {
    // Create Storage Account specific template files
    const templatePath = `${process.cwd()}/dist/templates/azure/modules/storage-account/main.tf.liquid`;
    this.createFile(
      'main.tf',
      templatePath,
      '/infrastructure/modules/storage-account',
      true
    );
  }
} 