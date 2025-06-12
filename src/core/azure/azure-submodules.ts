import BaseProject from '../base-project.js';
import AzureProject from './azure-project.js';
import BaseCommand from '../../commands/base.js';
import { AppLogger } from '../../logger/appLogger.js';

export default class AzureSubmodules extends AzureProject {
  private submoduleName: string;
  private submoduleType: string;

  constructor(command: BaseCommand, config: any, submoduleName: string, submoduleType: string) {
    super(command, config);
    this.submoduleName = submoduleName;
    this.submoduleType = submoduleType;
  }

  async createProject(name: string, path: string): Promise<void> {
    AppLogger.info(`Creating Azure submodule: ${this.submoduleName} of type: ${this.submoduleType}`, true);
    
    // Call parent createProject
    await super.createProject(name, path);
    
    // Create submodule-specific files
    await this.createSubmoduleFiles();
  }

  async createSubmoduleFiles(): Promise<void> {
    try {
      switch (this.submoduleType.toLowerCase()) {
        case 'aks':
          await this.createAKSSubmodule();
          break;
        case 'vnet':
          await this.createVNetSubmodule();
          break;
        case 'storage':
          await this.createStorageSubmodule();
          break;
        case 'acr':
          await this.createACRSubmodule();
          break;
        case 'sql':
          await this.createSQLSubmodule();
          break;
        case 'keyvault':
          await this.createKeyVaultSubmodule();
          break;
        case 'appservice':
          await this.createAppServiceSubmodule();
          break;
        case 'functionapp':
          await this.createFunctionAppSubmodule();
          break;
        default:
          AppLogger.warn(`Unknown Azure submodule type: ${this.submoduleType}`, true);
          await this.createGenericSubmodule();
      }
      
      AppLogger.info(`Azure submodule ${this.submoduleName} created successfully`, true);
    } catch (error) {
      AppLogger.error(`Error creating Azure submodule: ${error}`, true);
      throw error;
    }
  }

  private async createAKSSubmodule(): Promise<void> {
    const basePath = `/infrastructure/modules/${this.submoduleName}`;
    
    this.createFile(
      'main.tf',
      `${process.cwd()}/dist/templates/azure/submodules/aks/main.tf.liquid`,
      basePath,
      true
    );
    this.createFile(
      'variables.tf',
      `${process.cwd()}/dist/templates/azure/submodules/aks/variables.tf.liquid`,
      basePath,
      true
    );
    this.createFile(
      'outputs.tf',
      `${process.cwd()}/dist/templates/azure/submodules/aks/outputs.tf.liquid`,
      basePath,
      true
    );
  }

  private async createVNetSubmodule(): Promise<void> {
    const basePath = `/infrastructure/modules/${this.submoduleName}`;
    
    this.createFile(
      'main.tf',
      `${process.cwd()}/dist/templates/azure/submodules/vnet/main.tf.liquid`,
      basePath,
      true
    );
    this.createFile(
      'variables.tf',
      `${process.cwd()}/dist/templates/azure/submodules/vnet/variables.tf.liquid`,
      basePath,
      true
    );
    this.createFile(
      'outputs.tf',
      `${process.cwd()}/dist/templates/azure/submodules/vnet/outputs.tf.liquid`,
      basePath,
      true
    );
  }

  private async createStorageSubmodule(): Promise<void> {
    const basePath = `/infrastructure/modules/${this.submoduleName}`;
    
    this.createFile(
      'main.tf',
      `${process.cwd()}/dist/templates/azure/submodules/storage/main.tf.liquid`,
      basePath,
      true
    );
    this.createFile(
      'variables.tf',
      `${process.cwd()}/dist/templates/azure/submodules/storage/variables.tf.liquid`,
      basePath,
      true
    );
    this.createFile(
      'outputs.tf',
      `${process.cwd()}/dist/templates/azure/submodules/storage/outputs.tf.liquid`,
      basePath,
      true
    );
  }

