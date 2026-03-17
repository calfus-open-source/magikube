import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import { MOCK_AZURE_ACCOUNT } from './azure-fixtures.js';

jest.setTimeout(30000);

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

jest.mock('os', () => ({
  homedir: jest.fn(() => '/mock-home'),
}));

jest.mock('../../../src/logger/appLogger.js', () => ({
  AppLogger: {
    configureLogger: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../../src/core/utils/azure-utils.js', () => ({
  checkAzureLogin: jest.fn(),
  displayCurrentAccount: jest.fn(),
  getCurrentSubscriptionId: jest.fn(),
  getCurrentTenantId: jest.fn(),
  listSubscriptions: jest.fn(),
  getAccountInfo: jest.fn(),
  loginWithServicePrincipal: jest.fn(),
  logout: jest.fn(),
}));

import AzureProfile from '../../../src/core/azure/azure-profile.js';
import { AppLogger } from '../../../src/logger/appLogger.js';
import {
  checkAzureLogin,
  displayCurrentAccount,
  loginWithServicePrincipal,
} from '../../../src/core/utils/azure-utils.js';

const mockedExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockedCheckAzureLogin = checkAzureLogin as jest.MockedFunction<
  typeof checkAzureLogin
>;
const mockedDisplayCurrentAccount =
  displayCurrentAccount as jest.MockedFunction<typeof displayCurrentAccount>;
const mockedLoginWithSP = loginWithServicePrincipal as jest.MockedFunction<
  typeof loginWithServicePrincipal
>;
const mockedFs = fs as jest.Mocked<typeof fs>;
const _mockedOs = os as jest.Mocked<typeof os>;

const mockProject = {} as any;
const TEST_LOCATION = 'eastus';
const TEST_CLIENT_ID = 'client-id-12345';
const TEST_CLIENT_SECRET = 'client-secret-67890';
const TEST_TENANT_ID = MOCK_AZURE_ACCOUNT.tenantId;
const TEST_SUBSCRIPTION_ID = MOCK_AZURE_ACCOUNT.subscriptionId;

const AZURE_CONFIG_DEFAULTS_RESPONSE = JSON.stringify([
  { name: 'location', source: '/home/user/.azure/config', value: 'eastus' },
  { name: 'group', source: '/home/user/.azure/config', value: 'testproj-rg' },
]);

const PROFILES_FILE_PATH = '/mock-home/.azure/profiles.json';
const AZURE_CONFIG_PATH = '/mock-home/.azure';

describe('AzureProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should return true when logged in and setup succeeds', async () => {
      mockedCheckAzureLogin.mockReturnValue(true);
      mockedExecSync
        .mockReturnValueOnce(Buffer.from('')) // az account set
        .mockReturnValueOnce(Buffer.from(`${TEST_SUBSCRIPTION_ID}\n`)) // az account show
        .mockReturnValueOnce(Buffer.from('')); // az configure --defaults

      const result = await AzureProfile.create(
        mockProject,
        TEST_LOCATION,
        TEST_CLIENT_ID,
        TEST_CLIENT_SECRET,
        TEST_TENANT_ID,
        TEST_SUBSCRIPTION_ID,
      );

      expect(result).toBe(true);
      expect(mockedCheckAzureLogin).toHaveBeenCalled();
      expect(mockedDisplayCurrentAccount).toHaveBeenCalled();
      expect(AppLogger.info).toHaveBeenCalledWith(
        'Azure CLI profile configured successfully',
        true,
      );
    });

    it('should return false when not logged in', async () => {
      mockedCheckAzureLogin.mockReturnValue(false);

      const result = await AzureProfile.create(
        mockProject,
        TEST_LOCATION,
        TEST_CLIENT_ID,
        TEST_CLIENT_SECRET,
        TEST_TENANT_ID,
        TEST_SUBSCRIPTION_ID,
      );

      expect(result).toBe(false);
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Azure CLI is not logged in'),
        true,
      );
    });

    it('should return false on error', async () => {
      mockedCheckAzureLogin.mockImplementation(() => {
        throw new Error('CLI crash');
      });

      const result = await AzureProfile.create(
        mockProject,
        TEST_LOCATION,
        TEST_CLIENT_ID,
        TEST_CLIENT_SECRET,
        TEST_TENANT_ID,
        TEST_SUBSCRIPTION_ID,
      );

      expect(result).toBe(false);
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error setting up Azure profile'),
        true,
      );
    });
  });

  describe('delete', () => {
    it('should return true when logged in', async () => {
      mockedCheckAzureLogin.mockReturnValue(true);

      const result = await AzureProfile.delete(
        mockProject,
        TEST_LOCATION,
        TEST_CLIENT_ID,
        TEST_CLIENT_SECRET,
        TEST_TENANT_ID,
        TEST_SUBSCRIPTION_ID,
      );

      expect(result).toBe(true);
      expect(AppLogger.info).toHaveBeenCalledWith(
        'Azure CLI profile cleaned up successfully',
        true,
      );
    });

    it('should return true when not logged in', async () => {
      mockedCheckAzureLogin.mockReturnValue(false);

      const result = await AzureProfile.delete(
        mockProject,
        TEST_LOCATION,
        TEST_CLIENT_ID,
        TEST_CLIENT_SECRET,
        TEST_TENANT_ID,
        TEST_SUBSCRIPTION_ID,
      );

      expect(result).toBe(true);
      expect(AppLogger.info).toHaveBeenCalledWith(
        'Azure CLI is not logged in, no profile cleanup needed',
        true,
      );
    });
  });

  describe('setActiveSubscription', () => {
    it('should return true when subscription is set successfully', async () => {
      mockedExecSync
        .mockReturnValueOnce('' as any) // az account set
        .mockReturnValueOnce(`${TEST_SUBSCRIPTION_ID}\n` as any); // az account show

      const result =
        await AzureProfile.setActiveSubscription(TEST_SUBSCRIPTION_ID);

      expect(result).toBe(true);
      expect(mockedExecSync).toHaveBeenCalledWith(
        `az account set --subscription "${TEST_SUBSCRIPTION_ID}"`,
        { encoding: 'utf8' },
      );
    });

    it('should return false when subscription IDs do not match', async () => {
      mockedExecSync
        .mockReturnValueOnce('' as any)
        .mockReturnValueOnce('different-sub-id\n' as any);

      const result =
        await AzureProfile.setActiveSubscription(TEST_SUBSCRIPTION_ID);

      expect(result).toBe(false);
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to set subscription'),
        true,
      );
    });

    it('should return false on error', async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('az failed');
      });

      const result =
        await AzureProfile.setActiveSubscription(TEST_SUBSCRIPTION_ID);

      expect(result).toBe(false);
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error setting active subscription'),
        true,
      );
    });
  });

  describe('setDefaultLocation', () => {
    it('should return true on success', async () => {
      mockedExecSync.mockReturnValueOnce(Buffer.from(''));

      const result = await AzureProfile.setDefaultLocation(TEST_LOCATION);

      expect(result).toBe(true);
      expect(mockedExecSync).toHaveBeenCalledWith(
        `az configure --defaults location="${TEST_LOCATION}"`,
        { encoding: 'utf8' },
      );
    });

    it('should return false on error', async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('fail');
      });

      const result = await AzureProfile.setDefaultLocation(TEST_LOCATION);

      expect(result).toBe(false);
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error setting default location'),
        true,
      );
    });
  });

  describe('loginInteractive', () => {
    it('should return true on success', async () => {
      mockedExecSync.mockReturnValueOnce(Buffer.from(''));

      const result = await AzureProfile.loginInteractive();

      expect(result).toBe(true);
      expect(mockedExecSync).toHaveBeenCalledWith('az login', {
        stdio: 'inherit',
      });
    });

    it('should return false on failure', async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('login failed');
      });

      const result = await AzureProfile.loginInteractive();

      expect(result).toBe(false);
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to login interactively'),
        true,
      );
    });
  });

  describe('validateCredentials', () => {
    it('should return true when credentials are valid', async () => {
      mockedLoginWithSP.mockResolvedValue(true);
      mockedExecSync.mockReturnValueOnce(Buffer.from('{}'));

      const result = await AzureProfile.validateCredentials(
        TEST_CLIENT_ID,
        TEST_CLIENT_SECRET,
        TEST_TENANT_ID,
        TEST_SUBSCRIPTION_ID,
      );

      expect(result).toBe(true);
      expect(mockedLoginWithSP).toHaveBeenCalledWith(
        TEST_CLIENT_ID,
        TEST_CLIENT_SECRET,
        TEST_TENANT_ID,
      );
      expect(AppLogger.info).toHaveBeenCalledWith(
        'Azure credentials validated successfully',
        true,
      );
    });

    it('should return false when login fails', async () => {
      mockedLoginWithSP.mockResolvedValue(false);

      const result = await AzureProfile.validateCredentials(
        TEST_CLIENT_ID,
        TEST_CLIENT_SECRET,
        TEST_TENANT_ID,
        TEST_SUBSCRIPTION_ID,
      );

      expect(result).toBe(false);
    });

    it('should return false when subscription is not accessible', async () => {
      mockedLoginWithSP.mockResolvedValue(true);
      mockedExecSync.mockImplementation(() => {
        throw new Error('not found');
      });

      const result = await AzureProfile.validateCredentials(
        TEST_CLIENT_ID,
        TEST_CLIENT_SECRET,
        TEST_TENANT_ID,
        TEST_SUBSCRIPTION_ID,
      );

      expect(result).toBe(false);
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('not accessible'),
        true,
      );
    });
  });

  describe('getDefaultLocation', () => {
    it('should return location when found', async () => {
      mockedExecSync.mockReturnValueOnce(AZURE_CONFIG_DEFAULTS_RESPONSE as any);

      const result = await AzureProfile.getDefaultLocation();

      expect(result).toBe('eastus');
    });

    it('should return null when no location entry exists', async () => {
      const noLocationConfig = JSON.stringify([
        {
          name: 'group',
          source: '/home/user/.azure/config',
          value: 'testproj-rg',
        },
      ]);
      mockedExecSync.mockReturnValueOnce(noLocationConfig as any);

      const result = await AzureProfile.getDefaultLocation();

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('fail');
      });

      const result = await AzureProfile.getDefaultLocation();

      expect(result).toBeNull();
      expect(AppLogger.error).toHaveBeenCalledWith(
        'Failed to get default location',
        true,
      );
    });
  });

  describe('clearDefaultLocation', () => {
    it('should return true on success', async () => {
      mockedExecSync.mockReturnValueOnce(Buffer.from(''));

      const result = await AzureProfile.clearDefaultLocation();

      expect(result).toBe(true);
      expect(mockedExecSync).toHaveBeenCalledWith(
        'az configure --defaults location=""',
        { encoding: 'utf8' },
      );
    });

    it('should return false on error', async () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('fail');
      });

      const result = await AzureProfile.clearDefaultLocation();

      expect(result).toBe(false);
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error clearing default location'),
        true,
      );
    });
  });

  describe('isAzureCLIInstalled', () => {
    it('should return true when CLI is installed', () => {
      mockedExecSync.mockReturnValueOnce(Buffer.from(''));

      expect(AzureProfile.isAzureCLIInstalled()).toBe(true);
    });

    it('should return false when CLI is not installed', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('not found');
      });

      expect(AzureProfile.isAzureCLIInstalled()).toBe(false);
    });
  });

  describe('getAzureCLIVersion', () => {
    it('should return first line of version output', () => {
      mockedExecSync.mockReturnValueOnce(
        'azure-cli                         2.53.0\ncore                              2.53.0' as any,
      );

      const result = AzureProfile.getAzureCLIVersion();

      expect(result).toBe('azure-cli                         2.53.0');
    });

    it('should return null on error', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('fail');
      });

      const result = AzureProfile.getAzureCLIVersion();

      expect(result).toBeNull();
      expect(AppLogger.error).toHaveBeenCalledWith(
        'Failed to get Azure CLI version',
        true,
      );
    });
  });

  describe('getProfiles', () => {
    it('should return profiles from file when it exists', () => {
      const profiles = [
        {
          profileName: 'test',
          clientId: 'c1',
          clientSecret: 's1',
          tenantId: 't1',
          subscriptionId: 's1',
        },
      ];
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(profiles));

      const result = AzureProfile.getProfiles();

      expect(result).toEqual(profiles);
      expect(mockedFs.existsSync).toHaveBeenCalledWith(PROFILES_FILE_PATH);
    });

    it('should fall back to CLI when file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      const cliResponse = [
        {
          profileName: 'Sub1',
          subscriptionId: 'sub1',
          tenantId: 't1',
          state: 'Enabled',
        },
      ];
      mockedExecSync.mockReturnValueOnce(JSON.stringify(cliResponse) as any);

      const result = AzureProfile.getProfiles();

      expect(result).toEqual([
        {
          profileName: 'Sub1',
          subscriptionId: 'sub1',
          tenantId: 't1',
          state: 'Enabled',
          clientId: '',
          clientSecret: '',
        },
      ]);
    });

    it('should return empty array on file parse error', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('invalid json');

      const result = AzureProfile.getProfiles();

      expect(result).toEqual([]);
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error reading Azure profiles'),
        true,
      );
    });

    it('should return empty array when CLI also fails', () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedExecSync.mockImplementation(() => {
        throw new Error('fail');
      });

      const result = AzureProfile.getProfiles();

      expect(result).toEqual([]);
    });
  });

  describe('addProfile', () => {
    const newProfile = {
      profileName: 'new-profile',
      clientId: TEST_CLIENT_ID,
      clientSecret: TEST_CLIENT_SECRET,
      tenantId: TEST_TENANT_ID,
      subscriptionId: TEST_SUBSCRIPTION_ID,
    };

    it('should add a new profile to an empty file', () => {
      mockedFs.existsSync
        .mockReturnValueOnce(true) // azureConfigPath exists
        .mockReturnValueOnce(false); // profilesFilePath does not exist
      mockedFs.writeFileSync.mockReturnValue(undefined);

      AzureProfile.addProfile(
        newProfile.profileName,
        newProfile.clientId,
        newProfile.clientSecret,
        newProfile.tenantId,
        newProfile.subscriptionId,
      );

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        PROFILES_FILE_PATH,
        JSON.stringify([newProfile], null, 2),
      );
    });

    it('should update an existing profile', () => {
      const existingProfiles = [
        {
          profileName: 'new-profile',
          clientId: 'old',
          clientSecret: 'old',
          tenantId: 'old',
          subscriptionId: 'old',
        },
      ];
      mockedFs.existsSync
        .mockReturnValueOnce(true) // azureConfigPath
        .mockReturnValueOnce(true); // profilesFilePath
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(existingProfiles));
      mockedFs.writeFileSync.mockReturnValue(undefined);

      AzureProfile.addProfile(
        newProfile.profileName,
        newProfile.clientId,
        newProfile.clientSecret,
        newProfile.tenantId,
        newProfile.subscriptionId,
      );

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        PROFILES_FILE_PATH,
        JSON.stringify([newProfile], null, 2),
      );
      expect(AppLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Updated existing Azure profile'),
        true,
      );
    });

    it('should create the .azure directory if it does not exist', () => {
      mockedFs.existsSync
        .mockReturnValueOnce(false) // azureConfigPath does not exist
        .mockReturnValueOnce(false); // profilesFilePath does not exist
      mockedFs.writeFileSync.mockReturnValue(undefined);

      AzureProfile.addProfile(
        newProfile.profileName,
        newProfile.clientId,
        newProfile.clientSecret,
        newProfile.tenantId,
        newProfile.subscriptionId,
      );

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(AZURE_CONFIG_PATH, {
        recursive: true,
      });
    });

    it('should log error on write failure', () => {
      mockedFs.existsSync.mockReturnValueOnce(true).mockReturnValueOnce(false);
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('write error');
      });

      AzureProfile.addProfile(
        newProfile.profileName,
        newProfile.clientId,
        newProfile.clientSecret,
        newProfile.tenantId,
        newProfile.subscriptionId,
      );

      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error saving Azure profiles'),
        true,
      );
    });
  });
});
