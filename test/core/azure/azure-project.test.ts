jest.setTimeout(30000);

// Mock setImmediate to execute callbacks immediately
global.setImmediate = jest.fn((callback: (...args: unknown[]) => void) => {
  callback();
}) as unknown as typeof setImmediate;

// Mock child_process
const mockSpawn = jest.fn();
const mockExecSync = jest.fn();

jest.mock('child_process', () => ({
  spawn: mockSpawn,
  execSync: mockExecSync,
}));

// Mock base-project.js
jest.mock('../../../src/core/base-project.js', () => {
  return {
    __esModule: true,
    default: (() => {
      class BaseProjectMock {
        config: Record<string, unknown>;
        command: Record<string, unknown>;
        constructor(
          command: Record<string, unknown>,
          config: Record<string, unknown>,
        ) {
          this.config = config;
          this.command = command;
        }
        createProject = jest.fn(() => Promise.resolve(true));
        destroyProject = jest.fn(() => Promise.resolve(true));
        createFile = jest.fn();
        deleteFolder = jest.fn(() => Promise.resolve());
      }
      return BaseProjectMock;
    })(),
  };
});

// Mock AppLogger
jest.mock('../../../src/logger/appLogger.js', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock ProgressBar
jest.mock('../../../src/logger/progressLogger.js', () => ({
  __esModule: true,
  default: {
    createProgressBar: jest.fn(() => ({
      start: jest.fn(),
      update: jest.fn(),
      stop: jest.fn(),
      increment: jest.fn(),
    })),
  },
}));

jest.mock('../../../src/core/utils/statusUpdater-utils.js', () => ({
  updateStatusFile: jest.fn(),
}));

jest.mock('../../../src/core/utils/executeCommandWithRetry-utils.js', () => ({
  executeCommandWithRetry: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../src/core/setup-application.js', () => ({
  __esModule: true,
  default: class CreateApplicationMock {
    destroyApp = jest.fn(() => Promise.resolve());
  },
}));

jest.mock('../../../src/core/azure/azure-tf-backend.js', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve(true)),
  },
}));

jest.mock('../../../src/core/azure/azure-iam.js', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve(true)),
  },
}));

jest.mock('../../../src/config/system.js', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      getConfig: jest.fn(() => ({
        command: 'new',
        project_name: 'test-project',
        environment: 'dev',
        cloud_provider: 'azure',
        location: 'eastus',
      })),
    })),
  },
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
}));

import AzureProject from '../../../src/core/azure/azure-project.js';
import { AppLogger } from '../../../src/logger/appLogger.js';
import SystemConfig from '../../../src/config/system.js';
import { createMockTerraformProcess } from '../../utils/terraformMock-utils.js';
import ProgressBar from '../../../src/logger/progressLogger.js';

const mockExit = jest
  .spyOn(process, 'exit')
  .mockImplementation((() => {}) as unknown as (code?: number) => never);

