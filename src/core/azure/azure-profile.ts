import BaseProject from '../base-project.js';
import { AppLogger } from '../../logger/appLogger.js';
import { execSync } from 'child_process';
import os from 'os';
import fs from 'fs';
import path from 'path';
import {
  checkAzureLogin,
  displayCurrentAccount,
  getCurrentSubscriptionId,
  getCurrentTenantId,
  listSubscriptions,
  getAccountInfo,
  loginWithServicePrincipal,
  logout,
} from '../utils/azure-utils.js';
import { AzureProfileEntry } from '../interface.js';

export default class AzureProfile {
  static async create(
    project: BaseProject,
    location: string,
    clientId: string,
    clientSecret: string,
    tenantId: string,
    subscriptionId: string,
  ): Promise<boolean> {
    try {
      AppLogger.info('Setting up Azure CLI profile', true);

      if (!checkAzureLogin()) {
        AppLogger.error(
          "Azure CLI is not logged in. Please run 'az login' to authenticate.",
          true,
        );
        return false;
      }

      displayCurrentAccount();

      await AzureProfile.setActiveSubscription(subscriptionId);

      if (location) {
        await AzureProfile.setDefaultLocation(location);
      }

      AppLogger.info('Azure CLI profile configured successfully', true);
      return true;
    } catch (error) {
      AppLogger.error(`Error setting up Azure profile: ${error}`, true);
      return false;
    }
  }

  static async delete(
    _project: BaseProject,
    _location: string,
    _clientId: string,
    _clientSecret: string,
    _tenantId: string,
    _subscriptionId: string,
  ): Promise<boolean> {
    try {
      AppLogger.info('Cleaning up Azure CLI profile', true);

      if (!checkAzureLogin()) {
        AppLogger.info(
          'Azure CLI is not logged in, no profile cleanup needed',
          true,
        );
        return true;
      }

      AppLogger.info('Azure CLI profile cleaned up successfully', true);
      return true;
    } catch (error) {
      AppLogger.error(`Error cleaning up Azure profile: ${error}`, true);
      return false;
    }
  }

  // Delegate to shared utils
  static checkAzureLogin = checkAzureLogin;
  static displayCurrentAccount = displayCurrentAccount;
  static getCurrentSubscriptionId = getCurrentSubscriptionId;
  static getCurrentTenantId = getCurrentTenantId;
  static listSubscriptions = listSubscriptions;
  static getAccountInfo = getAccountInfo;
  static loginWithServicePrincipal = loginWithServicePrincipal;
  static logout = logout;

