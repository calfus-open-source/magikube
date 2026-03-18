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
const mockBaseCreateProject = jest.fn(() => Promise.resolve(true));

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
        createFile = jest.fn();
        destroyProject = jest.fn(() => Promise.resolve(true));
        deleteFolder = jest.fn(() => Promise.resolve());
        getConfigString(key: string): string {
          const val = this.config[key];
          return typeof val === 'string' ? val : String(val ?? '');
        }
      }
      BaseProjectMock.prototype.createProject = mockBaseCreateProject;
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

jest.mock('../../../src/core/constants/constants.js', () => ({
  azure_destroy_modules: ['module.vnet', 'module.aks'],
}));

jest.mock('../../../src/core/azure/azure-profile.js', () => ({
  __esModule: true,
  default: {
    getProfiles: jest.fn(),
  },
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

import AzureProject from '../../../src/core/azure/azure-project.js';
import { AppLogger } from '../../../src/logger/appLogger.js';
import SystemConfig from '../../../src/config/system.js';
import { createMockTerraformProcess } from '../../utils/terraformMock-utils.js';
import ProgressBar from '../../../src/logger/progressLogger.js';
import AzureTerraformBackend from '../../../src/core/azure/azure-tf-backend.js';
import AzureProfile from '../../../src/core/azure/azure-profile.js';
import fs from 'fs';
import * as jsyaml from 'js-yaml';

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

  describe('createProject', () => {
    test('should call super.createProject and AzureTerraformBackend.create when command is new', async () => {
      const newProject = new AzureProject(mockCommand, {
        command: 'new',
        project_name: 'test-project',
        azure_location: 'eastus',
        azure_client_id: 'client-id',
        azure_client_secret: 'client-secret',
        azure_tenant_id: 'tenant-id',
        azure_subscription_id: 'sub-id',
      });

      mockBaseCreateProject.mockClear();

      await newProject.createProject('test-project', '/some/path');

      expect(mockBaseCreateProject).toHaveBeenCalledWith(
        'test-project',
        '/some/path',
      );
      expect(AzureTerraformBackend.create).toHaveBeenCalledWith(
        newProject,
        'test-project',
        'eastus',
        'client-id',
        'client-secret',
        'tenant-id',
        'sub-id',
      );
    });

    test('should NOT call super.createProject but still call AzureTerraformBackend.create when command is not new', async () => {
      const moduleProject = new AzureProject(mockCommand, {
        command: 'module',
        project_name: 'test-project',
        azure_location: 'eastus',
        azure_client_id: 'client-id',
        azure_client_secret: 'client-secret',
        azure_tenant_id: 'tenant-id',
        azure_subscription_id: 'sub-id',
      });

      mockBaseCreateProject.mockClear();

      await moduleProject.createProject('test-project', '/some/path');

      expect(mockBaseCreateProject).not.toHaveBeenCalled();
      expect(AzureTerraformBackend.create).toHaveBeenCalledWith(
        moduleProject,
        'test-project',
        'eastus',
        'client-id',
        'client-secret',
        'tenant-id',
        'sub-id',
      );
    });
  });

  describe('createCommon', () => {
    test('should call all module creation methods which invoke createFile', async () => {
      await azureProject.createCommon('/base/path');

      // createCommon calls: createVNet(4) + createACR(3) + createAKS(4) +
      // createApplicationGateway(3) + createBastion(4) + createKeyVault(3) +
      // createSecurityGroups(3) + createSqlServer(3) = 27 calls total
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createFileMock = (azureProject as any).createFile as jest.Mock;
      expect(createFileMock).toHaveBeenCalledTimes(27);
    });
  });

  describe('Module creation methods', () => {
    test.each([
      ['createVNet', 4],
      ['createACR', 3],
      ['createApplicationGateway', 3],
      ['createBastion', 4],
      ['createKeyVault', 3],
      ['createSecurityGroups', 3],
      ['createSqlServer', 3],
      ['createResourceGroup', 2],
      ['createAKS', 4],
      ['createSQLDatabase', 2],
      ['createDNSZone', 2],
      ['createIngressController', 2],
      ['createEnvironment', 2],
    ])(
      '%s should call createFile the correct number of times (%i)',
      async (methodName, expectedCalls) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const createFileMock = (azureProject as any).createFile as jest.Mock;
        createFileMock.mockClear();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (azureProject as any)[methodName]('/base/path');

        expect(createFileMock).toHaveBeenCalledTimes(expectedCalls);
      },
    );
  });

  describe('runTerraformInit', () => {
    test('should resolve on successful terraform init with progress updates', async () => {
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

      const initPromise = azureProject.runTerraformInit(
        '/project/infrastructure',
        'backend.hcl',
        'test-project',
      );

      setTimeout(() => {
        mockProcess.stdout.emit('data', 'Initializing modules...\n');
        mockProcess.stdout.emit('data', 'Initializing provider plugins...\n');
        mockProcess.stdout.emit('data', 'Configuring backend...\n');
        mockProcess.stdout.emit(
          'data',
          'Terraform has been successfully initialized!\n',
        );
        mockProcess.emit('close', 0);
      }, 10);

      await initPromise;

      expect(mockProgressBar.start).toHaveBeenCalledWith(100, 0, {
        message: 'Initializing Terraform backend for Azure...',
      });
      expect(mockProgressBar.update).toHaveBeenCalledWith(25, {
        message: 'Initializing modules...',
      });
      expect(mockProgressBar.update).toHaveBeenCalledWith(50, {
        message: 'Initializing provider plugins...',
      });
      expect(mockProgressBar.update).toHaveBeenCalledWith(75, {
        message: 'Configuring backend...',
      });
      expect(mockProgressBar.update).toHaveBeenCalledWith(100, {
        message: 'Initialization complete',
      });
      expect(mockProgressBar.stop).toHaveBeenCalled();
    });

    test('should reject when terraform init fails with non-zero exit code', async () => {
      const mockProcess = createMockTerraformProcess();
      mockSpawn.mockReturnValue(mockProcess);

      const initPromise = azureProject.runTerraformInit(
        '/project/infrastructure',
        'backend.hcl',
        'test-project',
      );

      setTimeout(() => {
        mockProcess.stderr.emit(
          'data',
          'Error: backend initialization failed\n',
        );
        mockProcess.emit('close', 1);
      }, 10);

      await expect(initPromise).rejects.toThrow(
        'Terraform init failed with code 1',
      );
    });

    test('should reject when spawn throws an error', async () => {
      mockSpawn.mockImplementation(() => {
        throw new Error('spawn ENOENT');
      });

      await expect(
        azureProject.runTerraformInit(
          '/project/infrastructure',
          'backend.hcl',
          'test-project',
        ),
      ).rejects.toThrow('spawn ENOENT');
    });
  });

  describe('runTerraformDestroyTemplate', () => {
    let destroyProject: InstanceType<typeof AzureProject>;

    beforeEach(() => {
      destroyProject = new AzureProject(mockCommand, {
        project_name: 'test-project',
        azure_location: 'eastus',
        azure_client_id: 'test-client-id',
        azure_client_secret: 'test-client-secret',
        azure_tenant_id: 'test-tenant-id',
        azure_subscription_id: 'test-subscription-id',
      });
    });

    test('should spawn terraform destroy for each module with matching status', async () => {
      const mockProcess1 = createMockTerraformProcess();
      const mockProcess2 = createMockTerraformProcess();
      mockSpawn
        .mockReturnValueOnce(mockProcess1)
        .mockReturnValueOnce(mockProcess2);

      const status = {
        modules: {
          'module.vnet': 'success',
          'module.aks': 'fail',
        },
      };

      const destroyPromise = destroyProject.runTerraformDestroyTemplate(
        '/project/infrastructure',
        'vars.tfvars',
        status,
      );

      setTimeout(() => {
        mockProcess1.emit('close', 0);
      }, 10);
      setTimeout(() => {
        mockProcess2.emit('close', 0);
      }, 50);

      await destroyPromise;

      expect(mockSpawn).toHaveBeenCalledTimes(2);
      expect(mockSpawn).toHaveBeenCalledWith(
        'terraform',
        expect.arrayContaining(['-target=module.vnet']),
        expect.any(Object),
      );
      expect(mockSpawn).toHaveBeenCalledWith(
        'terraform',
        expect.arrayContaining(['-target=module.aks']),
        expect.any(Object),
      );
    });

    test('should skip modules with pending status', async () => {
      const status = {
        modules: {
          'module.vnet': 'pending',
          'module.aks': 'pending',
        },
      };

      await destroyProject.runTerraformDestroyTemplate(
        '/project/infrastructure',
        undefined,
        status,
      );

      // No terraform processes should be spawned for pending modules
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    test('should call AzureTerraformBackend.delete after module destruction', async () => {
      const status = {
        modules: {
          'module.vnet': 'pending',
          'module.aks': 'pending',
        },
      };

      await destroyProject.runTerraformDestroyTemplate(
        '/project/infrastructure',
        undefined,
        status,
      );

      expect(AzureTerraformBackend.delete).toHaveBeenCalledWith(
        destroyProject,
        'test-project',
        'eastus',
        'test-client-id',
        'test-client-secret',
        'test-tenant-id',
        'test-subscription-id',
      );
    });

    test('should call deleteFolder when backend delete returns true', async () => {
      (AzureTerraformBackend.delete as jest.Mock).mockResolvedValue(true);

      const status = {
        modules: {
          'module.vnet': 'pending',
          'module.aks': 'pending',
        },
      };

      await destroyProject.runTerraformDestroyTemplate(
        '/project/infrastructure',
        undefined,
        status,
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deleteFolderMock = (destroyProject as any)
        .deleteFolder as jest.Mock;
      expect(deleteFolderMock).toHaveBeenCalledWith('test-project');
    });
  });

  describe('editKubeConfigFile', () => {
    const mockFs = fs as jest.Mocked<typeof fs>;

    test('should write merged config when new config exists but no existing kubeconfig', async () => {
      (mockFs.existsSync as jest.Mock).mockImplementation(
        (filePath: string) => {
          if (filePath === '/new/cluster/config') return true;
          return false; // kubeconfig doesn't exist
        },
      );

      const newConfigYaml = jsyaml.dump({
        clusters: [{ name: 'new-cluster', cluster: { server: 'https://new' } }],
        contexts: [
          { name: 'new-context', context: { cluster: 'new-cluster' } },
        ],
        users: [{ name: 'new-user', user: { token: 'abc' } }],
        'current-context': 'new-context',
      });

      (mockFs.readFileSync as jest.Mock).mockReturnValue(newConfigYaml);

      await azureProject.editKubeConfigFile('/new/cluster/config');

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const writtenContent = (mockFs.writeFileSync as jest.Mock).mock
        .calls[0][1];
      const parsed = jsyaml.load(writtenContent) as Record<string, unknown>;
      expect((parsed.clusters as Array<{ name: string }>)[0].name).toBe(
        'new-cluster',
      );
      expect(parsed['current-context']).toBe('new-context');
    });

    test('should merge into existing kubeconfig when both files exist', async () => {
      (mockFs.existsSync as jest.Mock).mockReturnValue(true);

      const existingConfigYaml = jsyaml.dump({
        clusters: [{ name: 'old-cluster', cluster: { server: 'https://old' } }],
        contexts: [
          { name: 'old-context', context: { cluster: 'old-cluster' } },
        ],
        users: [{ name: 'old-user', user: { token: 'old-token' } }],
        'current-context': 'old-context',
      });

      const newConfigYaml = jsyaml.dump({
        clusters: [{ name: 'new-cluster', cluster: { server: 'https://new' } }],
        contexts: [
          { name: 'new-context', context: { cluster: 'new-cluster' } },
        ],
        users: [{ name: 'new-user', user: { token: 'new-token' } }],
        'current-context': 'new-context',
      });

      (mockFs.readFileSync as jest.Mock)
        .mockReturnValueOnce(newConfigYaml)
        .mockReturnValueOnce(existingConfigYaml);

      await azureProject.editKubeConfigFile('/new/cluster/config');

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const writtenContent = (mockFs.writeFileSync as jest.Mock).mock
        .calls[0][1];
      const parsed = jsyaml.load(writtenContent) as Record<string, unknown>;
      const clusters = parsed.clusters as Array<{ name: string }>;
      expect(clusters).toHaveLength(2);
      expect(clusters.map((c) => c.name)).toContain('old-cluster');
      expect(clusters.map((c) => c.name)).toContain('new-cluster');
    });

    test('should update existing cluster entry instead of duplicating', async () => {
      (mockFs.existsSync as jest.Mock).mockReturnValue(true);

      const existingConfigYaml = jsyaml.dump({
        clusters: [
          { name: 'my-cluster', cluster: { server: 'https://old-server' } },
        ],
        contexts: [{ name: 'my-context', context: { cluster: 'my-cluster' } }],
        users: [{ name: 'my-user', user: { token: 'old-token' } }],
        'current-context': 'my-context',
      });

      const newConfigYaml = jsyaml.dump({
        clusters: [
          { name: 'my-cluster', cluster: { server: 'https://new-server' } },
        ],
        contexts: [
          {
            name: 'my-context',
            context: { cluster: 'my-cluster', namespace: 'prod' },
          },
        ],
        users: [{ name: 'my-user', user: { token: 'new-token' } }],
        'current-context': 'my-context',
      });

      (mockFs.readFileSync as jest.Mock)
        .mockReturnValueOnce(newConfigYaml)
        .mockReturnValueOnce(existingConfigYaml);

      await azureProject.editKubeConfigFile('/new/cluster/config');

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const writtenContent = (mockFs.writeFileSync as jest.Mock).mock
        .calls[0][1];
      const parsed = jsyaml.load(writtenContent) as Record<string, unknown>;
      const clusters = parsed.clusters as Array<{
        name: string;
        cluster: { server: string };
      }>;
      // Should not duplicate - still just 1 cluster
      expect(clusters).toHaveLength(1);
      expect(clusters[0].cluster.server).toBe('https://new-server');
    });

    test('should not write anything when new config file does not exist', async () => {
      (mockFs.existsSync as jest.Mock).mockReturnValue(false);

      await azureProject.editKubeConfigFile('/nonexistent/config');

      expect(mockFs.readFileSync).not.toHaveBeenCalled();
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('getCreds', () => {
    test('should return credentials when matching profile is found', async () => {
      (AzureProfile.getProfiles as jest.Mock).mockReturnValue([
        {
          profileName: 'my-profile',
          clientId: 'cid-123',
          clientSecret: 'csecret-456',
          tenantId: 'tid-789',
          subscriptionId: 'sid-000',
        },
      ]);

      const creds = await azureProject.getCreds('my-profile');

      expect(creds).toEqual({
        clientId: 'cid-123',
        clientSecret: 'csecret-456',
        tenantId: 'tid-789',
        subscriptionId: 'sid-000',
      });
    });

    test('should throw an error when profile is not found', async () => {
      (AzureProfile.getProfiles as jest.Mock).mockReturnValue([]);

      await expect(azureProject.getCreds('nonexistent')).rejects.toThrow(
        "Azure profile 'nonexistent' not found",
      );
    });
  });

  describe('startSSHProcess / stopSSHProcess / runAnsiblePlaybook', () => {
    test('startSSHProcess should log debug message', async () => {
      await azureProject.startSSHProcess();

      expect(AppLogger.debug).toHaveBeenCalledWith(
        'Starting SSH process for Azure',
      );
    });

    test('stopSSHProcess should log debug message', async () => {
      await azureProject.stopSSHProcess();

      expect(AppLogger.debug).toHaveBeenCalledWith(
        'Stopping SSH process for Azure',
      );
    });

    test('runAnsiblePlaybook should call execSync with correct arguments', async () => {
      mockExecSync.mockReturnValue('playbook output');

      await azureProject.runAnsiblePlaybook('deploy.yml', '/project/path');

      expect(mockExecSync).toHaveBeenCalledWith('ansible-playbook deploy.yml', {
        cwd: '/project/path',
        encoding: 'utf8',
      });
    });
  });
});
