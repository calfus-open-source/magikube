import BaseProject from '../base-project.js';
import { AppLogger } from '../../logger/appLogger.js';
import { execSync } from 'child_process';
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

export default class AzureAccount {
  static async create(
    project: BaseProject,
    location: string,
    clientId: string,
    clientSecret: string,
    tenantId: string,
    subscriptionId: string,
  ): Promise<boolean> {
    try {
      AppLogger.info('Setting up Azure account configuration', true);

      if (!checkAzureLogin()) {
        AppLogger.error(
          "Azure CLI is not logged in. Please run 'az login' to authenticate.",
          true,
        );
        return false;
      }

      displayCurrentAccount();

      const isValidSubscription =
        await AzureAccount.validateSubscription(subscriptionId);
      if (!isValidSubscription) {
        AppLogger.error(
          `Subscription ${subscriptionId} is not accessible or does not exist.`,
          true,
        );
        return false;
      }

      await AzureAccount.setActiveSubscription(subscriptionId);

      AppLogger.info(
        'Azure account configuration completed successfully',
        true,
      );
      return true;
    } catch (error) {
      AppLogger.error(`Error setting up Azure account: ${error}`, true);
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
      AppLogger.info('Cleaning up Azure account configuration', true);

      if (!checkAzureLogin()) {
        AppLogger.error(
          "Azure CLI is not logged in. Please run 'az login' to authenticate.",
          true,
        );
        return false;
      }

      AppLogger.info(
        'Azure account configuration cleaned up successfully',
        true,
      );
      return true;
    } catch (error) {
      AppLogger.error(`Error cleaning up Azure account: ${error}`, true);
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

  static async validateSubscription(subscriptionId: string): Promise<boolean> {
    try {
      AppLogger.info(`Validating subscription ${subscriptionId}...`, true);

      const subscriptionInfo = execSync(
        `az account show --subscription "${subscriptionId}" --query "{Name:name, State:state}" --output json`,
        { encoding: 'utf8' },
      );
      const subscription = JSON.parse(subscriptionInfo);

      if (subscription.State !== 'Enabled') {
        AppLogger.error(
          `Subscription ${subscriptionId} is not enabled. Current state: ${subscription.State}`,
          true,
        );
        return false;
      }

      AppLogger.info(
        `Subscription ${subscriptionId} (${subscription.Name}) is valid and enabled`,
        true,
      );
      return true;
    } catch (error) {
      AppLogger.error(
        `Failed to validate subscription ${subscriptionId}: ${error}`,
        true,
      );
      return false;
    }
  }

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

  static async isSubscriptionAccessible(
    subscriptionId: string,
  ): Promise<boolean> {
    try {
      execSync(`az account show --subscription "${subscriptionId}"`, {
        stdio: 'pipe',
      });
      return true;
    } catch (_error) {
      return false;
    }
  }

  static async getSubscriptionId(
    clientId: string,
    clientSecret: string,
    tenantId: string,
  ): Promise<string | undefined> {
    try {
      AppLogger.info(
        'Getting subscription ID using service principal credentials...',
        true,
      );

      const isLoggedIn = checkAzureLogin();
      if (!isLoggedIn) {
        const loginSuccess = await loginWithServicePrincipal(
          clientId,
          clientSecret,
          tenantId,
        );
        if (!loginSuccess) {
          AppLogger.error(
            'Failed to authenticate with Azure using service principal',
            true,
          );
          return undefined;
        }
      }

      const subscriptionId = getCurrentSubscriptionId();
      if (!subscriptionId) {
        AppLogger.error(
          'Failed to retrieve subscription ID from Azure CLI',
          true,
        );
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
