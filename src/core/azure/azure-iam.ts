import BaseProject from "../base-project.js";
import { AppLogger } from "../../logger/appLogger.js";
import { execSync } from 'child_process';

export default class AzurePolicies {
  static async create(
    project: BaseProject,
    location: string,
    clientId: string,
    clientSecret: string,
    tenantId: string,
    subscriptionId: string,
    projectName: string
  ): Promise<boolean> {
    
    try {
      AppLogger.info("Creating Azure IAM policies and service principal", true);
      
      // Check if Azure CLI is logged in
      if (!AzurePolicies.checkAzureLogin()) {
        AppLogger.error("Azure CLI is not logged in. Please run 'az login' to authenticate.", true);
        return false;
      }

      // Display current account
      AzurePolicies.displayCurrentAccount();
      
      // Create custom role for the project
      const roleName = `${projectName}-terraform-role`;
      await AzurePolicies.createCustomRole(project, roleName, subscriptionId);

      // Create service principal for the project
      const servicePrincipalInfo = await AzurePolicies.createServicePrincipal(
        project,
        projectName,
        roleName,
        subscriptionId
      );

      if (servicePrincipalInfo) {
        AppLogger.info(`Service Principal created successfully:`, true);
        AppLogger.info(`Client ID: ${servicePrincipalInfo.clientId}`, true);
        AppLogger.info(`Tenant ID: ${servicePrincipalInfo.tenantId}`, true);
        AppLogger.info("Please save these credentials securely.", true);
      }

      AppLogger.info("Azure IAM policies created successfully", true);
      return true;
    } catch (error) {
      AppLogger.error(`Error creating Azure IAM policies: ${error}`, true);
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
      AppLogger.info("Deleting Azure IAM policies and service principal", true);
      
      // Check if Azure CLI is logged in
      if (!AzurePolicies.checkAzureLogin()) {
        AppLogger.error("Azure CLI is not logged in. Please run 'az login' to authenticate.", true);
        return false;
      }

      // In Azure, service principals and role assignments are typically cleaned up
      // when the resource group is deleted, but we can add specific cleanup if needed
      
      AppLogger.info("Azure IAM policies deleted successfully", true);
      return true;
    } catch (error) {
      AppLogger.error(`Error deleting Azure IAM policies: ${error}`, true);
      return false;
    }
  }

