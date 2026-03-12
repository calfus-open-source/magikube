import AzureTerraformBackend from '../../../src/core/azure/azure-tf-backend.js';
import { AppLogger } from '../../../src/logger/appLogger.js';
import { execSync } from 'child_process';
import { executeCommandWithRetry } from '../../../src/core/utils/executeCommandWithRetry-utils.js';
import { checkAzureLogin } from '../../../src/core/utils/azure-utils.js';

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

jest.mock('../../../src/core/utils/executeCommandWithRetry-utils.js', () => ({
  executeCommandWithRetry: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../src/core/utils/azure-utils.js', () => ({
  checkAzureLogin: jest.fn().mockReturnValue(true),
}));

describe('AzureTerraformBackend', () => {
  let mockProject: any;
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
  const mockCheckAzureLogin = checkAzureLogin as jest.MockedFunction<
    typeof checkAzureLogin
  >;
  const mockExecuteCommandWithRetry =
    executeCommandWithRetry as jest.MockedFunction<
      typeof executeCommandWithRetry
    >;

  beforeEach(() => {
    jest.clearAllMocks();

    mockProject = {
      generateContent: jest.fn().mockResolvedValue('test-content'),
      createFile: jest.fn().mockResolvedValue(true),
      config: {
        project_name: 'test-project',
        cloud_provider: 'azure',
        location: 'eastus',
      },
    };

    mockCheckAzureLogin.mockReturnValue(true);
    mockExecSync.mockImplementation((command: string, options?: any) => {
      if (typeof command === 'string') {
        // "Exists?" checks should throw to trigger the create path
        if (
          command.includes('az group show') ||
          command.includes('az storage account show') ||
          command.includes('az storage container show')
        ) {
          throw new Error('Resource not found');
        }
        // Storage key retrieval (needs .trim())
        if (command.includes('az storage account keys list')) {
          return 'mock-storage-key-value';
        }
        // Create commands with encoding: utf8 return strings
        if (options?.encoding === 'utf8') {
          return 'Success';
        }
      }
      return Buffer.from('{}');
    });
    mockExecuteCommandWithRetry.mockResolvedValue(undefined);
  });

  describe('create', () => {
    test('should successfully create Terraform backend resources', async () => {
      const result = await AzureTerraformBackend.create(
        mockProject,
        'test-project',
        'eastus',
        'client-id',
        'client-secret',
        'tenant-id',
        'subscription-id',
      );

      expect(result).toBe(true);
      expect(mockCheckAzureLogin).toHaveBeenCalled();
      expect(AppLogger.info).toHaveBeenCalled();
    });

    test('should return false when Azure CLI is not logged in', async () => {
      mockCheckAzureLogin.mockReturnValue(false);

      const result = await AzureTerraformBackend.create(
        mockProject,
        'test-project',
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

    test('should create resource group with correct name format', async () => {
      const result = await AzureTerraformBackend.create(
        mockProject,
        'test-project',
        'eastus',
        'client-id',
        'client-secret',
        'tenant-id',
        'subscription-id',
      );

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('test-project-rg'),
        expect.any(Object),
      );
    });

    test('should create storage account with sanitized name', async () => {
      const result = await AzureTerraformBackend.create(
        mockProject,
        'test-project',
        'eastus',
        'client-id',
        'client-secret',
        'tenant-id',
        'subscription-id',
      );

      expect(result).toBe(true);
      // Storage account name should have hyphens removed and be lowercase
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('testprojecttfstate'),
        expect.any(Object),
      );
    });

    test('should create blob container named tfstate', async () => {
      const result = await AzureTerraformBackend.create(
        mockProject,
        'test-project',
        'eastus',
        'client-id',
        'client-secret',
        'tenant-id',
        'subscription-id',
      );

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('tfstate'),
        expect.any(Object),
      );
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('az storage container create'),
        expect.any(Object),
      );
    });

    test('should return false when resource group creation fails', async () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('az group show')) throw new Error('Not found');
        if (command.includes('az group create'))
          throw new Error('RG creation failed');
        return Buffer.from('{}');
      });

      const result = await AzureTerraformBackend.create(
        mockProject,
        'test-project',
        'eastus',
        'client-id',
        'client-secret',
        'tenant-id',
        'subscription-id',
      );

      expect(result).toBe(false);
    });

    test('should return false when storage account creation fails', async () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('az group show')) throw new Error('Not found');
        if (command.includes('az group create')) return 'Success';
        if (command.includes('az storage account show'))
          throw new Error('Not found');
        if (command.includes('az storage account create'))
          throw new Error('SA creation failed');
        return Buffer.from('{}');
      });

      const result = await AzureTerraformBackend.create(
        mockProject,
        'test-project',
        'eastus',
        'client-id',
        'client-secret',
        'tenant-id',
        'subscription-id',
      );

      expect(result).toBe(false);
    });

    test('should return false when blob container creation fails', async () => {
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('az group show')) throw new Error('Not found');
        if (command.includes('az group create')) return 'Success';
        if (command.includes('az storage account show'))
          throw new Error('Not found');
        if (command.includes('az storage account create')) return 'Success';
        if (command.includes('az storage account keys list'))
          return 'mock-key';
        if (command.includes('az storage container show'))
          throw new Error('Not found');
        if (command.includes('az storage container create'))
          throw new Error('Container creation failed');
        return Buffer.from('{}');
      });

      const result = await AzureTerraformBackend.create(
        mockProject,
        'test-project',
        'eastus',
        'client-id',
        'client-secret',
        'tenant-id',
        'subscription-id',
      );

      expect(result).toBe(false);
    });

    test('should use correct location parameter', async () => {
      const result = await AzureTerraformBackend.create(
        mockProject,
        'test-project',
        'westus2',
        'client-id',
        'client-secret',
        'tenant-id',
        'subscription-id',
      );

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('westus2'),
        expect.any(Object),
      );
    });
  });

  describe('delete', () => {
    test('should successfully delete Terraform backend resources', async () => {
      const result = await AzureTerraformBackend.delete(
        mockProject,
        'test-project',
        'eastus',
        'client-id',
        'client-secret',
        'tenant-id',
        'subscription-id',
      );

      expect(result).toBe(true);
      expect(mockCheckAzureLogin).toHaveBeenCalled();
    });

    test('should return false when Azure CLI is not logged in', async () => {
      mockCheckAzureLogin.mockReturnValue(false);

      const result = await AzureTerraformBackend.delete(
        mockProject,
        'test-project',
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

    test('should delete resource group with correct name format', async () => {
      // First az group show succeeds (RG exists), second throws (deleted)
      let groupShowCallCount = 0;
      mockExecSync.mockImplementation((command: string) => {
        if (command.includes('az group show')) {
          groupShowCallCount++;
          if (groupShowCallCount === 1) return Buffer.from('{}');
          throw new Error('Resource not found');
        }
        return Buffer.from('{}');
      });

      const result = await AzureTerraformBackend.delete(
        mockProject,
        'test-project',
        'eastus',
        'client-id',
        'client-secret',
        'tenant-id',
        'subscription-id',
      );

      expect(result).toBe(true);
      expect(mockExecuteCommandWithRetry).toHaveBeenCalledWith(
        expect.stringContaining('test-project-rg'),
        expect.any(Object),
        expect.any(Number),
      );
      expect(mockExecuteCommandWithRetry).toHaveBeenCalledWith(
        expect.stringContaining('az group delete'),
        expect.any(Object),
        expect.any(Number),
      );
    });

    test('should handle missing resource group gracefully', async () => {
      // When resource group doesn't exist (az group show throws),
      // delete returns true (nothing to delete)
      const result = await AzureTerraformBackend.delete(
        mockProject,
        'test-project',
        'eastus',
        'client-id',
        'client-secret',
        'tenant-id',
        'subscription-id',
      );

      expect(result).toBe(true);
    });
  });

  describe('createResourceGroup', () => {
    test('should call executeCommandWithRetry with correct parameters', async () => {
      const result = await AzureTerraformBackend.createResourceGroup(
        mockProject,
        'test-rg',
        'eastus',
      );

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('az group create'),
        expect.any(Object),
      );
    });

    test('should log resource group creation', async () => {
      await AzureTerraformBackend.createResourceGroup(
        mockProject,
        'test-rg',
        'eastus',
      );

      expect(AppLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Checking if resource group'),
        true,
      );
    });
  });

  describe('createStorageAccount', () => {
    test('should call executeCommandWithRetry with correct parameters', async () => {
      const result = await AzureTerraformBackend.createStorageAccount(
        mockProject,
        'teststorage',
        'test-rg',
        'eastus',
      );

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('az storage account create'),
        expect.any(Object),
      );
    });

    test('should use Standard_LRS SKU', async () => {
      await AzureTerraformBackend.createStorageAccount(
        mockProject,
        'teststorage',
        'test-rg',
        'eastus',
      );

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('Standard_LRS'),
        expect.any(Object),
      );
    });
  });

  describe('createBlobContainer', () => {
    test('should call executeCommandWithRetry with correct parameters', async () => {
      const result = await AzureTerraformBackend.createBlobContainer(
        mockProject,
        'teststorage',
        'tfstate',
        'test-rg',
      );

      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('az storage container create'),
        expect.any(Object),
      );
    });

    test('should retrieve storage account key before creating container', async () => {
      await AzureTerraformBackend.createBlobContainer(
        mockProject,
        'teststorage',
        'tfstate',
        'test-rg',
      );

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('az storage account keys list'),
        expect.any(Object),
      );
    });
  });
});
