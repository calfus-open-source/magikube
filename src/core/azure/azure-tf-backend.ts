// Create Azure Storage Account and Blob Container for storing terraform state
// Create a new Storage Account in the Azure resource group to store the terraform state. The storage account name should be unique globally.

import BaseProject from "../base-project.js";
import { AppLogger } from "../../logger/appLogger.js";
import { execSync } from 'child_process';
import { executeCommandWithRetry } from "../utils/executeCommandWithRetry-utils.js";

export default class AzureTerraformBackend {
  static async create(
    project: BaseProject,
    projectName: string,
    location: string,
    clientId: string,
    clientSecret: string,
    tenantId: string,
    subscriptionId: string
  ): Promise<boolean> {
    const storageAccountName = `${projectName.replace(
      /-/g,
      ""
    )}tfstate`.toLowerCase();
    const resourceGroupName = `${projectName}-rg`;
    const containerName = "tfstate";

    // Check if Azure CLI is logged in
    if (!AzureTerraformBackend.checkAzureLogin()) {
      AppLogger.error(
        "Azure CLI is not logged in. Please run 'az login' to authenticate.",
        true
      );
      return false;
    }

    await AzureTerraformBackend.createResourceGroup(
      project,
      resourceGroupName,
      location,
      clientId,
      clientSecret,
      tenantId,
      subscriptionId
    );

    await AzureTerraformBackend.createStorageAccount(
      project,
      storageAccountName,
      resourceGroupName,
      location,
      clientId,
      clientSecret,
      tenantId,
      subscriptionId
    );

    await AzureTerraformBackend.createBlobContainer(
      project,
      storageAccountName,
      containerName,
      resourceGroupName,
      clientId,
      clientSecret,
      tenantId,
      subscriptionId
    );

    return true;
  }

  static async delete(
    project: BaseProject,
    projectName: string,
    location: string,
    clientId: string,
    clientSecret: string,
    tenantId: string,
    subscriptionId: string
  ): Promise<boolean> {
    const resourceGroupName = `${projectName}-rg`;

    // Check if Azure CLI is logged in
    if (!AzureTerraformBackend.checkAzureLogin()) {
      AppLogger.error(
        "Azure CLI is not logged in. Please run 'az login' to authenticate.",
        true
      );
      return false;
    }

    await AzureTerraformBackend.deleteResourceGroup(
      project,
      resourceGroupName,
      clientId,
      clientSecret,
      tenantId,
      subscriptionId
    );

    return true;
  }

  static checkAzureLogin(): boolean {
    try {
      execSync("az account show", { stdio: "pipe" });
      return true;
    } catch (error) {
      return false;
    }
  }

  static displayCurrentAccount(): void {
    try {
      const accountInfo = execSync(
        'az account show --query "{Name:name, SubscriptionId:id, TenantId:tenantId}" --output table',
        { encoding: "utf8" }
      );
      AppLogger.info("Currently logged in account details:", true);
      AppLogger.info(accountInfo, true);
    } catch (error) {
      AppLogger.error("Failed to get current account details", true);
    }
  }

  static async createResourceGroup(
    project: BaseProject,
    resourceGroupName: string,
    location: string,
    clientId: string,
    clientSecret: string,
    tenantId: string,
    subscriptionId: string
  ): Promise<boolean> {
    try {
      AppLogger.info(
        `Checking if resource group ${resourceGroupName} exists...`,
        true
      );

      // Check if resource group exists
      try {
        execSync(`az group show --name "${resourceGroupName}"`, {
          stdio: "pipe",
        });
        AppLogger.info(`Resource group ${resourceGroupName} already exists.`);
        return true;
      } catch (error) {
        // Resource group doesn't exist, create it
        AppLogger.info(
          `Resource group ${resourceGroupName} does not exist. Creating...`
        );

        const createCommand = `az group create --name "${resourceGroupName}" --location "${location}" --output table`;
        const result = execSync(createCommand, { encoding: "utf8" });

        AppLogger.info(
          `Resource group ${resourceGroupName} created successfully`,
          true
        );
        AppLogger.debug(result, true);
        return true;
      }
    } catch (err) {
      AppLogger.error(
        `Error creating resource group ${resourceGroupName}: ${err}`,
        true
      );
      return false;
    }
  }

  static async createStorageAccount(
    project: BaseProject,
    storageAccountName: string,
    resourceGroupName: string,
    location: string,
    clientId: string,
    clientSecret: string,
    tenantId: string,
    subscriptionId: string
  ): Promise<boolean> {
    try {
      AppLogger.info(
        `Checking if storage account ${storageAccountName} exists...`,
        true
      );

      // Check if storage account exists
      try {
        execSync(
          `az storage account show --name "${storageAccountName}" --resource-group "${resourceGroupName}"`,
          { stdio: "pipe" }
        );
        AppLogger.info(
          `Storage account ${storageAccountName} already exists.`,
          true
        );
        return true;
      } catch (error) {
        // Storage account doesn't exist, create it
        AppLogger.info(
          `Storage account ${storageAccountName} does not exist. Creating...`,
          true
        );

        const createCommand = `az storage account create --name "${storageAccountName}" --resource-group "${resourceGroupName}" --location "${location}" --sku Standard_LRS --output table`;
        const result = execSync(createCommand, { encoding: "utf8" });

        AppLogger.info(
          `Storage account ${storageAccountName} created successfully`,
          true
        );
        return true;
      }
    } catch (err) {
      AppLogger.error(
        `Error creating storage account ${storageAccountName}: ${err}`,
        true
      );
      return false;
    }
  }

