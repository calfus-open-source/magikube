import { ManageRepository } from '../../src/core/manage-repository.js';
import { AppLogger } from '../../src/logger/appLogger.js';
import axios from 'axios';
import sodium from 'libsodium-wrappers';
import { executeCommandWithRetry } from '../../src/core/utils/executeCommandWithRetry-utils.js';

// Mock SystemConfig to return AWS configuration
const mockGetConfig = jest.fn().mockReturnValue({
  cloud_provider: 'aws',
  aws_access_key_id: 'MOCK_ACCESS_KEY',
  aws_secret_access_key: 'MOCK_SECRET_KEY',
  aws_region: 'us-east-1',
  azure_tenant_id: 'mock_tenant',
  azure_subscription_id: 'mock_subscription',
  azure_client_id: 'mock_client',
  azure_client_secret: 'mock_client_secret',
  command: 'new',
});

jest.mock('../../src/config/system.js', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      getConfig: mockGetConfig,
    })),
  },
}));

jest.mock('../../src/logger/appLogger.js', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockBar = {
  start: jest.fn(),
  update: jest.fn(),
  stop: jest.fn(),
};

jest.mock('../../src/logger/progressLogger.js', () => ({
  __esModule: true,
  default: {
    createProgressBar: jest.fn(() => mockBar),
  },
}));

jest.mock('axios');
jest.mock('libsodium-wrappers');
jest.mock('../../src/core/utils/executeCommandWithRetry-utils.js', () => ({
  executeCommandWithRetry: jest.fn(),
}));

describe('ManageRepository.pushCode', () => {
  const mockConfigObject: any = {
    common: {
      token: 'FAKE_TOKEN',
      userName: 'rohit',
      orgName: 'myorg',
      sourceCodeRepo: 'github',
      region: 'ap-south-1',
      appName: 'myapp',
      projectName: 'demo',
      appType: 'node',
      awsAccessKey: 'AWS_KEY',
      awsSecretKey: 'AWS_SECRET',
      environment: 'dev',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (axios.get as jest.Mock).mockResolvedValue({
      data: { key: 'PUBLIC_KEY', key_id: 'KEY_ID' },
    });

    (sodium.ready as any) = Promise.resolve();
    sodium.from_base64 = jest.fn(() => 'B64_KEY');
    sodium.from_string = jest.fn(() => 'STRING_KEY');
    sodium.crypto_box_seal = jest.fn(() => 'ENCRYPTED_BINARY');
    sodium.to_base64 = jest.fn(() => 'ENCRYPTED_VALUE');

    (executeCommandWithRetry as jest.Mock).mockReturnValue('OK');
  });

  test('should push code successfully and return false', async () => {
    const result = await ManageRepository.pushCode(mockConfigObject);

    expect(result).toBe(false);

    // public key fetch once (implementation behavior)
    expect(axios.get).toHaveBeenCalledTimes(1);

    // encryption must be called 3 times for AWS (ACCESS_KEY_ID, SECRET_ACCESS_KEY, REPO_TOKEN)
    expect(sodium.crypto_box_seal).toHaveBeenCalledTimes(3);

    // git commands must be executed
    expect(executeCommandWithRetry).toHaveBeenCalled();

    // Progress bar calls (fixed)
    expect(mockBar.start).toHaveBeenCalled();
    expect(mockBar.stop).toHaveBeenCalled();
  });

  test('should return true when a git command fails', async () => {
    (executeCommandWithRetry as jest.Mock).mockImplementationOnce(() => {
      throw new Error('Git fail');
    });

    const result = await ManageRepository.pushCode(mockConfigObject);

    expect(result).toBe(true);
    expect(AppLogger.error).toHaveBeenCalled();
  });

  test('should retry fetching public key 3 times on failure', async () => {
    (axios.get as jest.Mock)
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValueOnce({
        data: { key: 'PUBLIC_KEY', key_id: 'KEY_ID' },
      });

    await ManageRepository.pushCode(mockConfigObject);

    // fetchPublicKeyWithRetry calls axios.get() 3 times (implementation behavior)
    expect(axios.get).toHaveBeenCalledTimes(3);
  });
});
