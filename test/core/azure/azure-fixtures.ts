/**
 * Azure Test Fixtures
 * 
 * Centralized mock data and utilities for Azure-related tests.
 * Azure implementation uses Azure CLI commands via execSync rather than SDK clients,
 * so these fixtures focus on CLI command responses and utility function mocking.
 */

/**
 * Mock Azure subscription information
 */
export interface MockAzureSubscription {
  id: string;
  name: string;
  tenantId: string;
  state: string;
  isDefault?: boolean;
}

/**
 * Mock Azure account information
 */
export interface MockAzureAccount {
  name: string;
  subscriptionId: string;
  tenantId: string;
  tenantName: string;
  userName: string;
}

/**
 * Mock Azure resource group
 */
export interface MockAzureResourceGroup {
  id: string;
  name: string;
  location: string;
  properties: {
    provisioningState: string;
  };
}

/**
 * Mock Azure storage account
 */
export interface MockAzureStorageAccount {
  id: string;
  name: string;
  location: string;
  kind: string;
  sku: {
    name: string;
    tier: string;
  };
}

/**
 * Default mock Azure subscription
 */
export const MOCK_AZURE_SUBSCRIPTION: MockAzureSubscription = {
  id: 'sub-12345678-1234-1234-1234-123456789012',
  name: 'Test Subscription',
  tenantId: 'tenant-87654321-4321-4321-4321-210987654321',
  state: 'Enabled',
  isDefault: true,
};

/**
 * Default mock Azure account info
 */
export const MOCK_AZURE_ACCOUNT: MockAzureAccount = {
  name: 'Test Subscription',
  subscriptionId: 'sub-12345678-1234-1234-1234-123456789012',
  tenantId: 'tenant-87654321-4321-4321-4321-210987654321',
  tenantName: 'Test Tenant',
  userName: 'test-user@example.com',
};

/**
 * Default mock Azure resource group
 */
export const MOCK_AZURE_RESOURCE_GROUP: MockAzureResourceGroup = {
  id: '/subscriptions/sub-12345678-1234-1234-1234-123456789012/resourceGroups/test-rg',
  name: 'test-rg',
  location: 'eastus',
  properties: {
    provisioningState: 'Succeeded',
  },
};

/**
 * Default mock Azure storage account
 */
export const MOCK_AZURE_STORAGE_ACCOUNT: MockAzureStorageAccount = {
  id: '/subscriptions/sub-12345678-1234-1234-1234-123456789012/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/teststorage',
  name: 'teststorage',
  location: 'eastus',
  kind: 'StorageV2',
  sku: {
    name: 'Standard_LRS',
    tier: 'Standard',
  },
};

/**
 * Creates a mock Azure CLI response for 'az account show'
 */
export function createMockAzureAccountShowResponse(
  override?: Partial<MockAzureAccount>,
): string {
  const account = { ...MOCK_AZURE_ACCOUNT, ...override };
  return JSON.stringify(account);
}

/**
 * Creates a mock response for 'az account show --query "{Name:name, State:state}"'
 * Used by AzureAccount.validateSubscription
 */
export function createMockAzureValidateSubscriptionResponse(
  override?: Partial<{ Name: string; State: string }>,
): string {
  const defaults = { Name: 'Test Subscription', State: 'Enabled' };
  return JSON.stringify({ ...defaults, ...override });
}

/**
 * Creates a mock Azure CLI response for 'az account list'
 */
export function createMockAzureAccountListResponse(
  subscriptions?: MockAzureSubscription[],
): string {
  const subs = subscriptions || [MOCK_AZURE_SUBSCRIPTION];
  return JSON.stringify(subs);
}

/**
 * Creates a mock Azure CLI response for 'az group show'
 */
export function createMockAzureGroupShowResponse(
  override?: Partial<MockAzureResourceGroup>,
): string {
  const group = { ...MOCK_AZURE_RESOURCE_GROUP, ...override };
  return JSON.stringify(group);
}

/**
 * Creates a mock Azure CLI response for 'az storage account show'
 */
export function createMockAzureStorageAccountResponse(
  override?: Partial<MockAzureStorageAccount>,
): string {
  const account = { ...MOCK_AZURE_STORAGE_ACCOUNT, ...override };
  return JSON.stringify(account);
}

/**
 * Creates a mock Azure CLI response for successful login
 */
export function createMockAzureLoginResponse(): string {
  return JSON.stringify([
    {
      cloudName: 'AzureCloud',
      homeTenantId: MOCK_AZURE_ACCOUNT.tenantId,
      id: MOCK_AZURE_ACCOUNT.subscriptionId,
      isDefault: true,
      managedByTenants: [],
      name: MOCK_AZURE_ACCOUNT.name,
      state: 'Enabled',
      tenantId: MOCK_AZURE_ACCOUNT.tenantId,
      user: {
        name: MOCK_AZURE_ACCOUNT.userName,
        type: 'user',
      },
    },
  ]);
}