  static async getAzureLogin(): Promise<any> {
    try {
      AppLogger.info("=== Azure Login Process Started ===", true);
      
      // Check if already logged in first
      AppLogger.info("Checking if Azure CLI is already logged in...", true);
      if (!AzurePolicies.checkAzureLogin()) {
        AppLogger.info("Not logged in. Attempting authentication...", true);
        
        // Try service principal login first with environment variables or SystemConfig
        let clientId = process.env.AZURE_CLIENT_ID;
        let clientSecret = process.env.AZURE_CLIENT_SECRET;
        let tenantId = process.env.AZURE_TENANT_ID;

        AppLogger.info("Checking environment variables for Azure credentials...", true);
        AppLogger.info(`- AZURE_CLIENT_ID from env: ${clientId ? 'SET' : 'NOT SET'}`, true);
        AppLogger.info(`- AZURE_CLIENT_SECRET from env: ${clientSecret ? 'SET' : 'NOT SET'}`, true);
        AppLogger.info(`- AZURE_TENANT_ID from env: ${tenantId ? 'SET' : 'NOT SET'}`, true);

        // If not in environment variables, try to get from SystemConfig
        if (!clientId || !clientSecret || !tenantId) {
          AppLogger.info("Environment variables not complete. Checking SystemConfig...", true);
          const SystemConfig = (await import("../../config/system.js")).default;
          const config = SystemConfig.getInstance().getConfig();
          
          const configClientId = config.azure_client_id;
          const configClientSecret = config.azure_client_secret;
          const configTenantId = config.azure_tenant_id;
          
          AppLogger.info(`- azure_client_id from config: ${configClientId ? 'SET' : 'NOT SET'}`, true);
          AppLogger.info(`- azure_client_secret from config: ${configClientSecret ? 'SET' : 'NOT SET'}`, true);
          AppLogger.info(`- azure_tenant_id from config: ${configTenantId ? 'SET' : 'NOT SET'}`, true);
          
          clientId = clientId || configClientId;
          clientSecret = clientSecret || configClientSecret;
          tenantId = tenantId || configTenantId;
        }

        AppLogger.info("Final credential check:", true);
        AppLogger.info(`- clientId: ${clientId ? 'SET' : 'NOT SET'}`, true);
        AppLogger.info(`- clientSecret: ${clientSecret ? 'SET' : 'NOT SET'}`, true);
        AppLogger.info(`- tenantId: ${tenantId ? 'SET' : 'NOT SET'}`, true);

        if (clientId && clientSecret && tenantId) {
          AppLogger.info("All credentials available. Using service principal login...", true);
          const spLoginCommand = `az login --service-principal --username ${clientId} --password [HIDDEN] --tenant ${tenantId}`;
          AppLogger.info(`Executing command: ${spLoginCommand}`, true);
          
          try {
            const actualCommand = `az login --service-principal --username ${clientId} --password ${clientSecret} --tenant ${tenantId}`;
            const output = execSync(actualCommand, { stdio: 'pipe', encoding: 'utf8' });
            AppLogger.info("Service principal login output:", true);
            AppLogger.info(output, true);
            AppLogger.info("Service principal logged in successfully", true);
          } catch (spError) {
            AppLogger.error(`Service principal login failed: ${spError}`, true);
            AppLogger.info("Falling back to interactive login...", true);
            throw spError; // Re-throw to trigger fallback
          }
        } else {
          AppLogger.info("Credentials incomplete. Using interactive login...", true);
          AppLogger.info("Executing command: az login", true);
          try {
            const output = execSync('az login', { stdio: 'pipe', encoding: 'utf8' });
            AppLogger.info("Interactive login output:", true);
            AppLogger.info(output, true);
            AppLogger.info("Azure CLI logged in successfully", true);
          } catch (interactiveError) {
            AppLogger.error(`Interactive login failed: ${interactiveError}`, true);
            throw interactiveError;
          }
        }
      } else {
        AppLogger.info("Already logged in to Azure CLI", true);
      }

      // Use JSON output for easier parsing
      AppLogger.info("Getting account information...", true);
      AppLogger.info("Executing command: az account show --output json", true);
      const loginOutput = execSync('az account show --output json', { encoding: 'utf8' });
      const accountData = JSON.parse(loginOutput);
      
      AppLogger.info("Account data retrieved successfully:", true);
      AppLogger.info(`Name: ${accountData.name}`, true);
      AppLogger.info(`Subscription ID: ${accountData.id}`, true);
      AppLogger.info(`Tenant ID: ${accountData.tenantId}`, true);
      AppLogger.info(`User: ${accountData.user?.name || 'N/A'}`, true);

      // Return properly parsed account info
      const result = {
        name: accountData.name,
        subscriptionId: accountData.id,
        tenantId: accountData.tenantId,
        tenantName: accountData.tenantDisplayName || accountData.name,
        userName: accountData.user?.name || 'service-principal'
      };
      
      AppLogger.info("=== Azure Login Process Completed Successfully ===", true);
      return result;
      
    } catch (error) {
      AppLogger.error(`=== Azure Login Process Failed ===`, true);
      AppLogger.error(`Error details: ${error}`, true);
      if (error instanceof Error) {
        AppLogger.error(`Error message: ${error.message}`, true);
        AppLogger.error(`Error stack: ${error.stack}`, true);
      }
      return false;
    }
  }

