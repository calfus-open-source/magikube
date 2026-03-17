jest.setTimeout(30000);

jest.mock('child_process');
jest.mock('fs');

jest.mock('../../../src/logger/appLogger.js', () => ({
  AppLogger: {
    configureLogger: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../../src/config/system.js', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      mergeConfigs: jest.fn(),
      getConfig: jest.fn(() => ({})),
    })),
  },
}));

jest.mock('../../../src/core/utils/azure-utils.js', () => ({
  checkAzureLogin: jest.fn(),
  getCurrentTenantId: jest.fn(),
  azExecAsync: jest.fn(),
}));

jest.mock('../../../src/core/base-project.js', () => ({
  __esModule: true,
  default: class {},
}));

import { execSync } from 'child_process';
import fs from 'fs';
import AzurePolicies from '../../../src/core/azure/azure-iam.js';
import {
  checkAzureLogin,
  getCurrentTenantId,
  azExecAsync,
} from '../../../src/core/utils/azure-utils.js';
import SystemConfig from '../../../src/config/system.js';
import BaseProject from '../../../src/core/base-project.js';

const mockExecSync = execSync as jest.Mock;
const mockCheckAzureLogin = checkAzureLogin as jest.Mock;
const mockAzExecAsync = azExecAsync as jest.Mock;
const mockGetCurrentTenantId = getCurrentTenantId as jest.Mock;
const mockWriteFileSync = fs.writeFileSync as jest.Mock;
const mockUnlinkSync = fs.unlinkSync as jest.Mock;

const mockProject = {} as BaseProject;

// Contract fixture data
const accountShowResponse = JSON.stringify({
  name: 'Test Subscription',
  id: '22222222-2222-2222-2222-222222222222',
  tenantId: '11111111-1111-1111-1111-111111111111',
  tenantDisplayName: 'Test Organization',
  user: { name: 'test-user@testorg.com', type: 'user' },
});

const spCreateResponse = JSON.stringify({
  appId: '44444444-4444-4444-4444-444444444444',
  displayName: 'testproj-sp',
  password: 'fake-secret-value-placeholder',
  tenant: '11111111-1111-1111-1111-111111111111',
});