/**
 * Creates a mock execSync implementation that returns Azure CLI-like responses
 * based on the command executed.
 * 
 * @param commandMap - Map of command patterns to responses
 * @returns Mock function that can be passed to jest.mock
 */
export function createMockExecSync(
  commandMap?: Map<string | RegExp, string | Buffer>,
): jest.Mock {
  return jest.fn((command: string) => {
    if (!commandMap) {
      // Default behavior: return empty success response
      return Buffer.from('');
    }

    // Check if command matches any pattern in the map
    for (const [pattern, response] of commandMap.entries()) {
      if (typeof pattern === 'string') {
        if (command.includes(pattern)) {
          return typeof response === 'string'
            ? Buffer.from(response)
            : response;
        }
      } else if (pattern instanceof RegExp) {
        if (pattern.test(command)) {
          return typeof response === 'string'
            ? Buffer.from(response)
            : response;
        }
      }
    }

    // No match found, return empty buffer
    return Buffer.from('');
  });
}

/**
 * Creates mock functions for common Azure utility functions from azure-utils.ts
 */
export function createMockAzureUtils() {
  return {
    checkAzureLogin: jest.fn().mockReturnValue(true),
    displayCurrentAccount: jest.fn(),
    getCurrentSubscriptionId: jest
      .fn()
      .mockReturnValue(MOCK_AZURE_ACCOUNT.subscriptionId),
    getCurrentTenantId: jest.fn().mockReturnValue(MOCK_AZURE_ACCOUNT.tenantId),
    listSubscriptions: jest.fn().mockResolvedValue([MOCK_AZURE_SUBSCRIPTION]),
    getAccountInfo: jest.fn().mockReturnValue(MOCK_AZURE_ACCOUNT),
    loginWithServicePrincipal: jest.fn().mockResolvedValue(true),
    logout: jest.fn().mockResolvedValue(true),
  };
}

/**
 * Helper to create a mock Azure project configuration
 */
export function createMockAzureProjectConfig(override?: any) {
  return {
    project_name: 'test-project',
    command: 'new',
    source_code_repository: 'github',
    cloud_provider: 'azure',
    location: 'eastus',
    clientId: 'client-id-12345',
    clientSecret: 'client-secret-67890',
    tenantId: MOCK_AZURE_ACCOUNT.tenantId,
    subscriptionId: MOCK_AZURE_ACCOUNT.subscriptionId,
    ...override,
  };
}

/**
 * Helper to create mock Azure Terraform backend configuration
 */
export function createMockAzureTerraformBackend() {
  return {
    resourceGroupName: 'test-terraform-rg',
    storageAccountName: 'testtfstate',
    containerName: 'tfstate',
    key: 'terraform.tfstate',
  };
}

/**
 * Helper to create mock Azure AKS cluster configuration
 */
export function createMockAzureAKSConfig(override?: any) {
  return {
    name: 'test-aks-cluster',
    resourceGroup: 'test-aks-rg',
    location: 'eastus',
    nodeCount: 3,
    nodeVmSize: 'Standard_D2s_v3',
    kubernetesVersion: '1.28.0',
    dnsPrefix: 'test-aks',
    networkPlugin: 'azure',
    ...override,
  };
}

/**
 * Helper to assert that execSync was called with a specific Azure CLI command
 */
export function assertAzureCliCommandCalled(
  mockExecSync: jest.Mock,
  commandPattern: string | RegExp,
  options?: any,
): void {
  const calls = mockExecSync.mock.calls;
  const found = calls.some((call) => {
    const command = call[0] as string;
    if (typeof commandPattern === 'string') {
      return command.includes(commandPattern);
    } else {
      return commandPattern.test(command);
    }
  });

  expect(found).toBe(true);
  if (!found) {
    throw new Error(
      `Expected execSync to be called with command matching "${commandPattern}", but no such call was found.`,
    );
  }

  if (options) {
    const matchingCall = calls.find((call) => {
      const command = call[0] as string;
      if (typeof commandPattern === 'string') {
        return command.includes(commandPattern);
      } else {
        return commandPattern.test(command);
      }
    });
    expect(matchingCall?.[1]).toMatchObject(options);
  }
}

/**
 * Creates a complete mock Azure test environment with all common mocks configured
 */
export function createAzureTestEnvironment() {
  const mockExecSync = createMockExecSync();
  const mockAzureUtils = createMockAzureUtils();
  const mockProjectConfig = createMockAzureProjectConfig();

  return {
    mockExecSync,
    mockAzureUtils,
    mockProjectConfig,
    mockSubscription: MOCK_AZURE_SUBSCRIPTION,
    mockAccount: MOCK_AZURE_ACCOUNT,
    mockResourceGroup: MOCK_AZURE_RESOURCE_GROUP,
    mockStorageAccount: MOCK_AZURE_STORAGE_ACCOUNT,
  };
}
