// Create Azure Storage Account and Blob Container for storing terraform state
// Create a new Storage Account in the Azure resource group to store the terraform state. The storage account name should be unique globally.

import BaseProject from '../base-project.js';
import { AppLogger } from '../../logger/appLogger.js';
import { execSync } from 'child_process';
import { checkAzureLogin, azExecAsync } from '../utils/azure-utils.js';

export default class AzureTerraformBackend {
  static async create(
    project: BaseProject,
    projectName: string,
    location: string,
    _clientId: string,
    _clientSecret: string,
    _tenantId: string,
    _subscriptionId: string,
  ): Promise<boolean> {
    const storageAccountName = `${projectName.replace(
      /-/g,
      '',
    )}tfstate`.toLowerCase();
    const resourceGroupName = `${projectName}-rg`;
    const containerName = 'tfstate';

    // Check if Azure CLI is logged in
    if (!checkAzureLogin()) {
      AppLogger.error(
        "Azure CLI is not logged in. Please run 'az login' to authenticate.",
        true,
      );
      return false;
    }

    const rgResult = await AzureTerraformBackend.createResourceGroup(
      project,
      resourceGroupName,
      location,
    );
    if (!rgResult) return false;

    const saResult = await AzureTerraformBackend.createStorageAccount(
      project,
      storageAccountName,
      resourceGroupName,
      location,
    );
    if (!saResult) return false;

    const bcResult = await AzureTerraformBackend.createBlobContainer(
      project,
      storageAccountName,
      containerName,
      resourceGroupName,
    );
    if (!bcResult) return false;

    return true;
  }

  static async delete(
    project: BaseProject,
    projectName: string,
    _location: string,
    _clientId: string,
    _clientSecret: string,
    _tenantId: string,
    _subscriptionId: string,
  ): Promise<boolean> {
    const resourceGroupName = `${projectName}-rg`;

    // Check if Azure CLI is logged in
    if (!checkAzureLogin()) {
      AppLogger.error(
        "Azure CLI is not logged in. Please run 'az login' to authenticate.",
        true,
      );
      return false;
    }

    await AzureTerraformBackend.deleteResourceGroup(project, resourceGroupName);

    return true;
  }

  static async createResourceGroup(
    project: BaseProject,
    resourceGroupName: string,
    location: string,
  ): Promise<boolean> {
    try {
      AppLogger.info(
        `Checking if resource group ${resourceGroupName} exists...`,
        true,
      );

      // Check if resource group exists
      try {
        execSync(`az group show --name "${resourceGroupName}"`, {
          stdio: 'pipe',
        });
        AppLogger.info(`Resource group ${resourceGroupName} already exists.`);
        return true;
      } catch (_error) {
        // Resource group doesn't exist, create it
        AppLogger.info(
          `Resource group ${resourceGroupName} does not exist. Creating...`,
        );

        const createCommand = `az group create --name "${resourceGroupName}" --location "${location}" --output table`;
        const result = await azExecAsync(createCommand, {
          timeout: 180000, // 3 minutes timeout for resource group creation
        });

        AppLogger.info(
          `Resource group ${resourceGroupName} created successfully`,
          true,
        );
        AppLogger.debug(result);
        return true;
      }
    } catch (err) {
      AppLogger.error(
        `Error creating resource group ${resourceGroupName}: ${err}`,
        true,
      );
      return false;
    }
  }

  static async createStorageAccount(
    project: BaseProject,
    storageAccountName: string,
    resourceGroupName: string,
    location: string,
  ): Promise<boolean> {
    try {
      AppLogger.info(
        `Checking if storage account ${storageAccountName} exists...`,
      );

      // Check if storage account exists
      try {
        execSync(
          `az storage account show --name "${storageAccountName}" --resource-group "${resourceGroupName}"`,
          { stdio: 'pipe' },
        );
        AppLogger.info(
          `Storage account ${storageAccountName} already exists.`,
          true,
        );
        return true;
      } catch (_error) {
        // Storage account doesn't exist, create it
        AppLogger.info(
          `Storage account ${storageAccountName} does not exist. Creating...`,
        );

        const createCommand = `az storage account create --name "${storageAccountName}" --resource-group "${resourceGroupName}" --location "${location}" --sku Standard_LRS --output table`;
        await azExecAsync(createCommand, {
          timeout: 240000, // 4 minutes timeout for storage account creation
        });

        AppLogger.info(
          `Storage account ${storageAccountName} created successfully`,
          true,
        );
        return true;
      }
    } catch (err) {
      AppLogger.error(
        `Error creating storage account ${storageAccountName}: ${err}`,
        true,
      );
      return false;
    }
  }