describe('AzurePolicies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.AZURE_CLIENT_ID;
    delete process.env.AZURE_CLIENT_SECRET;
    delete process.env.AZURE_TENANT_ID;
  });

  // ─── getAzureLogin ───────────────────────────────────────────────────

  describe('getAzureLogin', () => {
    it('should return account info when already logged in', async () => {
      // Arrange
      mockCheckAzureLogin.mockReturnValue(true);
      mockExecSync.mockReturnValue(accountShowResponse);

      // Act
      const result = await AzurePolicies.getAzureLogin();

      // Assert
      expect(result).toEqual({
        name: 'Test Subscription',
        subscriptionId: '22222222-2222-2222-2222-222222222222',
        tenantId: '11111111-1111-1111-1111-111111111111',
        tenantName: 'Test Organization',
        userName: 'test-user@testorg.com',
      });
      expect(mockCheckAzureLogin).toHaveBeenCalled();
      expect(mockAzExecAsync).not.toHaveBeenCalled();
    });

    it('should use service principal login when env vars are set', async () => {
      // Arrange
      process.env.AZURE_CLIENT_ID = 'sp-client-id';
      process.env.AZURE_CLIENT_SECRET = 'sp-client-secret';
      process.env.AZURE_TENANT_ID = 'sp-tenant-id';
      mockCheckAzureLogin.mockReturnValue(false);
      mockAzExecAsync.mockResolvedValue('Login successful');
      mockExecSync.mockReturnValue(accountShowResponse);

      // Act
      const result = await AzurePolicies.getAzureLogin();

      // Assert
      expect(mockAzExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('az login --service-principal'),
        expect.objectContaining({ timeout: 120000 }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          subscriptionId: '22222222-2222-2222-2222-222222222222',
        }),
      );
    });

    it('should use service principal login from SystemConfig when env vars missing', async () => {
      // Arrange
      mockCheckAzureLogin.mockReturnValue(false);
      (SystemConfig.getInstance as jest.Mock).mockReturnValue({
        mergeConfigs: jest.fn(),
        getConfig: jest.fn(() => ({
          azure_client_id: 'config-client-id',
          azure_client_secret: 'config-client-secret',
          azure_tenant_id: 'config-tenant-id',
        })),
      });
      mockAzExecAsync.mockResolvedValue('Login successful');
      mockExecSync.mockReturnValue(accountShowResponse);

      // Act
      const result = await AzurePolicies.getAzureLogin();

      // Assert
      expect(mockAzExecAsync).toHaveBeenCalledWith(
        expect.stringContaining('az login --service-principal'),
        expect.anything(),
      );
      expect(result).toBeTruthy();
    });

    it('should fall back to interactive login when no credentials available', async () => {
      // Arrange
      delete process.env.AZURE_CLIENT_ID;
      delete process.env.AZURE_CLIENT_SECRET;
      delete process.env.AZURE_TENANT_ID;
      mockCheckAzureLogin.mockReturnValue(false);
      // SystemConfig also returns no credentials
      const mockGetConfig = jest.fn().mockReturnValue({});
      (SystemConfig.getInstance as jest.Mock).mockReturnValue({
        mergeConfigs: jest.fn(),
        getConfig: mockGetConfig,
      });
      mockExecSync
        .mockReturnValueOnce('Login successful') // az login
        .mockReturnValueOnce(accountShowResponse); // az account show

      // Act
      const result = await AzurePolicies.getAzureLogin();

      // Assert
      expect(mockExecSync).toHaveBeenCalledWith('az login', expect.anything());
      expect(result).toEqual(
        expect.objectContaining({
          name: 'Test Subscription',
        }),
      );
    });

    it('should return false when SP login fails and interactive login also fails', async () => {
      // Arrange
      process.env.AZURE_CLIENT_ID = 'sp-client-id';
      process.env.AZURE_CLIENT_SECRET = 'sp-client-secret';
      process.env.AZURE_TENANT_ID = 'sp-tenant-id';
      mockCheckAzureLogin.mockReturnValue(false);
      mockAzExecAsync.mockRejectedValue(new Error('SP login failed'));

      // Act
      const result = await AzurePolicies.getAzureLogin();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when interactive login fails', async () => {
      // Arrange
      mockCheckAzureLogin.mockReturnValue(false);
      mockExecSync.mockImplementation(() => {
        throw new Error('Interactive login failed');
      });

      // Act
      const result = await AzurePolicies.getAzureLogin();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when az account show fails', async () => {
      // Arrange
      mockCheckAzureLogin.mockReturnValue(true);
      mockExecSync.mockReset(); // Ensure no stale mockReturnValue
      mockExecSync.mockImplementation(() => {
        throw new Error('account show failed');
      });

      // Act
      const result = await AzurePolicies.getAzureLogin();

      // Assert
      expect(result).toBe(false);
    });

    it('should use tenantDisplayName for tenantName when available', async () => {
      // Arrange
      mockCheckAzureLogin.mockReturnValue(true);
      mockExecSync.mockReturnValue(accountShowResponse);

      // Act
      const result = await AzurePolicies.getAzureLogin();

      // Assert
      expect(result).toEqual(
        expect.objectContaining({ tenantName: 'Test Organization' }),
      );
    });

    it('should fall back to name for tenantName when tenantDisplayName is missing', async () => {
      // Arrange
      mockCheckAzureLogin.mockReturnValue(true);
      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'Test Subscription',
          id: '22222222-2222-2222-2222-222222222222',
          tenantId: '11111111-1111-1111-1111-111111111111',
          user: { name: 'test-user@testorg.com', type: 'user' },
        }),
      );

      // Act
      const result = await AzurePolicies.getAzureLogin();

      // Assert
      expect(result).toEqual(
        expect.objectContaining({ tenantName: 'Test Subscription' }),
      );
    });

    it('should use "service-principal" as userName when user is missing', async () => {
      // Arrange
      mockCheckAzureLogin.mockReturnValue(true);
      mockExecSync.mockReturnValue(
        JSON.stringify({
          name: 'Test Subscription',
          id: '22222222-2222-2222-2222-222222222222',
          tenantId: '11111111-1111-1111-1111-111111111111',
        }),
      );

      // Act
      const result = await AzurePolicies.getAzureLogin();

      // Assert
      expect(result).toEqual(
        expect.objectContaining({ userName: 'service-principal' }),
      );
    });
  });

  // ─── createCustomRole ────────────────────────────────────────────────

  describe('createCustomRole', () => {
    const roleName = 'TestCustomRole';
    const subscriptionId = '22222222-2222-2222-2222-222222222222';

    it('should return true when role already exists', async () => {
      // Arrange
      mockExecSync.mockReturnValue('some-role-id\n');

      // Act
      const result = await AzurePolicies.createCustomRole(
        mockProject,
        roleName,
        subscriptionId,
      );

      // Assert
      expect(result).toBe(true);
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('should create role when it does not exist', async () => {
      // Arrange
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('Role not found');
        }) // role check fails
        .mockReturnValueOnce(''); // role creation succeeds

      // Act
      const result = await AzurePolicies.createCustomRole(
        mockProject,
        roleName,
        subscriptionId,
      );

      // Assert
      expect(result).toBe(true);
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        `/tmp/${roleName}-role-def.json`,
        expect.stringContaining(roleName),
      );
      expect(mockUnlinkSync).toHaveBeenCalledWith(
        `/tmp/${roleName}-role-def.json`,
      );
    });

    it('should create role when role check returns empty string', async () => {
      // Arrange
      mockExecSync
        .mockReturnValueOnce('') // role check returns empty (no role)
        .mockReturnValueOnce(''); // role creation succeeds

      // Act
      const result = await AzurePolicies.createCustomRole(
        mockProject,
        roleName,
        subscriptionId,
      );

      // Assert
      expect(result).toBe(true);
      expect(mockWriteFileSync).toHaveBeenCalled();
    });

    it('should return false when role creation fails', async () => {
      // Arrange
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('Role not found');
        })
        .mockImplementationOnce(() => {
          throw new Error('Creation failed');
        });

      // Act
      const result = await AzurePolicies.createCustomRole(
        mockProject,
        roleName,
        subscriptionId,
      );

      // Assert
      expect(result).toBe(false);
    });

    it('should write correct role definition with proper permissions', async () => {
      // Arrange
      mockExecSync
        .mockReturnValueOnce('') // empty role check
        .mockReturnValueOnce(''); // creation

      // Act
      await AzurePolicies.createCustomRole(
        mockProject,
        roleName,
        subscriptionId,
      );

      // Assert
      const writtenContent = JSON.parse(mockWriteFileSync.mock.calls[0][1]);
      expect(writtenContent.Name).toBe(roleName);
      expect(writtenContent.AssignableScopes).toEqual([
        `/subscriptions/${subscriptionId}`,
      ]);
      expect(writtenContent.Actions).toContain('Microsoft.Compute/*');
    });
  });

  // ─── createServicePrincipal ──────────────────────────────────────────

  describe('createServicePrincipal', () => {
    const projectName = 'testproj';
    const roleName = 'TestRole';
    const subscriptionId = '22222222-2222-2222-2222-222222222222';
    const _spName = `${projectName}-terraform-principal`;

    it('should return existing SP without clientSecret when SP already exists', async () => {
      // Arrange
      mockExecSync
        .mockReturnValueOnce('44444444-4444-4444-4444-444444444444\n') // sp list check
        .mockReturnValueOnce('11111111-1111-1111-1111-111111111111\n'); // tenant id

      // Act
      const result = await AzurePolicies.createServicePrincipal(
        mockProject,
        projectName,
        roleName,
        subscriptionId,
      );

      // Assert
      expect(result).toEqual({
        clientId: '44444444-4444-4444-4444-444444444444',
        tenantId: '11111111-1111-1111-1111-111111111111',
      });
      expect(result?.clientSecret).toBeUndefined();
    });

    it('should create new SP with clientSecret when SP does not exist', async () => {
      // Arrange
      mockExecSync
        .mockReturnValueOnce('\n') // sp list returns empty
        .mockReturnValueOnce(spCreateResponse) // sp create-for-rbac
        .mockReturnValueOnce('') // role assignment check (empty = no assignment)
        .mockReturnValueOnce('role-def-id\n') // role definition list
        .mockReturnValueOnce(''); // role assignment create

      // Act
      const result = await AzurePolicies.createServicePrincipal(
        mockProject,
        projectName,
        roleName,
        subscriptionId,
      );

      // Assert
      expect(result).toEqual({
        clientId: '44444444-4444-4444-4444-444444444444',
        tenantId: '11111111-1111-1111-1111-111111111111',
        clientSecret: 'fake-secret-value-placeholder',
      });
    }, 15000);

    it('should create SP and skip role assignment if already assigned', async () => {
      // Arrange
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('SP not found');
        }) // sp list throws
        .mockReturnValueOnce(spCreateResponse) // sp create
        .mockReturnValueOnce('existing-assignment-id\n'); // role assignment exists

      // Act
      const result = await AzurePolicies.createServicePrincipal(
        mockProject,
        projectName,
        roleName,
        subscriptionId,
      );

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          clientId: '44444444-4444-4444-4444-444444444444',
          clientSecret: 'fake-secret-value-placeholder',
        }),
      );
    }, 15000);

    it('should return null when SP creation fails', async () => {
      // Arrange
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('SP not found');
        }) // sp list
        .mockImplementationOnce(() => {
          throw new Error('Creation failed');
        }); // sp create

      // Act
      const result = await AzurePolicies.createServicePrincipal(
        mockProject,
        projectName,
        roleName,
        subscriptionId,
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should still return SP data even if role assignment fails', async () => {
      // Arrange
      mockExecSync
        .mockReturnValueOnce('\n') // sp list empty
        .mockReturnValueOnce(spCreateResponse) // sp create
        .mockImplementationOnce(() => {
          throw new Error('Role assignment check failed');
        }); // role assignment check throws

      // Act
      const result = await AzurePolicies.createServicePrincipal(
        mockProject,
        projectName,
        roleName,
        subscriptionId,
      );

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          clientId: '44444444-4444-4444-4444-444444444444',
        }),
      );
    }, 15000);
  });

  // ─── createKeyVault ──────────────────────────────────────────────────

  describe('createKeyVault', () => {
    const kvName = 'test-keyvault';
    const rgName = 'test-rg';
    const location = 'eastus';

    it('should return true when Key Vault already exists', async () => {
      // Arrange
      mockExecSync.mockReturnValue(Buffer.from('keyvault-info'));

      // Act
      const result = await AzurePolicies.createKeyVault(
        mockProject,
        kvName,
        rgName,
        location,
        'cid',
        'csecret',
        'tid',
        'sid',
      );

      // Assert
      expect(result).toBe(true);
      // Only the show command should have been called
      expect(mockExecSync).toHaveBeenCalledTimes(1);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('az keyvault show'),
        expect.anything(),
      );
    });

    it('should create Key Vault when it does not exist', async () => {
      // Arrange
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('Not found');
        }) // keyvault show
        .mockReturnValueOnce('Created'); // keyvault create

      // Act
      const result = await AzurePolicies.createKeyVault(
        mockProject,
        kvName,
        rgName,
        location,
        'cid',
        'csecret',
        'tid',
        'sid',
      );

      // Assert
      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('az keyvault create'),
        expect.anything(),
      );
    });

    it('should return false when both show and create fail', async () => {
      // Arrange
      mockExecSync
        .mockImplementationOnce(() => {
          throw new Error('Not found');
        })
        .mockImplementationOnce(() => {
          throw new Error('Create failed');
        });

      // Act
      const result = await AzurePolicies.createKeyVault(
        mockProject,
        kvName,
        rgName,
        location,
        'cid',
        'csecret',
        'tid',
        'sid',
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  // ─── assignKeyVaultPolicy ────────────────────────────────────────────

  describe('assignKeyVaultPolicy', () => {
    it('should return true on successful policy assignment', async () => {
      // Arrange
      mockExecSync.mockReturnValue('Policy set');

      // Act
      const result = await AzurePolicies.assignKeyVaultPolicy(
        mockProject,
        'test-kv',
        'object-id-123',
        ['get', 'list'],
        'cid',
        'csecret',
        'tid',
        'sid',
      );

      // Assert
      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('az keyvault set-policy'),
        expect.anything(),
      );
    });

    it('should return false when policy assignment fails', async () => {
      // Arrange
      mockExecSync.mockImplementation(() => {
        throw new Error('Policy assignment failed');
      });

      // Act
      const result = await AzurePolicies.assignKeyVaultPolicy(
        mockProject,
        'test-kv',
        'object-id-123',
        ['get', 'list'],
        'cid',
        'csecret',
        'tid',
        'sid',
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  // ─── getServicePrincipalByName ───────────────────────────────────────

  describe('getServicePrincipalByName', () => {
    it('should return SP id when found', async () => {
      // Arrange
      mockExecSync.mockReturnValue('sp-object-id-123\n');

      // Act
      const result = await AzurePolicies.getServicePrincipalByName(
        'my-sp',
        'cid',
        'csecret',
        'tid',
      );

      // Assert
      expect(result).toBe('sp-object-id-123');
    });

    it('should return null when SP not found (empty string)', async () => {
      // Arrange
      mockExecSync.mockReturnValue('\n');

      // Act
      const result = await AzurePolicies.getServicePrincipalByName(
        'nonexistent-sp',
        'cid',
        'csecret',
        'tid',
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when SP returns "null"', async () => {
      // Arrange
      mockExecSync.mockReturnValue('null\n');

      // Act
      const result = await AzurePolicies.getServicePrincipalByName(
        'nonexistent-sp',
        'cid',
        'csecret',
        'tid',
      );

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when execSync throws', async () => {
      // Arrange
      mockExecSync.mockImplementation(() => {
        throw new Error('Command failed');
      });

      // Act
      const result = await AzurePolicies.getServicePrincipalByName(
        'my-sp',
        'cid',
        'csecret',
        'tid',
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  // ─── deleteServicePrincipal ──────────────────────────────────────────

  describe('deleteServicePrincipal', () => {
    it('should return true on successful deletion', async () => {
      // Arrange
      mockExecSync.mockReturnValue('');

      // Act
      const result = await AzurePolicies.deleteServicePrincipal(
        'sp-id-123',
        'cid',
        'csecret',
        'tid',
      );

      // Assert
      expect(result).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith(
        'az ad sp delete --id "sp-id-123"',
        expect.anything(),
      );
    });

    it('should return false when deletion fails', async () => {
      // Arrange
      mockExecSync.mockImplementation(() => {
        throw new Error('Delete failed');
      });

      // Act
      const result = await AzurePolicies.deleteServicePrincipal(
        'sp-id-123',
        'cid',
        'csecret',
        'tid',
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  // ─── getCurrentTenantId ──────────────────────────────────────────────

  describe('getCurrentTenantId', () => {
    it('should delegate to azure-utils getCurrentTenantId', () => {
      // Arrange
      mockGetCurrentTenantId.mockReturnValue('tenant-id-from-utils');

      // Act & Assert
      expect(AzurePolicies.getCurrentTenantId).toBe(getCurrentTenantId);
    });
  });
});
