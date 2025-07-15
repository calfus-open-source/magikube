import BaseProject from "../base-project.js";
import { AppLogger } from "../../logger/appLogger.js";
import { execSync } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';

export default class AzureProfile {
  static async create(
    project: BaseProject,
    location: string,
    clientId: string,
    clientSecret: string,
    tenantId: string,
    subscriptionId: string
  ): Promise<boolean> {
    
    try {
      AppLogger.info("Setting up Azure CLI profile", true);
      
      // Check if Azure CLI is logged in
      if (!AzureProfile.checkAzureLogin()) {
        AppLogger.error("Azure CLI is not logged in. Please run 'az login' to authenticate.", true);
        return false;
      }

      // Display current account
      AzureProfile.displayCurrentAccount();
      
      // Set the subscription as active
      await AzureProfile.setActiveSubscription(subscriptionId);
      
      // Configure default location if provided
      if (location) {
        await AzureProfile.setDefaultLocation(location);
      }
      
      AppLogger.info("Azure CLI profile configured successfully", true);
      return true;
    } catch (error) {
      AppLogger.error(`Error setting up Azure profile: ${error}`, true);
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
      AppLogger.info("Cleaning up Azure CLI profile", true);
      
      // Check if Azure CLI is logged in
      if (!AzureProfile.checkAzureLogin()) {
        AppLogger.info("Azure CLI is not logged in, no profile cleanup needed", true);
        return true;
      }

      // Reset to default configuration if needed
      // Note: We don't logout here as it might affect other projects
      
      AppLogger.info("Azure CLI profile cleaned up successfully", true);
      return true;
    } catch (error) {
      AppLogger.error(`Error cleaning up Azure profile: ${error}`, true);
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
      AppLogger.info(accountInfo);
    } catch (error) {
      AppLogger.error("Failed to get current account details", true);
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

  static async setDefaultLocation(location: string): Promise<boolean> {
    try {
      AppLogger.info(`Setting default location to ${location}...`, true);  
      execSync(`az configure --defaults location="${location}"`, { encoding: 'utf8' });  
      AppLogger.info(`Successfully set default location to ${location}`, true);
      return true;
    } catch (error) {
      AppLogger.error(`Error setting default location: ${error}`, true);
      return false;
    }
  }

  static async loginInteractive(): Promise<boolean> {
    try {
      AppLogger.info("Starting interactive Azure login...", true);
      execSync('az login', { stdio: 'inherit' });
      AppLogger.info("Successfully logged in to Azure", true);
      return true;
    } catch (error) {
      AppLogger.error(`Failed to login interactively: ${error}`, true);
      return false;
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

  static async listSubscriptions(): Promise<any[]> {
    try {
      const subscriptionsJson = execSync('az account list --query "[].{Name:name, SubscriptionId:id, TenantId:tenantId, State:state}" --output json', { encoding: 'utf8' });
      return JSON.parse(subscriptionsJson);
    } catch (error) {
      AppLogger.error(`Error listing subscriptions: ${error}`, true);
      return [];
    }
  }

  static getAccountInfo(): any | null {
    try {
      const accountJson = execSync('az account show --output json', { encoding: 'utf8' });
      return JSON.parse(accountJson);
    } catch (error) {
      AppLogger.error("Failed to get account information", true);
      return null;
    }
  }

  static async validateCredentials(
    clientId: string,
    clientSecret: string,
    tenantId: string,
    subscriptionId: string
  ): Promise<boolean> {
    try {
      AppLogger.info("Validating Azure credentials...", true);
      
      // Try to login with service principal
      const loginSuccess = await AzureProfile.loginWithServicePrincipal(clientId, clientSecret, tenantId);
      if (!loginSuccess) {
        return false;
      }

      // Verify subscription access
      try {
        execSync(`az account show --subscription "${subscriptionId}"`, { stdio: 'pipe' });
        AppLogger.info("Azure credentials validated successfully", true);
        return true;
      } catch (error) {
        AppLogger.error(`Subscription ${subscriptionId} is not accessible`, true);
        return false;
      }
    } catch (error) {
      AppLogger.error(`Error validating credentials: ${error}`, true);
      return false;
    }
  }

  static async getDefaultLocation(): Promise<string | null> {
    try {
      const configJson = execSync('az configure --list-defaults --output json', { encoding: 'utf8' });
      const config = JSON.parse(configJson);
      
      const locationConfig = config.find((item: any) => item.name === 'location');
      return locationConfig ? locationConfig.value : null;
    } catch (error) {
      AppLogger.error("Failed to get default location", true);
      return null;
    }
  }

  static async clearDefaultLocation(): Promise<boolean> {
    try {
      AppLogger.info("Clearing default location...", true);
      
      execSync('az configure --defaults location=""', { encoding: 'utf8' });
      
      AppLogger.info("Successfully cleared default location", true);
      return true;
    } catch (error) {
      AppLogger.error(`Error clearing default location: ${error}`, true);
      return false;
    }
  }

  // Helper method to check if Azure CLI is installed
  static isAzureCLIInstalled(): boolean {
    try {
      execSync('az --version', { stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
  }

  // Helper method to get Azure CLI version
  static getAzureCLIVersion(): string | null {
    try {
      const version = execSync('az --version', { encoding: 'utf8' });
      return version.split('\n')[0];
    } catch (error) {
      AppLogger.error("Failed to get Azure CLI version", true);
      return null;
    }
  }

  static getProfiles(): any[] {
    const azureConfigPath = path.join(os.homedir(), '.azure');
    const profilesFilePath = path.join(azureConfigPath, 'profiles.json');
    
    AppLogger.debug(`Getting Azure profiles from ${profilesFilePath}`);

    // If the custom profiles file exists, read from it
    if (fs.existsSync(profilesFilePath)) {
      try {
        const profilesContent = fs.readFileSync(profilesFilePath, 'utf8');
        return JSON.parse(profilesContent);
      } catch (error) {
        AppLogger.error(`Error reading Azure profiles: ${error}`, true);
        return [];
      }
    }

    // If no custom profiles file, try to get profiles from Azure CLI
    try {
      const subscriptions = execSync('az account list --query "[].{profileName:name, subscriptionId:id, tenantId:tenantId, state:state}" --output json', { encoding: 'utf8' });
      const subs = JSON.parse(subscriptions);
      
      // Convert Azure subscriptions to profile format for consistency
      return subs.map((sub: any) => ({
        profileName: sub.profileName,
        subscriptionId: sub.subscriptionId,
        tenantId: sub.tenantId,
        state: sub.state,
        clientId: '', // These would need to be set when adding custom profiles
        clientSecret: ''
      }));
    } catch (error) {
      AppLogger.debug("Could not retrieve Azure CLI account list, returning empty profiles", true);
      return [];
    }
  }

  static addProfile(profileName: string, clientId: string, clientSecret: string, tenantId: string, subscriptionId: string): void {
    const azureConfigPath = path.join(os.homedir(), '.azure');
    const profilesFilePath = path.join(azureConfigPath, 'profiles.json');
    
    AppLogger.debug(`Adding Azure profile ${profileName} to ${profilesFilePath}`);
    
    // Create the .azure directory if it doesn't exist
    if (!fs.existsSync(azureConfigPath)) {
      fs.mkdirSync(azureConfigPath, { recursive: true });
    }

    // Read existing profiles or create empty array
    let profiles: any[] = [];
    if (fs.existsSync(profilesFilePath)) {
      try {
        const profilesContent = fs.readFileSync(profilesFilePath, 'utf8');
        profiles = JSON.parse(profilesContent);
      } catch (error) {
        AppLogger.warn(`Error reading existing profiles, creating new file: ${error}`, true);
        profiles = [];
      }
    }

    // Check if profile already exists and update it, otherwise add new one
    const existingProfileIndex = profiles.findIndex((p: any) => p.profileName === profileName);
    const newProfile = {
      profileName,
      clientId,
      clientSecret,
      tenantId,
      subscriptionId
    };

    if (existingProfileIndex >= 0) {
      profiles[existingProfileIndex] = newProfile;
      AppLogger.debug(`Updated existing Azure profile: ${profileName}`, true);
    } else {
      profiles.push(newProfile);
      AppLogger.debug(`Added new Azure profile: ${profileName}`, true);
    }

    // Write the updated profiles back to file
    try {
      fs.writeFileSync(profilesFilePath, JSON.stringify(profiles, null, 2));
      AppLogger.debug(`Successfully saved Azure profiles to ${profilesFilePath}`, true);
    } catch (error) {
      AppLogger.error(`Error saving Azure profiles: ${error}`, true);
    }
  }
} 