  private async createACRSubmodule(): Promise<void> {
    const basePath = `/infrastructure/modules/${this.submoduleName}`;
    
    this.createFile(
      'main.tf',
      `${process.cwd()}/dist/templates/azure/submodules/acr/main.tf.liquid`,
      basePath,
      true
    );
    this.createFile(
      'variables.tf',
      `${process.cwd()}/dist/templates/azure/submodules/acr/variables.tf.liquid`,
      basePath,
      true
    );
    this.createFile(
      'outputs.tf',
      `${process.cwd()}/dist/templates/azure/submodules/acr/outputs.tf.liquid`,
      basePath,
      true
    );
  }

  private async createSQLSubmodule(): Promise<void> {
    const basePath = `/infrastructure/modules/${this.submoduleName}`;
    
    this.createFile(
      'main.tf',
      `${process.cwd()}/dist/templates/azure/submodules/sql/main.tf.liquid`,
      basePath,
      true
    );
    this.createFile(
      'variables.tf',
      `${process.cwd()}/dist/templates/azure/submodules/sql/variables.tf.liquid`,
      basePath,
      true
    );
    this.createFile(
      'outputs.tf',
      `${process.cwd()}/dist/templates/azure/submodules/sql/outputs.tf.liquid`,
      basePath,
      true
    );
  }

  private async createKeyVaultSubmodule(): Promise<void> {
    const basePath = `/infrastructure/modules/${this.submoduleName}`;
    
    this.createFile(
      'main.tf',
      `${process.cwd()}/dist/templates/azure/submodules/keyvault/main.tf.liquid`,
      basePath,
      true
    );
    this.createFile(
      'variables.tf',
      `${process.cwd()}/dist/templates/azure/submodules/keyvault/variables.tf.liquid`,
      basePath,
      true
    );
    this.createFile(
      'outputs.tf',
      `${process.cwd()}/dist/templates/azure/submodules/keyvault/outputs.tf.liquid`,
      basePath,
      true
    );
  }

  private async createAppServiceSubmodule(): Promise<void> {
    const basePath = `/infrastructure/modules/${this.submoduleName}`;
    
    this.createFile(
      'main.tf',
      `${process.cwd()}/dist/templates/azure/submodules/appservice/main.tf.liquid`,
      basePath,
      true
    );
    this.createFile(
      'variables.tf',
      `${process.cwd()}/dist/templates/azure/submodules/appservice/variables.tf.liquid`,
      basePath,
      true
    );
    this.createFile(
      'outputs.tf',
      `${process.cwd()}/dist/templates/azure/submodules/appservice/outputs.tf.liquid`,
      basePath,
      true
    );
  }

  private async createFunctionAppSubmodule(): Promise<void> {
    const basePath = `/infrastructure/modules/${this.submoduleName}`;
    
    this.createFile(
      'main.tf',
      `${process.cwd()}/dist/templates/azure/submodules/functionapp/main.tf.liquid`,
      basePath,
      true
    );
    this.createFile(
      'variables.tf',
      `${process.cwd()}/dist/templates/azure/submodules/functionapp/variables.tf.liquid`,
      basePath,
      true
    );
    this.createFile(
      'outputs.tf',
      `${process.cwd()}/dist/templates/azure/submodules/functionapp/outputs.tf.liquid`,
      basePath,
      true
    );
  }

  private async createGenericSubmodule(): Promise<void> {
    const basePath = `/infrastructure/modules/${this.submoduleName}`;
    
    this.createFile(
      'main.tf',
      `${process.cwd()}/dist/templates/azure/submodules/generic/main.tf.liquid`,
      basePath,
      true
    );
    this.createFile(
      'variables.tf',
      `${process.cwd()}/dist/templates/azure/submodules/generic/variables.tf.liquid`,
      basePath,
      true
    );
    this.createFile(
      'outputs.tf',
      `${process.cwd()}/dist/templates/azure/submodules/generic/outputs.tf.liquid`,
      basePath,
      true
    );
  }
} 