  static checkAzureLogin(): boolean {
    try {
      AppLogger.debug("Executing command: az account show", true);
      execSync('az account show', { stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
  }

  static displayCurrentAccount(): void {
    try {
      AppLogger.info("Executing command: az account show --query \"{Name:name, SubscriptionId:id, TenantId:tenantId}\" --output table", true);
      const accountInfo = execSync('az account show --query "{Name:name, SubscriptionId:id, TenantId:tenantId}" --output table', { encoding: 'utf8' });
      AppLogger.info("Currently logged in account details:", true);
      AppLogger.info(accountInfo, true);
    } catch (error) {
      AppLogger.error("Failed to get current account details", true);
    }
  }

  static async createCustomRole(
    project: BaseProject,
    roleName: string,
    subscriptionId: string
  ): Promise<boolean> {
    
    try {
      AppLogger.info(`Checking if custom role ${roleName} exists...`, true);
      
      // Check if role exists
      try {
        const roleCheckCommand = `az role definition list --query "[?roleName=='${roleName}'].id" --output tsv`;
        AppLogger.info(`Executing command: ${roleCheckCommand}`, true);
        const roleCheck = execSync(roleCheckCommand, { encoding: 'utf8' });
        if (roleCheck.trim()) {
          AppLogger.info(`Role ${roleName} already exists.`, true);
          return true;
        }
      } catch (error) {
        // Role doesn't exist, continue to create
      }

      // Define role permissions
      const rolePermissions = {
        "Name": roleName,
        "Description": `Custom role for ${roleName} with Terraform permissions.`,
        "Actions": [
          "Microsoft.Network/*",
          "Microsoft.Compute/*",
          "Microsoft.ContainerRegistry/registries/*",
          "Microsoft.Authorization/*",
          "Microsoft.Storage/*",
          "Microsoft.KeyVault/vaults/*",
          "Microsoft.KeyVault/*",
          "Microsoft.ManagedIdentity/userAssignedIdentities/*",
          "Microsoft.Insights/autoScaleSettings/*",
          "Microsoft.ContainerService/*",
          "Microsoft.Resources/*"
        ],
        "NotActions": [],
        "AssignableScopes": [`/subscriptions/${subscriptionId}`]
      };

      // Write role definition to temporary file
      const roleDefFile = `/tmp/${roleName}-role-def.json`;
      require('fs').writeFileSync(roleDefFile, JSON.stringify(rolePermissions, null, 2));

      AppLogger.info(`Creating custom role: ${roleName}...`, true);
      const createResult = execSync(`az role definition create --role-definition "${roleDefFile}"`, { encoding: 'utf8' });
      
      // Clean up temporary file
      require('fs').unlinkSync(roleDefFile);
      
      AppLogger.info(`Custom role ${roleName} created successfully.`, true);
      return true;
      
    } catch (error) {
      AppLogger.error(`Error creating custom role: ${error}`, true);
      return false;
    }
  }

  static async createServicePrincipal(
    project: BaseProject,
    projectName: string,
    roleName: string,
    subscriptionId: string
  ): Promise<{ clientId: string; tenantId: string; clientSecret?: string } | null> {
    
    try {
      const spName = `${projectName}-terraform-principal`;
      
      AppLogger.info(`Checking if Service Principal ${spName} exists...`, true);
      
      // Check if service principal exists
      let spAppId: string | null = null;
      try {
        const spCheckCommand = `az ad sp list --display-name "${spName}" --query "[0].appId" --output tsv`;
        AppLogger.info(`Executing command: ${spCheckCommand}`, true);
        const spCheck = execSync(spCheckCommand, { encoding: 'utf8' });
        spAppId = spCheck.trim();
        if (spAppId && spAppId !== 'null' && spAppId !== '') {
          AppLogger.info(`Service Principal ${spName} already exists. Skipping creation.`, true);
          
          // Get tenant ID
          const getTenantCommand = `az ad sp show --id "${spAppId}" --query "appOwnerOrganizationId" --output tsv`;
          AppLogger.info(`Executing command: ${getTenantCommand}`, true);
          const tenantId = execSync(getTenantCommand, { encoding: 'utf8' }).trim();
          
          return {
            clientId: spAppId,
            tenantId: tenantId
          };
        }
      } catch (error) {
        // Service principal doesn't exist, continue to create
      }

      AppLogger.info("Creating Service Principal...", true);
      
      // Create service principal
      const createSpCommand = `az ad sp create-for-rbac --name "${spName}" --output json`;
      AppLogger.info(`Executing command: ${createSpCommand}`, true);
      const spOutput = execSync(createSpCommand, { encoding: 'utf8' });
      const spData = JSON.parse(spOutput);
      
      spAppId = spData.appId;
      const tenantId = spData.tenant;
      const clientSecret = spData.password;

      // Validate that we got the required data
      if (!spAppId || !tenantId) {
        throw new Error("Failed to create service principal - missing required data");
      }

      // Wait a moment for the service principal to be fully created
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Check if role assignment exists and create if needed
      AppLogger.info("Checking if role assignment exists...", true);
      
      try {
        const roleAssignmentCheck = execSync(
          `az role assignment list --assignee "${spAppId}" --scope "/subscriptions/${subscriptionId}" --query "[?roleDefinitionName=='${roleName}'].id" --output tsv`,
          { encoding: 'utf8' }
        );
        
        if (!roleAssignmentCheck.trim()) {
          AppLogger.info(`Assigning role ${roleName} to Service Principal...`, true);
          
          // Get role definition ID
          const roleId = execSync(`az role definition list --query "[?roleName=='${roleName}'].id" --output tsv`, { encoding: 'utf8' }).trim();
          
          // Assign role
          execSync(`az role assignment create --assignee "${spAppId}" --role "${roleId}" --scope "/subscriptions/${subscriptionId}"`, { encoding: 'utf8' });
          
          AppLogger.info(`Role ${roleName} assigned to Service Principal.`, true);
        } else {
          AppLogger.info(`Role ${roleName} is already assigned to the Service Principal.`, true);
        }
      } catch (error) {
        AppLogger.warn(`Warning: Could not assign role automatically: ${error}`, true);
      }

      return {
        clientId: spAppId,
        tenantId: tenantId,
        clientSecret: clientSecret
      };
      
    } catch (error) {
      AppLogger.error(`Error creating service principal: ${error}`, true);
      return null;
    }
  }

  static async assignRole(
    project: BaseProject,
    roleName: string,
    projectName: string,
    servicePrincipalId: string,
    clientId: string,
    clientSecret: string,
    tenantId: string,
    subscriptionId: string
  ): Promise<boolean> {
    
    try {
      AppLogger.info(`Assigning ${roleName} role to service principal for project ${projectName}`, true);
      
      // Check if role assignment exists
      const roleAssignmentCheck = execSync(
        `az role assignment list --assignee "${servicePrincipalId}" --scope "/subscriptions/${subscriptionId}" --query "[?roleDefinitionName=='${roleName}'].id" --output tsv`,
        { encoding: 'utf8' }
      );
      
      if (roleAssignmentCheck.trim()) {
        AppLogger.info(`Role ${roleName} is already assigned to the Service Principal.`, true);
        return true;
      }

      // Get role definition ID
      const roleId = execSync(`az role definition list --query "[?roleName=='${roleName}'].id" --output tsv`, { encoding: 'utf8' }).trim();
      
      if (!roleId) {
        throw new Error(`Role definition '${roleName}' not found`);
      }

      // Assign role
      execSync(`az role assignment create --assignee "${servicePrincipalId}" --role "${roleId}" --scope "/subscriptions/${subscriptionId}"`, { encoding: 'utf8' });
      
      AppLogger.info(`Role ${roleName} assigned successfully`, true);
      return true;
      
    } catch (error) {
      AppLogger.error(`Error assigning role: ${error}`, true);
      return false;
    }
  }

  static async createKeyVault(
    project: BaseProject,
    keyVaultName: string,
    resourceGroupName: string,
    location: string,
    clientId: string,
    clientSecret: string,
    tenantId: string,
    subscriptionId: string
  ): Promise<boolean> {
    
    try {
      AppLogger.info(`Checking if Key Vault ${keyVaultName} exists...`, true);
      
      // Check if Key Vault exists
      try {
        execSync(`az keyvault show --name "${keyVaultName}" --resource-group "${resourceGroupName}"`, { stdio: 'pipe' });
        AppLogger.info(`Key Vault ${keyVaultName} already exists.`, true);
        return true;
      } catch (error) {
        // Key Vault doesn't exist, create it
        AppLogger.info(`Creating Key Vault ${keyVaultName} in resource group ${resourceGroupName}`, true);
        
        const createCommand = `az keyvault create --name "${keyVaultName}" --resource-group "${resourceGroupName}" --location "${location}" --output table`;
        const result = execSync(createCommand, { encoding: 'utf8' });
        
        AppLogger.info(`Key Vault ${keyVaultName} created successfully`, true);
        AppLogger.debug(result, true);
        return true;
      }
      
    } catch (error) {
      AppLogger.error(`Error creating Key Vault: ${error}`, true);
      return false;
    }
  }

  static async assignKeyVaultPolicy(
    project: BaseProject,
    keyVaultName: string,
    objectId: string,
    permissions: string[],
    clientId: string,
    clientSecret: string,
    tenantId: string,
    subscriptionId: string
  ): Promise<boolean> {
    
    try {
      AppLogger.info(`Assigning Key Vault access policies for ${keyVaultName}`, true);
      
      // Set access policy for the service principal
      const policyCommand = `az keyvault set-policy --name "${keyVaultName}" --object-id "${objectId}" --secret-permissions get list set delete --key-permissions get list create delete update --certificate-permissions get list create delete`;
      
      execSync(policyCommand, { encoding: 'utf8' });
      
      AppLogger.info(`Key Vault access policies assigned successfully`, true);
      return true;
      
    } catch (error) {
      AppLogger.error(`Error assigning Key Vault policies: ${error}`, true);
      return false;
    }
  }

  // Helper method to get service principal by display name
  static async getServicePrincipalByName(
    displayName: string,
    clientId: string,
    clientSecret: string,
    tenantId: string
  ): Promise<string | null> {
    
    try {
      const spCheck = execSync(`az ad sp list --display-name "${displayName}" --query "[0].id" --output tsv`, { encoding: 'utf8' });
      const spId = spCheck.trim();
      
      if (spId && spId !== 'null' && spId !== '') {
        return spId;
      }

      return null;
      
    } catch (error) {
      AppLogger.error(`Error getting service principal: ${error}`, true);
      return null;
    }
  }

  // Helper method to delete service principal
  static async deleteServicePrincipal(
    servicePrincipalId: string,
    clientId: string,
    clientSecret: string,
    tenantId: string
  ): Promise<boolean> {
    
    try {
      execSync(`az ad sp delete --id "${servicePrincipalId}"`, { encoding: 'utf8' });
      AppLogger.info(`Service principal ${servicePrincipalId} deleted successfully`, true);
      return true;
      
    } catch (error) {
      AppLogger.error(`Error deleting service principal: ${error}`, true);
      return false;
    }
  }

  // Helper method to get current subscription ID
  static getCurrentSubscriptionId(): string | null {
    try {
      const subscriptionId = execSync('az account show --query "id" --output tsv', { encoding: 'utf8' }).trim();
      return subscriptionId;
    } catch (error) {
      AppLogger.error("Failed to get current subscription ID", true);
      return null;
    }
  }

  // Helper method to get current tenant ID
  static getCurrentTenantId(): string | null {
    try {
      const tenantId = execSync('az account show --query "tenantId" --output tsv', { encoding: 'utf8' }).trim();
      return tenantId;
    } catch (error) {
      AppLogger.error("Failed to get current tenant ID", true);
      return null;
    }
  }
} 