import BaseProject from "../base-project.js";
import { AppLogger } from "../../logger/appLogger.js";
import { execSync } from 'child_process';

export default class AzureAccount {
  static async create(
    project: BaseProject,
    location: string,
    clientId: string,
    clientSecret: string,
    tenantId: string,
    subscriptionId: string
  ): Promise<boolean> {
    
    try {
      AppLogger.info("Setting up Azure account configuration", true);
      
      // Check if Azure CLI is logged in
      if (!AzureAccount.checkAzureLogin()) {
        AppLogger.error("Azure CLI is not logged in. Please run 'az login' to authenticate.", true);
        return false;
      }

      // Display current account
      AzureAccount.displayCurrentAccount();
      
      // Verify the subscription is accessible
      const isValidSubscription = await AzureAccount.validateSubscription(subscriptionId);
      if (!isValidSubscription) {
        AppLogger.error(`Subscription ${subscriptionId} is not accessible or does not exist.`, true);
        return false;
      }

      // Set the subscription as active
      await AzureAccount.setActiveSubscription(subscriptionId);
      
      AppLogger.info("Azure account configuration completed successfully", true);
      return true;
    } catch (error) {
      AppLogger.error(`Error setting up Azure account: ${error}`, true);
      return false;
    }
  }

  static async delete(
    project: BaseProject,
    location: string,
    clientId: string,
    clientSecret: string,
    tenantId: string,
    subscriptionId: string
  ): Promise<boolean> {
    
    try {
      AppLogger.info("Cleaning up Azure account configuration", true);
      
      // Check if Azure CLI is logged in
      if (!AzureAccount.checkAzureLogin()) {
        AppLogger.error("Azure CLI is not logged in. Please run 'az login' to authenticate.", true);
        return false;
      }

      // Azure account cleanup is typically handled by resource group deletion
      // No specific account cleanup needed
      
      AppLogger.info("Azure account configuration cleaned up successfully", true);
      return true;
    } catch (error) {
      AppLogger.error(`Error cleaning up Azure account: ${error}`, true);
      return false;
    }
  }

