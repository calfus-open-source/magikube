import {
  azExecAsync,
  AzureCommandError,
  checkAzureLogin,
  displayCurrentAccount,
  getCurrentSubscriptionId,
  getCurrentTenantId,
  listSubscriptions,
  getAccountInfo,
  loginWithServicePrincipal,
  logout,
} from '../../../src/core/utils/azure-utils.js';
import { spawn, execSync } from 'child_process';
import { EventEmitter } from 'events';
import { AppLogger } from '../../../src/logger/appLogger.js';

// Mock child_process
jest.mock('child_process');

jest.mock('../../../src/logger/appLogger.js', () => ({
  AppLogger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('azExecAsync', () => {
  let mockSpawn: jest.MockedFunction<typeof spawn>;
  let mockChildProcess: EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: jest.Mock;
    killed: boolean;
  };

  beforeEach(() => {
    mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

    // Create a mock child process that extends EventEmitter
    const proc = new EventEmitter() as typeof mockChildProcess;
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = jest.fn();
    proc.killed = false;
    mockChildProcess = proc;

    mockSpawn.mockReturnValue(
      mockChildProcess as unknown as ReturnType<typeof spawn>,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Success cases', () => {
    it('should execute command successfully and return stdout', async () => {
      const promise = azExecAsync('az account show --output json');

      // Simulate successful execution
      setTimeout(() => {
        mockChildProcess.stdout.emit(
          'data',
          Buffer.from('{"id": "test-subscription"}'),
        );
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await promise;
      expect(result).toBe('{"id": "test-subscription"}');
      expect(mockSpawn).toHaveBeenCalledWith(
        'az',
        ['account', 'show', '--output', 'json'],
        expect.any(Object),
      );
    });

    it('should return empty string when stdio is inherit', async () => {
      const promise = azExecAsync('az group delete --name test --yes', {
        stdio: 'inherit',
      });

      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await promise;
      expect(result).toBe('');
    });

    it('should handle multiline stdout correctly', async () => {
      const promise = azExecAsync('az account list');

      setTimeout(() => {
        mockChildProcess.stdout.emit('data', Buffer.from('Line 1\n'));
        mockChildProcess.stdout.emit('data', Buffer.from('Line 2\n'));
        mockChildProcess.stdout.emit('data', Buffer.from('Line 3'));
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await promise;
      expect(result).toBe('Line 1\nLine 2\nLine 3');
    });

    it('should pass custom environment variables', async () => {
      const promise = azExecAsync(
        'az login --service-principal --username test --password "$SECRET"',
        {
          env: { ...process.env, SECRET: 'my-secret' },
        },
      );

      setTimeout(() => {
        mockChildProcess.emit('close', 0);
      }, 10);

      await promise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'az',
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({ SECRET: 'my-secret' }),
        }),
      );
    });
  });

  describe('Failure cases', () => {
    it('should reject with AzureCommandError on non-zero exit code', async () => {
      const promise = azExecAsync(
        'az group create --name test --location eastus',
      );

      setTimeout(() => {
        mockChildProcess.stderr.emit(
          'data',
          Buffer.from('Resource already exists'),
        );
        mockChildProcess.emit('close', 1);
      }, 10);

      await expect(promise).rejects.toThrow(AzureCommandError);
      await expect(promise).rejects.toMatchObject({
        command: 'az group create --name test --location eastus',
        exitCode: 1,
        stderr: 'Resource already exists',
        timedOut: false,
      });
    });

    it('should reject with AzureCommandError on spawn error', async () => {
      const promise = azExecAsync('az invalid-command');

      setTimeout(() => {
        mockChildProcess.emit('error', new Error('spawn ENOENT'));
      }, 10);

      await expect(promise).rejects.toThrow(AzureCommandError);
      await expect(promise).rejects.toMatchObject({
        command: 'az invalid-command',
        exitCode: null,
        stderr: 'spawn ENOENT',
        timedOut: false,
      });
    });

    it('should collect both stdout and stderr on failure', async () => {
      const promise = azExecAsync('az storage account create --name test');

      setTimeout(() => {
        mockChildProcess.stdout.emit(
          'data',
          Buffer.from('Creating storage account...'),
        );
        mockChildProcess.stderr.emit(
          'data',
          Buffer.from('Error: Invalid name'),
        );
        mockChildProcess.emit('close', 1);
      }, 10);

      await expect(promise).rejects.toMatchObject({
        stdout: 'Creating storage account...',
        stderr: 'Error: Invalid name',
      });
    });
  });

  describe('Timeout handling', () => {
    it('should timeout and kill process after specified duration', async () => {
      jest.useFakeTimers();

      const promise = azExecAsync('az group delete --name test', {
        timeout: 1000, // 1 second
      });

      // Advance time to trigger timeout
      jest.advanceTimersByTime(1000);

      // Process still running after timeout, emit close event
      setImmediate(() => {
        mockChildProcess.emit('close', null);
      });

      // Run all pending timers and microtasks
      jest.runAllTimers();

      // Now await the promise rejection
      await expect(promise).rejects.toThrow(AzureCommandError);
      await expect(promise).rejects.toMatchObject({
        timedOut: true,
      });

      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');

      jest.useRealTimers();
    });

    it('should force kill with SIGKILL if SIGTERM fails', async () => {
      jest.useFakeTimers();

      const promise = azExecAsync('az group delete --name test', {
        timeout: 1000,
      });

      // Advance time to trigger initial timeout and SIGTERM
      jest.advanceTimersByTime(1000);

      // Simulate process not responding to SIGTERM
      // Advance another 5 seconds for force kill
      jest.advanceTimersByTime(5000);

      // Process finally closes
      process.nextTick(() => {
        mockChildProcess.emit('close', null);
      });

      await jest.runAllTimersAsync();

      await expect(promise).rejects.toThrow(AzureCommandError);

      // Should be called twice: once with SIGTERM, once with SIGKILL
      expect(mockChildProcess.kill).toHaveBeenCalledTimes(2);
      expect(mockChildProcess.kill).toHaveBeenNthCalledWith(1, 'SIGTERM');
      expect(mockChildProcess.kill).toHaveBeenNthCalledWith(2, 'SIGKILL');

      jest.useRealTimers();
    });

    it('should clear timeout on successful completion', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const promise = azExecAsync('az account show', { timeout: 5000 });

      // Simulate immediate success
      process.nextTick(() => {
        mockChildProcess.emit('close', 0);
      });

      await promise;

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Cancellation via AbortSignal', () => {
    it('should cancel execution when signal is aborted', async () => {
      const abortController = new AbortController();

      const promise = azExecAsync('az group create --name test', {
        signal: abortController.signal,
      });

      // Abort immediately
      abortController.abort();

      // Process closes after abort
      process.nextTick(() => {
        mockChildProcess.emit('close', null);
      });

      await expect(promise).rejects.toThrow(AzureCommandError);
      await expect(promise).rejects.toMatchObject({
        stderr: 'Command was cancelled',
      });

      expect(mockChildProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });
  });

  describe('Secret redaction in error handling', () => {
    it('should preserve ability to redact secrets in caller error handling', async () => {
      const secret = 'super-secret-password';
      const promise = azExecAsync(
        `az login --service-principal --username test --password "$AZURE_SP_SECRET"`,
        {
          env: { ...process.env, AZURE_SP_SECRET: secret },
        },
      );

      process.nextTick(() => {
        mockChildProcess.stderr.emit(
          'data',
          Buffer.from(`Login failed with password ${secret}`),
        );
        mockChildProcess.emit('close', 1);
      });

      try {
        await promise;
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AzureCommandError);
        const azError = error as AzureCommandError;

        // Error should contain the secret in stderr
        expect(azError.stderr).toContain(secret);

        // Caller can redact it
        const sanitized = azError.stderr.replace(
          new RegExp(secret, 'g'),
          '[REDACTED]',
        );
        expect(sanitized).not.toContain(secret);
        expect(sanitized).toContain('[REDACTED]');
      }
    });
  });

  describe('stdio option handling', () => {
    it('should use pipe stdio by default', async () => {
      const promise = azExecAsync('az account show');

      process.nextTick(() => {
        mockChildProcess.emit('close', 0);
      });

      await promise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'az',
        expect.any(Array),
        expect.objectContaining({
          stdio: ['ignore', 'pipe', 'pipe'],
        }),
      );
    });

    it('should use inherit stdio when specified', async () => {
      const promise = azExecAsync('az group delete --name test', {
        stdio: 'inherit',
      });

      process.nextTick(() => {
        mockChildProcess.emit('close', 0);
      });

      await promise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'az',
        expect.any(Array),
        expect.objectContaining({
          stdio: 'inherit',
        }),
      );
    });
  });

  describe('Command parsing', () => {
    it('should correctly parse command with multiple arguments', async () => {
      const promise = azExecAsync(
        'az group create --name my-rg --location eastus --tags env=prod',
      );

      process.nextTick(() => {
        mockChildProcess.emit('close', 0);
      });

      await promise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'az',
        [
          'group',
          'create',
          '--name',
          'my-rg',
          '--location',
          'eastus',
          '--tags',
          'env=prod',
        ],
        expect.any(Object),
      );
    });

    it('should handle commands with quoted arguments', async () => {
      const promise = azExecAsync(
        'az group create --name "my resource group" --location eastus',
      );

      process.nextTick(() => {
        mockChildProcess.emit('close', 0);
      });

      await promise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'az',
        [
          'group',
          'create',
          '--name',
          '"my',
          'resource',
          'group"',
          '--location',
          'eastus',
        ],
        expect.any(Object),
      );
    });
  });
});

describe('checkAzureLogin', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when az account show succeeds', () => {
    mockExecSync.mockReturnValue(Buffer.from(''));

    const result = checkAzureLogin();

    expect(result).toBe(true);
    expect(mockExecSync).toHaveBeenCalledWith('az account show', {
      stdio: 'pipe',
    });
  });

  it('should return false when az account show throws', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('Not logged in');
    });

    const result = checkAzureLogin();

    expect(result).toBe(false);
  });
});

