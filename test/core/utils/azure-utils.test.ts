import { azExecAsync, AzureCommandError } from '../../../src/core/utils/azure-utils.js';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Mock child_process
jest.mock('child_process');

describe('azExecAsync', () => {
  let mockSpawn: jest.MockedFunction<typeof spawn>;
  let mockChildProcess: any;

  beforeEach(() => {
    mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
    
    // Create a mock child process that extends EventEmitter
    mockChildProcess = new EventEmitter();
    mockChildProcess.stdout = new EventEmitter();
    mockChildProcess.stderr = new EventEmitter();
    mockChildProcess.kill = jest.fn();
    mockChildProcess.killed = false;

    mockSpawn.mockReturnValue(mockChildProcess as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Success cases', () => {
    it('should execute command successfully and return stdout', async () => {
      const promise = azExecAsync('az account show --output json');

      // Simulate successful execution
      setTimeout(() => {
        mockChildProcess.stdout.emit('data', Buffer.from('{"id": "test-subscription"}'));
        mockChildProcess.emit('close', 0);
      }, 10);

      const result = await promise;
      expect(result).toBe('{"id": "test-subscription"}');
      expect(mockSpawn).toHaveBeenCalledWith('az', ['account', 'show', '--output', 'json'], expect.any(Object));
    });

    it('should return empty string when stdio is inherit', async () => {
      const promise = azExecAsync('az group delete --name test --yes', { stdio: 'inherit' });

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
      const promise = azExecAsync('az login --service-principal --username test --password "$SECRET"', {
        env: { ...process.env, SECRET: 'my-secret' },
      });

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
      const promise = azExecAsync('az group create --name test --location eastus');

      setTimeout(() => {
        mockChildProcess.stderr.emit('data', Buffer.from('Resource already exists'));
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
        mockChildProcess.stdout.emit('data', Buffer.from('Creating storage account...'));
        mockChildProcess.stderr.emit('data', Buffer.from('Error: Invalid name'));
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
        const sanitized = azError.stderr.replace(new RegExp(secret, 'g'), '[REDACTED]');
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
        ['group', 'create', '--name', 'my-rg', '--location', 'eastus', '--tags', 'env=prod'],
        expect.any(Object),
      );
    });

    it('should handle commands with quoted arguments', async () => {
      const promise = azExecAsync('az group create --name "my resource group" --location eastus');

      process.nextTick(() => {
        mockChildProcess.emit('close', 0);
      });

      await promise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'az',
        ['group', 'create', '--name', '"my', 'resource', 'group"', '--location', 'eastus'],
        expect.any(Object),
      );
    });
  });
});