describe('AzureProject', () => {
  let azureProject: InstanceType<typeof AzureProject>;
  let mockCommand: { id: string };

  beforeEach(() => {
    jest.clearAllMocks();
    mockExit.mockClear();
    mockSpawn.mockClear();
    mockExecSync.mockClear();

    mockCommand = {
      id: 'create',
    };

    azureProject = new AzureProject(mockCommand, {
      project_name: 'test-project',
      cloud_provider: 'azure',
      location: 'eastus',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tenantId: 'test-tenant-id',
      subscriptionId: 'test-subscription-id',
    });
  });

  describe('runTerraformApply', () => {
    test('should successfully apply terraform', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const applyPromise = azureProject.runTerraformApply(
        '/project/infrastructure',
        'module.vnet',
      );

      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await applyPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'terraform',
        expect.arrayContaining(['apply', '-no-color', '-auto-approve']),
        expect.any(Object),
      );
    });

    test('should handle terraform apply with module target for new command', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);
      (SystemConfig.getInstance().getConfig as jest.Mock).mockReturnValue({
        command: 'new',
      });

      const applyPromise = azureProject.runTerraformApply(
        '/project/infrastructure',
        'module.vnet',
        'vnet',
      );

      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await applyPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'terraform',
        expect.arrayContaining(['-target=module.vnet']),
        expect.any(Object),
      );
    });

    test('should accumulate stderr without immediate rejection', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const applyPromise = azureProject.runTerraformApply(
        '/project/infrastructure',
      );

      setTimeout(() => {
        // Emit stderr data multiple times - should accumulate, not reject immediately
        mockProcess.stderr.emit('data', 'Warning: deprecated syntax\n');
        mockProcess.stderr.emit('data', 'Notice: resource exists\n');
        // Complete successfully despite stderr
        mockProcess.emit('close', 0);
      }, 10);

      // Should NOT reject despite stderr (key difference from AWS)
      await expect(applyPromise).resolves.toBeUndefined();
      expect(AppLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Warning: deprecated syntax'),
      );
    });

    test('should reject on non-zero exit code with accumulated stderr', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const applyPromise = azureProject.runTerraformApply(
        '/project/infrastructure',
      );

      setTimeout(() => {
        // Accumulate stderr
        mockProcess.stderr.emit('data', 'Error: invalid config\n');
        mockProcess.stderr.emit('data', 'Error: resource not found\n');
        // Then fail with exit code
        mockProcess.emit('close', 1);
      }, 10);

      await expect(applyPromise).rejects.toThrow(
        'Terraform apply process exited with code 1',
      );
      // Verify stderr was logged
      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error: invalid config'),
        true,
      );
    });

    test('should include var file in terraform apply command', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const applyPromise = azureProject.runTerraformApply(
        '/project/infrastructure',
        undefined,
        undefined,
        'terraform.tfvars',
      );

      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await applyPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'terraform',
        expect.arrayContaining(['-var-file=terraform.tfvars']),
        expect.any(Object),
      );
    });

    test('should increment progress bar when resources are created', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);
      const mockProgressBar = {
        start: jest.fn(),
        update: jest.fn(),
        stop: jest.fn(),
        increment: jest.fn(),
      };
      (ProgressBar.createProgressBar as jest.Mock).mockReturnValue(
        mockProgressBar,
      );

      const applyPromise = azureProject.runTerraformApply(
        '/project/infrastructure',
        'module.vnet',
      );

      setTimeout(() => {
        mockProcess.stdout.emit(
          'data',
          'module.vnet: Creating...\nmodule.vnet: Creation complete after 5s [id=vnet-12345]\n',
        );
        mockProcess.emit('close', 0);
      }, 10);

      await applyPromise;

      expect(mockProgressBar.start).toHaveBeenCalledWith(100, 0, {
        message: 'Terraform apply in progress...',
      });
      expect(mockProgressBar.increment).toHaveBeenCalled();
      expect(mockProgressBar.stop).toHaveBeenCalled();
    });

    test('should verify spawn options with correct stdio and cwd', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const applyPromise = azureProject.runTerraformApply(
        '/project/infrastructure',
        'module.vnet',
      );

      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await applyPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'terraform',
        expect.any(Array),
        expect.objectContaining({
          cwd: '/project/infrastructure',
          env: process.env,
          stdio: ['inherit', 'pipe', 'pipe'],
        }),
      );
    });

    test('should handle module targeting for resume command', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);
      (SystemConfig.getInstance().getConfig as jest.Mock).mockReturnValue({
        command: 'resume',
      });

      const applyPromise = azureProject.runTerraformApply(
        '/project/infrastructure',
        'module.vnet',
      );

      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await applyPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'terraform',
        expect.arrayContaining(['-target=module.vnet']),
        expect.any(Object),
      );
    });

    test('should handle module targeting for module command with module. prefix', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);
      (SystemConfig.getInstance as jest.Mock).mockReturnValue({
        getConfig: jest.fn().mockReturnValue({
          command: 'module',
        }),
      });

      const applyPromise = azureProject.runTerraformApply(
        '/project/infrastructure',
        'aks',
      );

      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await applyPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'terraform',
        expect.arrayContaining(['-target=module.aks']),
        expect.any(Object),
      );
    });

    test('should handle spawn error event', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const applyPromise = azureProject.runTerraformApply(
        '/project/infrastructure',
      );

      setTimeout(() => {
        mockProcess.emit('error', new Error('spawn ENOENT'));
      }, 10);

      await expect(applyPromise).rejects.toThrow('spawn ENOENT');
    });

    test('should handle exception thrown in try block', async () => {
      mockSpawn.mockImplementation(() => {
        throw new Error('Unexpected spawn error');
      });

      await expect(
        azureProject.runTerraformApply('/project/infrastructure'),
      ).rejects.toThrow('Unexpected spawn error');
    });
  });

  describe('runTerraformDestroy', () => {
    test('should successfully destroy terraform resources', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const destroyPromise = azureProject.runTerraformDestroy(
        '/project/infrastructure',
      );

      setTimeout(() => {
        // Azure destroy tracks progress by counting resources
        mockProcess.stdout.emit('data', 'Plan: 5 to destroy.\n');
        mockProcess.stdout.emit(
          'data',
          'module.vnet: Destruction complete after 2s\n',
        );
        mockProcess.emit('close', 0);
      }, 10);

      await destroyPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'terraform',
        expect.arrayContaining(['destroy', '-no-color', '-auto-approve']),
        expect.any(Object),
      );
    });

    test('should parse and track total resources to destroy', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);
      const mockProgressBar = {
        start: jest.fn(),
        update: jest.fn(),
        stop: jest.fn(),
        increment: jest.fn(),
      };
      (ProgressBar.createProgressBar as jest.Mock).mockReturnValue(
        mockProgressBar,
      );

      const destroyPromise = azureProject.runTerraformDestroy(
        '/project/infrastructure',
      );

      setTimeout(() => {
        // First emit plan with total count
        mockProcess.stdout.emit('data', 'Plan: 3 to destroy.\n');
        // Then emit destruction completions
        mockProcess.stdout.emit(
          'data',
          'module.vnet: Destruction complete after 1s\n' +
            'module.subnet: Destruction complete after 2s\n' +
            'module.nsg: Destruction complete after 1s\n',
        );
        mockProcess.emit('close', 0);
      }, 10);

      await destroyPromise;

      // Progress bar should update based on resource count
      expect(mockProgressBar.update).toHaveBeenCalled();
      expect(mockProgressBar.stop).toHaveBeenCalled();
    });

    test('should calculate progress percentage correctly', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);
      const mockProgressBar = {
        start: jest.fn(),
        update: jest.fn(),
        stop: jest.fn(),
        increment: jest.fn(),
      };
      (ProgressBar.createProgressBar as jest.Mock).mockReturnValue(
        mockProgressBar,
      );

      const destroyPromise = azureProject.runTerraformDestroy(
        '/project/infrastructure',
      );

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Plan: 4 to destroy.\n');
        // Destroy 2 out of 4 resources = 50%
        mockProcess.stdout.emit(
          'data',
          'module.resource1: Destruction complete after 1s\n' +
            'module.resource2: Destruction complete after 2s\n',
        );
        mockProcess.emit('close', 0);
      }, 10);

      await destroyPromise;

      // Should be called with 50% progress at some point
      const updateCalls = mockProgressBar.update.mock.calls;
      const hasExpectedProgress = updateCalls.some((call) => call[0] === 50);
      expect(hasExpectedProgress).toBe(true);
    });

    test('should handle module-specific destroy', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const destroyPromise = azureProject.runTerraformDestroy(
        '/project/infrastructure',
        'module.aks',
      );

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Plan: 1 to destroy.\n');
        mockProcess.stdout.emit(
          'data',
          'module.aks: Destruction complete after 5s\n',
        );
        mockProcess.emit('close', 0);
      }, 10);

      await destroyPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'terraform',
        expect.arrayContaining(['-target=module.aks']),
        expect.any(Object),
      );
    });

    test('should include var file in destroy command', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const destroyPromise = azureProject.runTerraformDestroy(
        '/project/infrastructure',
        undefined,
        'custom.tfvars',
      );

      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await destroyPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'terraform',
        expect.arrayContaining(['-var-file=custom.tfvars']),
        expect.any(Object),
      );
    });

    test('should stop progress bar and log error on stderr', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);
      const mockProgressBar = {
        start: jest.fn(),
        update: jest.fn(),
        stop: jest.fn(),
        increment: jest.fn(),
      };
      (ProgressBar.createProgressBar as jest.Mock).mockReturnValue(
        mockProgressBar,
      );

      const destroyPromise = azureProject.runTerraformDestroy(
        '/project/infrastructure',
      );

      setTimeout(() => {
        mockProcess.stderr.emit('data', 'Error: resource locked\n');
        mockProcess.emit('close', 1);
      }, 10);

      await expect(destroyPromise).rejects.toThrow(
        'Terraform destroy failed with exit code 1',
      );

      expect(mockProgressBar.stop).toHaveBeenCalled();
      expect(AppLogger.error).toHaveBeenCalledWith(
        'stderr: Error: resource locked\n',
      );
    });

    test('should handle spawn error event', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const destroyPromise = azureProject.runTerraformDestroy(
        '/project/infrastructure',
      );

      setTimeout(() => {
        mockProcess.emit('error', new Error('spawn ENOENT'));
      }, 10);

      await expect(destroyPromise).rejects.toThrow('spawn ENOENT');
    });

    test('should handle exception in try block', async () => {
      mockSpawn.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await expect(
        azureProject.runTerraformDestroy('/project/infrastructure'),
      ).rejects.toThrow('Unexpected error');
    });

    test('should verify spawn options with correct stdio and cwd', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const destroyPromise = azureProject.runTerraformDestroy('/custom/path');

      setTimeout(() => {
        mockProcess.emit('close', 0);
      }, 10);

      await destroyPromise;

      expect(mockSpawn).toHaveBeenCalledWith(
        'terraform',
        expect.any(Array),
        expect.objectContaining({
          cwd: '/custom/path',
          env: process.env,
          stdio: ['inherit', 'pipe', 'pipe'],
        }),
      );
    });

    test('should cap progress at 100%', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);
      const mockProgressBar = {
        start: jest.fn(),
        update: jest.fn(),
        stop: jest.fn(),
        increment: jest.fn(),
      };
      (ProgressBar.createProgressBar as jest.Mock).mockReturnValue(
        mockProgressBar,
      );

      const destroyPromise = azureProject.runTerraformDestroy(
        '/project/infrastructure',
      );

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Plan: 2 to destroy.\n');
        // Emit more destruction completions than expected (edge case)
        mockProcess.stdout.emit(
          'data',
          'module.resource1: Destruction complete after 1s\n' +
            'module.resource2: Destruction complete after 1s\n' +
            'module.resource3: Destruction complete after 1s\n',
        );
        mockProcess.emit('close', 0);
      }, 10);

      await destroyPromise;

      // Verify progress never exceeds 100
      const updateCalls = mockProgressBar.update.mock.calls;
      const allProgressValues = updateCalls.map((call) => call[0]);
      const maxProgress = Math.max(...allProgressValues);
      expect(maxProgress).toBeLessThanOrEqual(100);
    });
  });
});