  static async setActiveSubscription(subscriptionId: string): Promise<boolean> {
    try {
      AppLogger.info(
        `Setting subscription ${subscriptionId} as active...`,
        true,
      );

      execSync(`az account set --subscription "${subscriptionId}"`, {
        encoding: 'utf8',
      });

      const currentSub = execSync('az account show --query "id" --output tsv', {
        encoding: 'utf8',
      }).trim();

      if (currentSub === subscriptionId) {
        AppLogger.info(
          `Successfully set subscription ${subscriptionId} as active`,
          true,
        );
        return true;
      } else {
        AppLogger.error(
          `Failed to set subscription ${subscriptionId} as active. Current: ${currentSub}`,
          true,
        );
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
      execSync(`az configure --defaults location="${location}"`, {
        encoding: 'utf8',
      });
      AppLogger.info(`Successfully set default location to ${location}`, true);
      return true;
    } catch (error) {
      AppLogger.error(`Error setting default location: ${error}`, true);
      return false;
    }
  }

  static async loginInteractive(): Promise<boolean> {
    try {
      AppLogger.info('Starting interactive Azure login...', true);
      execSync('az login', { stdio: 'inherit' });
      AppLogger.info('Successfully logged in to Azure', true);
      return true;
    } catch (error) {
      AppLogger.error(`Failed to login interactively: ${error}`, true);
      return false;
    }
  }

  static async validateCredentials(
    clientId: string,
    clientSecret: string,
    tenantId: string,
    subscriptionId: string,
  ): Promise<boolean> {
    try {
      AppLogger.info('Validating Azure credentials...', true);

      const loginSuccess = await loginWithServicePrincipal(
        clientId,
        clientSecret,
        tenantId,
      );
      if (!loginSuccess) {
        return false;
      }

      try {
        execSync(`az account show --subscription "${subscriptionId}"`, {
          stdio: 'pipe',
        });
        AppLogger.info('Azure credentials validated successfully', true);
        return true;
      } catch (_error) {
        AppLogger.error(
          `Subscription ${subscriptionId} is not accessible`,
          true,
        );
        return false;
      }
    } catch (_error) {
      AppLogger.error(`Error validating credentials: ${_error}`, true);
      return false;
    }
  }

  static async getDefaultLocation(): Promise<string | null> {
    try {
      const configJson = execSync(
        'az configure --list-defaults --output json',
        { encoding: 'utf8' },
      );
      const config = JSON.parse(configJson);

      const locationConfig = config.find(
        (item: any) => item.name === 'location',
      );
      return locationConfig ? locationConfig.value : null;
    } catch (_error) {
      AppLogger.error('Failed to get default location', true);
      return null;
    }
  }

  static async clearDefaultLocation(): Promise<boolean> {
    try {
      AppLogger.info('Clearing default location...', true);

      execSync('az configure --defaults location=""', { encoding: 'utf8' });

      AppLogger.info('Successfully cleared default location', true);
      return true;
    } catch (error) {
      AppLogger.error(`Error clearing default location: ${error}`, true);
      return false;
    }
  }

  static isAzureCLIInstalled(): boolean {
    try {
      execSync('az --version', { stdio: 'pipe' });
      return true;
    } catch (_error) {
      return false;
    }
  }

  static getAzureCLIVersion(): string | null {
    try {
      const version = execSync('az --version', { encoding: 'utf8' });
      return version.split('\n')[0];
    } catch (_error) {
      AppLogger.error('Failed to get Azure CLI version', true);
      return null;
    }
  }

  static getProfiles(): AzureProfileEntry[] {
    const azureConfigPath = path.join(os.homedir(), '.azure');
    const profilesFilePath = path.join(azureConfigPath, 'profiles.json');

    AppLogger.debug(`Getting Azure profiles from ${profilesFilePath}`);

    if (fs.existsSync(profilesFilePath)) {
      try {
        const profilesContent = fs.readFileSync(profilesFilePath, 'utf8');
        return JSON.parse(profilesContent);
      } catch (error) {
        AppLogger.error(`Error reading Azure profiles: ${error}`, true);
        return [];
      }
    }

    try {
      const subscriptions = execSync(
        'az account list --query "[].{profileName:name, subscriptionId:id, tenantId:tenantId, state:state}" --output json',
        { encoding: 'utf8' },
      );
      const subs = JSON.parse(subscriptions);

      return subs.map((sub: any) => ({
        profileName: sub.profileName,
        subscriptionId: sub.subscriptionId,
        tenantId: sub.tenantId,
        state: sub.state,
        clientId: '',
        clientSecret: '',
      }));
    } catch (_error) {
      AppLogger.debug(
        'Could not retrieve Azure CLI account list, returning empty profiles',
        true,
      );
      return [];
    }
  }

  static addProfile(
    profileName: string,
    clientId: string,
    clientSecret: string,
    tenantId: string,
    subscriptionId: string,
  ): void {
    const azureConfigPath = path.join(os.homedir(), '.azure');
    const profilesFilePath = path.join(azureConfigPath, 'profiles.json');

    AppLogger.debug(
      `Adding Azure profile ${profileName} to ${profilesFilePath}`,
    );

    if (!fs.existsSync(azureConfigPath)) {
      fs.mkdirSync(azureConfigPath, { recursive: true });
    }

    let profiles: AzureProfileEntry[] = [];
    if (fs.existsSync(profilesFilePath)) {
      try {
        const profilesContent = fs.readFileSync(profilesFilePath, 'utf8');
        profiles = JSON.parse(profilesContent);
      } catch (error) {
        AppLogger.warn(
          `Error reading existing profiles, creating new file: ${error}`,
          true,
        );
        profiles = [];
      }
    }

    const existingProfileIndex = profiles.findIndex(
      (p: any) => p.profileName === profileName,
    );
    // Note: Do NOT persist clientSecret to disk to avoid credential exposure.
    // The clientSecret must be provided securely at runtime instead.
    const newProfile = {
      profileName,
      clientId,
      tenantId,
      subscriptionId,
    };

    if (existingProfileIndex >= 0) {
      profiles[existingProfileIndex] = newProfile;
      AppLogger.debug(`Updated existing Azure profile: ${profileName}`, true);
    } else {
      profiles.push(newProfile);
      AppLogger.debug(`Added new Azure profile: ${profileName}`, true);
    }

    try {
      fs.writeFileSync(profilesFilePath, JSON.stringify(profiles, null, 2));
      AppLogger.debug(
        `Successfully saved Azure profiles to ${profilesFilePath}`,
        true,
      );
    } catch (error) {
      AppLogger.error(`Error saving Azure profiles: ${error}`, true);
    }
  }
}