describe('displayCurrentAccount', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should display account info when execSync succeeds', () => {
    const accountInfo = 'Name: TestAccount\nSubscriptionId: sub-123';
    mockExecSync.mockReturnValue(accountInfo);

    displayCurrentAccount();

    expect(AppLogger.info).toHaveBeenCalledWith(
      'Currently logged in account details:',
      true,
    );
    expect(AppLogger.info).toHaveBeenCalledWith(accountInfo, true);
  });

  it('should log error when execSync throws', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('Failed');
    });

    displayCurrentAccount();

    expect(AppLogger.error).toHaveBeenCalledWith(
      'Failed to get current account details',
      true,
    );
  });
});

describe('getCurrentSubscriptionId', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return trimmed subscription id on success', () => {
    mockExecSync.mockReturnValue('  sub-123  \n');

    const result = getCurrentSubscriptionId();

    expect(result).toBe('sub-123');
  });

  it('should return null and log error on failure', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('Failed');
    });

    const result = getCurrentSubscriptionId();

    expect(result).toBeNull();
    expect(AppLogger.error).toHaveBeenCalledWith(
      'Failed to get current subscription ID',
      true,
    );
  });
});

describe('getCurrentTenantId', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return trimmed tenant id on success', () => {
    mockExecSync.mockReturnValue('tenant-456\n');

    const result = getCurrentTenantId();

    expect(result).toBe('tenant-456');
  });

  it('should return null and log error on failure', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('Failed');
    });

    const result = getCurrentTenantId();

    expect(result).toBeNull();
    expect(AppLogger.error).toHaveBeenCalledWith(
      'Failed to get current tenant ID',
      true,
    );
  });
});