  static async createBlobContainer(
    project: BaseProject,
    storageAccountName: string,
    containerName: string,
    resourceGroupName: string,
    clientId: string,
    clientSecret: string,
    tenantId: string,
    subscriptionId: string
  ): Promise<boolean> {
    try {
      AppLogger.info(
        `Retrieving storage account key for ${storageAccountName}...`
      );

      // Get storage account key
      const keyCommand = `az storage account keys list --resource-group "${resourceGroupName}" --account-name "${storageAccountName}" --query '[0].value' --output tsv`;
      const storageKey = execSync(keyCommand, { encoding: "utf8" }).trim();

      AppLogger.info(`Checking if container ${containerName} exists...`);

      // Check if container exists
      try {
        execSync(
          `az storage container show --name "${containerName}" --account-name "${storageAccountName}" --account-key "${storageKey}"`,
          { stdio: "pipe" }
        );
        AppLogger.info(`Container ${containerName} already exists.`);
        return true;
      } catch (error) {
        // Container doesn't exist, create it
        AppLogger.info(
          `Container ${containerName} does not exist. Creating...`
        );

        const createCommand = `az storage container create --name "${containerName}" --account-name "${storageAccountName}" --account-key "${storageKey}" --output table`;
        const result = execSync(createCommand, { encoding: "utf8" });

        AppLogger.info(`Container ${containerName} created successfully`);
        AppLogger.debug(result);
        return true;
      }
    } catch (err) {
      AppLogger.error(
        `Error creating blob container ${containerName}: ${err}`,
        true
      );
      return false;
    }
  }

  // static async deleteResourceGroup(
  //   project: BaseProject,
  //   resourceGroupName: string,
  //   clientId: string,
  //   clientSecret: string,
  //   tenantId: string,
  //   subscriptionId: string
  // ): Promise<boolean> {

  //   try {
  //     AppLogger.info(`Checking if resource group ${resourceGroupName} exists...`);

  //     // Check if resource group exists
  //     try {
  //       execSync(`az group show --name "${resourceGroupName}"`, { stdio: 'pipe' });

  //       // Resource group exists, delete it
  //       AppLogger.info(`Deleting resource group ${resourceGroupName}...`, true);
  //        await executeCommandWithRetry(
  //          `az group delete --name "${resourceGroupName}" --yes --no-wait`,
  //          { cwd: process.cwd() },
  //          1
  //        );
  //       AppLogger.info(`Resource group ${resourceGroupName} deleted successfully`, true);
  //       return true;
  //     } catch (error) {
  //       AppLogger.info(`Resource group ${resourceGroupName} does not exist or already deleted.`, true);
  //       return true;
  //     }
  //   } catch (err) {
  //     AppLogger.error(`Error deleting resource group ${resourceGroupName}: ${err}`, true);
  //     return false;
  //   }
  // }

  static async deleteResourceGroup(
    project: BaseProject,
    resourceGroupName: string,
    clientId: string,
    clientSecret: string,
    tenantId: string,
    subscriptionId: string
  ): Promise<boolean> {
    try {
      AppLogger.info(
        `Checking if resource group ${resourceGroupName} exists...`
      );

      // Check if resource group exists
      try {
        execSync(`az group show --name "${resourceGroupName}"`, {
          stdio: "pipe",
        });

        // If the above doesn't throw, the resource group exists
        AppLogger.info(
          `Resource group ${resourceGroupName} found. Deleting...`,
          true
        );

        await executeCommandWithRetry(
          `az group delete --name "${resourceGroupName}" --yes`,
          { cwd: process.cwd(), stdio: "inherit" },
          1
        );

        // Poll until the resource group is fully deleted
        const maxRetries = 20;
        const delayMs = 10000; // 10 seconds
        let retryCount = 0;

        while (retryCount < maxRetries) {
          try {
            execSync(`az group show --name "${resourceGroupName}"`, {
              stdio: "pipe",
            });
            AppLogger.info(
              `Waiting for resource group ${resourceGroupName} to be deleted...`,
              true
            );
            await new Promise((res) => setTimeout(res, delayMs));
            retryCount++;
          } catch {
            AppLogger.info(
              `Resource group ${resourceGroupName} successfully deleted.`,
              true
            );
            return true;
          }
        }

        AppLogger.error(
          `Timed out waiting for resource group ${resourceGroupName} to delete.`,
          true
        );
        return false;
      } catch {
        AppLogger.info(
          `Resource group ${resourceGroupName} does not exist or already deleted.`,
          true
        );
        return true;
      }
    } catch (err) {
      AppLogger.error(
        `Error deleting resource group ${resourceGroupName}: ${err}`,
        true
      );
      return false;
    }
  }

  // Helper method to get storage account key
  static getStorageAccountKey(
    storageAccountName: string,
    resourceGroupName: string
  ): string | null {
    try {
      const keyCommand = `az storage account keys list --resource-group "${resourceGroupName}" --account-name "${storageAccountName}" --query '[0].value' --output tsv`;
      return execSync(keyCommand, { encoding: "utf8" }).trim();
    } catch (error) {
      AppLogger.error(
        `Failed to retrieve storage account key for ${storageAccountName}`,
        true
      );
      return null;
    }
  }

  // Helper method to generate backend configuration
  static generateBackendConfig(projectId: string, location: string): string {
    const storageAccountName = `${projectId.replace(
      /-/g,
      ""
    )}tfstate`.toLowerCase();
    const resourceGroupName = `${projectId}-rg`;
    const containerName = "tfstate";

    return `
terraform {
  backend "azurerm" {
    resource_group_name  = "${resourceGroupName}"
    storage_account_name = "${storageAccountName}"
    container_name       = "${containerName}"
    key                  = "terraform.tfstate"
  }
}
`;
  }
} 