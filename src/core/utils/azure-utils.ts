import { AppLogger } from '../../logger/appLogger.js';
import { execSync } from 'child_process';
import { AzureSubscriptionInfo, AzureAccountInfo } from '../interface.js';

export function checkAzureLogin(): boolean {
  try {
    execSync('az account show', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

export function displayCurrentAccount(): void {
  try {
    const accountInfo = execSync(
      'az account show --query "{Name:name, SubscriptionId:id, TenantId:tenantId}" --output table',
      { encoding: 'utf8' },
    );
    AppLogger.info('Currently logged in account details:', true);
    AppLogger.info(accountInfo, true);
  } catch (error) {
    AppLogger.error('Failed to get current account details', true);
  }
}

export function getCurrentSubscriptionId(): string | null {
  try {
    const subscriptionId = execSync(
      'az account show --query "id" --output tsv',
      { encoding: 'utf8' },
    ).trim();
    return subscriptionId;
  } catch (error) {
    AppLogger.error('Failed to get current subscription ID', true);
    return null;
  }
}

export function getCurrentTenantId(): string | null {
  try {
    const tenantId = execSync(
      'az account show --query "tenantId" --output tsv',
      { encoding: 'utf8' },
    ).trim();
    return tenantId;
  } catch (error) {
    AppLogger.error('Failed to get current tenant ID', true);
    return null;
  }
}

export async function listSubscriptions(): Promise<AzureSubscriptionInfo[]> {
  try {
    const subscriptionsJson = execSync(
      'az account list --query "[].{Name:name, SubscriptionId:id, TenantId:tenantId, State:state}" --output json',
      { encoding: 'utf8' },
    );
    return JSON.parse(subscriptionsJson);
  } catch (error) {
    AppLogger.error(`Error listing subscriptions: ${error}`, true);
    return [];
  }
}

export function getAccountInfo(): AzureAccountInfo | null {
  try {
    const accountJson = execSync('az account show --output json', {
      encoding: 'utf8',
    });
    return JSON.parse(accountJson);
  } catch (error) {
    AppLogger.error('Failed to get account information', true);
    return null;
  }
}

export async function loginWithServicePrincipal(
  clientId: string,
  clientSecret: string,
  tenantId: string,
): Promise<boolean> {
  try {
    AppLogger.info('Logging in with service principal...', true);

    const loginCommand = `az login --service-principal --username "${clientId}" --password "$AZURE_SP_SECRET" --tenant "${tenantId}"`;
    execSync(loginCommand, {
      encoding: 'utf8',
      env: { ...process.env, AZURE_SP_SECRET: clientSecret },
    });

    AppLogger.info('Successfully logged in with service principal', true);
    return true;
  } catch (error) {
    const sanitizedError = String(error).replace(
      new RegExp(clientSecret, 'g'),
      '[REDACTED]',
    );
    AppLogger.error(
      `Failed to login with service principal: ${sanitizedError}`,
      true,
    );
    return false;
  }
}

export async function logout(): Promise<boolean> {
  try {
    AppLogger.info('Logging out of Azure CLI...', true);

    execSync('az logout', { encoding: 'utf8' });

    AppLogger.info('Successfully logged out of Azure CLI', true);
    return true;
  } catch (error) {
    AppLogger.error(`Failed to logout: ${error}`, true);
    return false;
  }
}