  static checkAzureLogin(): boolean {
    try {
      execSync('az account show', { stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
  }

  static displayCurrentAccount(): void {
    try {
      const accountInfo = execSync('az account show --query "{Name:name, SubscriptionId:id, TenantId:tenantId}" --output table', { encoding: 'utf8' });
      AppLogger.info("Currently logged in account details:", true);
      AppLogger.info(accountInfo, true);
    } catch (error) {
      AppLogger.error("Failed to get current account details", true);
    }
  }

  static async validateSubscription(subscriptionId: string): Promise<boolean> {
    try {
      AppLogger.info(`Validating subscription ${subscriptionId}...`, true);
      
      // Check if the subscription exists and is accessible
      const subscriptionInfo = execSync(`az account show --subscription "${subscriptionId}" --query "{Name:name, State:state}" --output json`, { encoding: 'utf8' });
      const subscription = JSON.parse(subscriptionInfo);
      
      if (subscription.State !== 'Enabled') {
        AppLogger.error(`Subscription ${subscriptionId} is not enabled. Current state: ${subscription.State}`, true);
        return false;
      }
      
      AppLogger.info(`Subscription ${subscriptionId} (${subscription.Name}) is valid and enabled`, true);
      return true;
    } catch (error) {
      AppLogger.error(`Failed to validate subscription ${subscriptionId}: ${error}`, true);
      return false;
    }
  }

  static async setActiveSubscription(subscriptionId: string): Promise<boolean> {
    try {
      AppLogger.info(`Setting subscription ${subscriptionId} as active...`, true);
      
      execSync(`az account set --subscription "${subscriptionId}"`, { encoding: 'utf8' });
      
      // Verify the subscription was set correctly
      const currentSub = execSync('az account show --query "id" --output tsv', { encoding: 'utf8' }).trim();
      
      if (currentSub === subscriptionId) {
        AppLogger.info(`Successfully set subscription ${subscriptionId} as active`, true);
        return true;
      } else {
        AppLogger.error(`Failed to set subscription ${subscriptionId} as active. Current: ${currentSub}`, true);
        return false;
      }
    } catch (error) {
      AppLogger.error(`Error setting active subscription: ${error}`, true);
      return false;
    }
  }

  static async listSubscriptions(): Promise<any[]> {
    try {
      const subscriptionsJson = execSync('az account list --query "[].{Name:name, SubscriptionId:id, TenantId:tenantId, State:state}" --output json', { encoding: 'utf8' });
      return JSON.parse(subscriptionsJson);
    } catch (error) {
      AppLogger.error(`Error listing subscriptions: ${error}`, true);
      return [];
    }
  }

  static getCurrentSubscriptionId(): string | null {
    try {
      const subscriptionId = execSync('az account show --query "id" --output tsv', { encoding: 'utf8' }).trim();
      return subscriptionId;
    } catch (error) {
      AppLogger.error("Failed to get current subscription ID", true);
      return null;
    }
  }

  static getCurrentTenantId(): string | null {
    try {
      const tenantId = execSync('az account show --query "tenantId" --output tsv', { encoding: 'utf8' }).trim();
      return tenantId;
    } catch (error) {
      AppLogger.error("Failed to get current tenant ID", true);
      return null;
    }
  }

  static async loginWithServicePrincipal(
    clientId: string,
    clientSecret: string,
    tenantId: string
  ): Promise<boolean> {
    try {
      AppLogger.info("Logging in with service principal...", true);
      
      const loginCommand = `az login --service-principal --username "${clientId}" --password "${clientSecret}" --tenant "${tenantId}"`;
      execSync(loginCommand, { encoding: 'utf8' });
      
      AppLogger.info("Successfully logged in with service principal", true);
      return true;
    } catch (error) {
      AppLogger.error(`Failed to login with service principal: ${error}`, true);
      return false;
    }
  }

  static async logout(): Promise<boolean> {
    try {
      AppLogger.info("Logging out of Azure CLI...", true);
      
      execSync('az logout', { encoding: 'utf8' });
      
      AppLogger.info("Successfully logged out of Azure CLI", true);
      return true;
    } catch (error) {
      AppLogger.error(`Failed to logout: ${error}`, true);
      return false;
    }
  }

  // Helper method to get account information
  static getAccountInfo(): any | null {
    try {
      const accountInfo = execSync('az account show --query "{Name:name, SubscriptionId:id, TenantId:tenantId}" --output json', { encoding: 'utf8' });
      return JSON.parse(accountInfo);
    } catch (error) {
      AppLogger.error("Failed to get account information", true);
      return null;
    }
  }

  // Helper method to check if a specific subscription is accessible
  static async isSubscriptionAccessible(subscriptionId: string): Promise<boolean> {
    try {
      execSync(`az account show --subscription "${subscriptionId}"`, { stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
  }

  static async getSubscriptionId(clientId: string, clientSecret: string, tenantId: string): Promise<string | undefined> {
    try {
      AppLogger.info("Getting subscription ID using service principal credentials...", true);
      
      // Try to login with service principal if not already authenticated
      const isLoggedIn = AzureAccount.checkAzureLogin();
      if (!isLoggedIn) {
        const loginSuccess = await AzureAccount.loginWithServicePrincipal(clientId, clientSecret, tenantId);
        if (!loginSuccess) {
          AppLogger.error("Failed to authenticate with Azure using service principal", true);
          return undefined;
        }
      }
      
      // Get the current subscription ID
      const subscriptionId = AzureAccount.getCurrentSubscriptionId();
      if (!subscriptionId) {
        AppLogger.error("Failed to retrieve subscription ID from Azure CLI", true);
        return undefined;
      }
      
      AppLogger.info(`Retrieved subscription ID: ${subscriptionId}`, true);
      return subscriptionId;
    } catch (error) {
      AppLogger.error(`Error getting subscription ID: ${error}`, true);
      return undefined;
    }
  }
} 