describe('listSubscriptions', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return parsed subscription array on success', async () => {
    const subscriptions = [
      {
        Name: 'Sub1',
        SubscriptionId: 'id-1',
        TenantId: 'tid-1',
        State: 'Enabled',
      },
    ];
    mockExecSync.mockReturnValue(JSON.stringify(subscriptions));

    const result = await listSubscriptions();

    expect(result).toEqual(subscriptions);
  });

  it('should return empty array and log error on failure', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('Network error');
    });

    const result = await listSubscriptions();

    expect(result).toEqual([]);
    expect(AppLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error listing subscriptions'),
      true,
    );
  });
});

describe('getAccountInfo', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return parsed account info on success', () => {
    const accountInfo = {
      id: 'sub-123',
      tenantId: 'tenant-456',
      name: 'TestAccount',
    };
    mockExecSync.mockReturnValue(JSON.stringify(accountInfo));

    const result = getAccountInfo();

    expect(result).toEqual(accountInfo);
  });

  it('should return null and log error on failure', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('Failed');
    });

    const result = getAccountInfo();

    expect(result).toBeNull();
    expect(AppLogger.error).toHaveBeenCalledWith(
      'Failed to get account information',
      true,
    );
  });
});

describe('loginWithServicePrincipal', () => {
  let mockSpawn: jest.MockedFunction<typeof spawn>;
  let mockChildProcess: EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: jest.Mock;
    killed: boolean;
  };

  beforeEach(() => {
    mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

    const proc = new EventEmitter() as typeof mockChildProcess;
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = jest.fn();
    proc.killed = false;
    mockChildProcess = proc;

    mockSpawn.mockReturnValue(
      mockChildProcess as unknown as ReturnType<typeof spawn>,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return true and log success when azExecAsync resolves', async () => {
    const promise = loginWithServicePrincipal(
      'client-id',
      'client-secret',
      'tenant-id',
    );

    // Simulate successful spawn completion
    process.nextTick(() => {
      mockChildProcess.emit('close', 0);
    });

    const result = await promise;

    expect(result).toBe(true);
    expect(AppLogger.info).toHaveBeenCalledWith(
      'Logging in with service principal...',
      true,
    );
    expect(AppLogger.info).toHaveBeenCalledWith(
      'Successfully logged in with service principal',
      true,
    );
  });

  it('should return false and redact secret in error message when azExecAsync rejects', async () => {
    const secret = 'my-super-secret';

    const promise = loginWithServicePrincipal('client-id', secret, 'tenant-id');

    // Simulate failed spawn with non-zero exit code
    process.nextTick(() => {
      mockChildProcess.stderr.emit(
        'data',
        Buffer.from(`Authentication failed for ${secret}`),
      );
      mockChildProcess.emit('close', 1);
    });

    const result = await promise;

    expect(result).toBe(false);
    // Verify error was logged
    expect(AppLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to login with service principal'),
      true,
    );
    // Verify the secret does not appear in the logged error message
    const errorCall = (AppLogger.error as jest.Mock).mock.calls.find(
      (call) =>
        typeof call[0] === 'string' &&
        call[0].includes('Failed to login with service principal'),
    );
    expect(errorCall).toBeDefined();
    expect(errorCall![0]).not.toContain(secret);
  });
});

describe('logout', () => {
  const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when az logout succeeds', async () => {
    mockExecSync.mockReturnValue('');

    const result = await logout();

    expect(result).toBe(true);
    expect(mockExecSync).toHaveBeenCalledWith('az logout', {
      encoding: 'utf8',
    });
    expect(AppLogger.info).toHaveBeenCalledWith(
      'Successfully logged out of Azure CLI',
      true,
    );
  });

  it('should return false and log error when az logout throws', async () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('Logout failed');
    });

    const result = await logout();

    expect(result).toBe(false);
    expect(AppLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to logout'),
      true,
    );
  });
});
