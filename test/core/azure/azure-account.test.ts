import { AppLogger } from '../../../src/logger/appLogger.js';
import { execSync } from 'child_process';
import {
  MOCK_AZURE_ACCOUNT,
  MOCK_AZURE_SUBSCRIPTION,
  createMockAzureAccountShowResponse,
  createMockAzureValidateSubscriptionResponse,
  createMockAzureUtils,
} from './azure-fixtures.js';

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

jest.mock('../../../src/logger/appLogger.js', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock azure-utils before importing AzureAccount
jest.mock('../../../src/core/utils/azure-utils.js', () => ({
  checkAzureLogin: jest.fn().mockReturnValue(true),
  displayCurrentAccount: jest.fn(),
  getCurrentSubscriptionId: jest.fn(),
  getCurrentTenantId: jest.fn(),
  listSubscriptions: jest.fn(),
  getAccountInfo: jest.fn(),
  loginWithServicePrincipal: jest.fn(),
  logout: jest.fn(),
}));

import AzureAccount from '../../../src/core/azure/azure-account.js';
import * as azureUtils from '../../../src/core/utils/azure-utils.js';

describe('AzureAccount', () => {
  let mockProject: any;
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockProject = {
      generateContent: jest.fn().mockResolvedValue('test-content'),
      config: {
        project_name: 'test-project',
        cloud_provider: 'azure',
        location: 'eastus',
      },
    };

    // Reset Azure utils mocks to defaults
    (azureUtils.checkAzureLogin as jest.Mock).mockReturnValue(true);
    (azureUtils.getCurrentSubscriptionId as jest.Mock).mockReturnValue(
      MOCK_AZURE_ACCOUNT.subscriptionId,
    );
    (azureUtils.getCurrentTenantId as jest.Mock).mockReturnValue(
      MOCK_AZURE_ACCOUNT.tenantId,
    );
    (azureUtils.listSubscriptions as jest.Mock).mockResolvedValue([
      MOCK_AZURE_SUBSCRIPTION,
    ]);
    (azureUtils.getAccountInfo as jest.Mock).mockReturnValue(
      MOCK_AZURE_ACCOUNT,
    );

    mockExecSync.mockImplementation((command: string) => {
      if (typeof command === 'string') {
        if (command.includes('az account show') && command.includes('--query')) {
          // validateSubscription path expects {Name, State} JSON string
          return createMockAzureValidateSubscriptionResponse();
        }
        if (command.includes('az account show') && command.includes('--output tsv')) {
          // setActiveSubscription verification returns subscription ID string
          return MOCK_AZURE_ACCOUNT.subscriptionId + '\n';
        }
        if (command.includes('az account set')) {
          return '';
        }
      }
      return Buffer.from(createMockAzureAccountShowResponse());
    });
  });

  describe('create', () => {
    test('should successfully create Azure account configuration', async () => {
      const result = await AzureAccount.create(
        mockProject,
        'eastus',
        'test-client-id',
        'test-client-secret',
        'test-tenant-id',
        MOCK_AZURE_ACCOUNT.subscriptionId,
      );

      expect(result).toBe(true);
      expect(azureUtils.checkAzureLogin).toHaveBeenCalled();
      expect(azureUtils.displayCurrentAccount).toHaveBeenCalled();
      expect(AppLogger.info).toHaveBeenCalledWith(
        'Setting up Azure account configuration',
        true,
      );
    });

    test('should return false when Azure CLI is not logged in', async () => {
      (azureUtils.checkAzureLogin as jest.Mock).mockReturnValue(false);

      const result = await AzureAccount.create(
        mockProject,
        'eastus',
        'test-client-id',
        'test-client-secret',
        'test-tenant-id',
        'test-subscription-id',
      );

      expect(result).toBe(false);
      expect(AppLogger.error).toHaveBeenCalledWith(
        "Azure CLI is not logged in. Please run 'az login' to authenticate.",
        true,
      );
    });

    test('should validate subscription before setting it', async () => {
      const result = await AzureAccount.create(
        mockProject,
        'eastus',
        'client-id',
        'client-secret',
        'tenant-id',
        MOCK_AZURE_ACCOUNT.subscriptionId,
      );

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('az account show'),
        expect.any(Object),
      );
    });

    test('should return false when subscription validation fails', async () => {
      mockExecSync.mockReturnValue(Buffer.from('[]')); // Empty subscription list

      const result = await AzureAccount.create(
        mockProject,
        'eastus',
        'client-id',
        'client-secret',
        'tenant-id',
        'invalid-subscription-id',
      );

      expect(result).toBe(false);
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('is not accessible or does not exist'),
        true,
      );
    });

    test('should set active subscription after validation', async () => {
      const result = await AzureAccount.create(
        mockProject,
        'eastus',
        'client-id',
        'client-secret',
        'tenant-id',
        MOCK_AZURE_ACCOUNT.subscriptionId,
      );

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('az account set'),
        expect.any(Object),
      );
    });

    test('should handle exceptions and return false', async () => {
      (azureUtils.checkAzureLogin as jest.Mock).mockImplementation(() => {
        throw new Error('Azure CLI error');
      });

      const result = await AzureAccount.create(
        mockProject,
        'eastus',
        'client-id',
        'client-secret',
        'tenant-id',
        'subscription-id',
      );

      expect(result).toBe(false);
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error setting up Azure account'),
        true,
      );
    });
  });

  describe('delete', () => {
    test('should successfully clean up Azure account configuration', async () => {
      const result = await AzureAccount.delete(
        mockProject,
        'eastus',
        'client-id',
        'client-secret',
        'tenant-id',
        'subscription-id',
      );

      expect(result).toBe(true);
      expect(azureUtils.checkAzureLogin).toHaveBeenCalled();
      expect(AppLogger.info).toHaveBeenCalledWith(
        'Cleaning up Azure account configuration',
        true,
      );
    });

    test('should return false when Azure CLI is not logged in', async () => {
      (azureUtils.checkAzureLogin as jest.Mock).mockReturnValue(false);

      const result = await AzureAccount.delete(
        mockProject,
        'eastus',
        'client-id',
        'client-secret',
        'tenant-id',
        'subscription-id',
      );

      expect(result).toBe(false);
      expect(AppLogger.error).toHaveBeenCalledWith(
        "Azure CLI is not logged in. Please run 'az login' to authenticate.",
        true,
      );
    });

    test('should handle exceptions during cleanup', async () => {
      (azureUtils.checkAzureLogin as jest.Mock).mockImplementation(() => {
        throw new Error('Cleanup error');
      });

      const result = await AzureAccount.delete(
        mockProject,
        'eastus',
        'client-id',
        'client-secret',
        'tenant-id',
        'subscription-id',
      );

      expect(result).toBe(false);
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error cleaning up Azure account'),
        true,
      );
    });
  });

  describe('validateSubscription', () => {
    test('should return true for valid subscription', async () => {
      const result = await AzureAccount.validateSubscription(
        MOCK_AZURE_ACCOUNT.subscriptionId,
      );

      expect(result).toBe(true);
    });

    test('should return false for invalid subscription', async () => {
      mockExecSync.mockReturnValue(Buffer.from('[]'));

      const result = await AzureAccount.validateSubscription(
        'invalid-subscription-id',
      );

      expect(result).toBe(false);
    });
  });

  describe('static utility methods', () => {
    test('should expose checkAzureLogin utility', () => {
      expect(AzureAccount.checkAzureLogin).toBe(azureUtils.checkAzureLogin);
    });

    test('should expose getCurrentSubscriptionId utility', () => {
      expect(AzureAccount.getCurrentSubscriptionId).toBe(
        azureUtils.getCurrentSubscriptionId,
      );
    });

    test('should expose getCurrentTenantId utility', () => {
      expect(AzureAccount.getCurrentTenantId).toBe(
        azureUtils.getCurrentTenantId,
      );
    });

    test('should expose listSubscriptions utility', () => {
      expect(AzureAccount.listSubscriptions).toBe(
        azureUtils.listSubscriptions,
      );
    });

    test('should expose getAccountInfo utility', () => {
      expect(AzureAccount.getAccountInfo).toBe(azureUtils.getAccountInfo);
    });

    test('should expose loginWithServicePrincipal utility', () => {
      expect(AzureAccount.loginWithServicePrincipal).toBe(
        azureUtils.loginWithServicePrincipal,
      );
    });

    test('should expose logout utility', () => {
      expect(AzureAccount.logout).toBe(azureUtils.logout);
    });
  });
});