  static async createBlobContainer(
    project: BaseProject,
    storageAccountName: string,
    containerName: string,
    resourceGroupName: string,
  ): Promise<boolean> {
    try {
      AppLogger.info(
        `Retrieving storage account key for ${storageAccountName}...`,
      );

      // Get storage account key
      const keyCommand = `az storage account keys list --resource-group "${resourceGroupName}" --account-name "${storageAccountName}" --query '[0].value' --output tsv`;
      const storageKey = execSync(keyCommand, { encoding: 'utf8' }).trim();

      AppLogger.info(`Checking if container ${containerName} exists...`);

      // Check if container exists
      try {
        execSync(
          `az storage container show --name "${containerName}" --account-name "${storageAccountName}" --account-key "${storageKey}"`,
          { stdio: 'pipe' },
        );
        AppLogger.info(`Container ${containerName} already exists.`);
        return true;
      } catch (_error) {
        // Container doesn't exist, create it
        AppLogger.info(
          `Container ${containerName} does not exist. Creating...`,
        );

        const createCommand = `az storage container create --name "${containerName}" --account-name "${storageAccountName}" --account-key "${storageKey}" --output table`;
        const result = execSync(createCommand, { encoding: 'utf8' });

        AppLogger.info(`Container ${containerName} created successfully`);
        AppLogger.debug(result);
        return true;
      }
    } catch (err) {
      AppLogger.error(
        `Error creating blob container ${containerName}: ${err}`,
        true,
      );
      return false;
    }
  }

  static async deleteResourceGroup(
    project: BaseProject,
    resourceGroupName: string,
  ): Promise<boolean> {
    try {
      AppLogger.info(
        `Checking if resource group ${resourceGroupName} exists...`,
      );

      // Check if resource group exists
      try {
        execSync(`az group show --name "${resourceGroupName}"`, {
          stdio: 'pipe',
        });

        // If the above doesn't throw, the resource group exists
        AppLogger.info(
          `Resource group ${resourceGroupName} found. Deleting...`,
          true,
        );

        // Use azExecAsync with streaming output and extended timeout
        // az group delete is the slowest Azure operation, can take several minutes
        await azExecAsync(
          `az group delete --name "${resourceGroupName}" --yes`,
          {
            timeout: 300000, // 5 minutes timeout for resource group deletion
            stdio: 'inherit', // Stream progress to console
          },
        );

        // Verify deletion completed
        try {
          execSync(`az group show --name "${resourceGroupName}"`, {
            stdio: 'pipe',
          });
          AppLogger.error(
            `Resource group ${resourceGroupName} still exists after deletion command.`,
            true,
          );
          return false;
        } catch {
          AppLogger.info(
            `Resource group ${resourceGroupName} successfully deleted.`,
            true,
          );
          return true;
        }
      } catch {
        AppLogger.info(
          `Resource group ${resourceGroupName} does not exist or already deleted.`,
          true,
        );
        return true;
      }
    } catch (err) {
      AppLogger.error(
        `Error deleting resource group ${resourceGroupName}: ${err}`,
        true,
      );
      return false;
    }
  }

  // Helper method to get storage account key
  static getStorageAccountKey(
    storageAccountName: string,
    resourceGroupName: string,
  ): string | null {
    try {
      const keyCommand = `az storage account keys list --resource-group "${resourceGroupName}" --account-name "${storageAccountName}" --query '[0].value' --output tsv`;
      return execSync(keyCommand, { encoding: 'utf8' }).trim();
    } catch (_error) {
      AppLogger.error(
        `Failed to retrieve storage account key for ${storageAccountName}`,
        true,
      );
      return null;
    }
  }
}
