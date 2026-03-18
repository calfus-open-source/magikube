jest.setTimeout(30000);

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

jest.mock('child_process', () => ({
  spawn: jest.fn(),
  execSync: jest.fn(),
}));

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
}));

import AzureSubmodules from '../../../src/core/azure/azure-submodules.js';
import AzureProject from '../../../src/core/azure/azure-project.js';
import { AppLogger } from '../../../src/logger/appLogger.js';
import { createMockAzureProjectConfig } from './azure-fixtures.js';

describe('AzureSubmodules', () => {
  let mockCommand: { id: string };
  let mockConfig: ReturnType<typeof createMockAzureProjectConfig>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCommand = { id: 'create' };
    mockConfig = createMockAzureProjectConfig();
  });

  describe('constructor', () => {
    test('should store submoduleName and submoduleType correctly', () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'my-network',
        'vnet',
      );

      // Access private fields via bracket notation for verification
      expect(
        (submodules as unknown as Record<string, string>)['submoduleName'],
      ).toBe('my-network');
      expect(
        (submodules as unknown as Record<string, string>)['submoduleType'],
      ).toBe('vnet');
    });

    test('should pass command and config to the parent AzureProject constructor', () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'my-module',
        'aks',
      );

      expect(submodules.command).toBe(mockCommand);
      expect((submodules as unknown as Record<string, unknown>)['config']).toBe(
        mockConfig,
      );
    });
  });

  describe('createProject', () => {
    let parentCreateProjectSpy: jest.SpyInstance;

    beforeEach(() => {
      // Mock AzureProject.prototype.createProject so that super.createProject()
      // in AzureSubmodules resolves without triggering the full AzureProject chain.
      parentCreateProjectSpy = jest
        .spyOn(AzureProject.prototype, 'createProject')
        .mockResolvedValue();
    });

    afterEach(() => {
      parentCreateProjectSpy.mockRestore();
    });

    test('should call super.createProject then createSubmoduleFiles', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'my-aks',
        'aks',
      );

      // Delete the instance property set by the BaseProjectMock constructor
      // so the prototype method (AzureSubmodules.createProject) is reachable.
      delete (submodules as unknown as Record<string, unknown>)[
        'createProject'
      ];

      // Spy on createSubmoduleFiles to verify it is called
      const createSubmoduleFilesSpy = jest
        .spyOn(submodules, 'createSubmoduleFiles')
        .mockResolvedValue();

      await submodules.createProject('test-project', '/tmp/projects');

      // super.createProject (AzureProject.prototype.createProject) should have been called
      expect(parentCreateProjectSpy).toHaveBeenCalledWith(
        'test-project',
        '/tmp/projects',
      );

      // createSubmoduleFiles should have been called after super.createProject
      expect(createSubmoduleFilesSpy).toHaveBeenCalled();
    });

    test('should log info message before creating submodule', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'my-network',
        'vnet',
      );

      // Delete the instance property shadow
      delete (submodules as unknown as Record<string, unknown>)[
        'createProject'
      ];
      jest.spyOn(submodules, 'createSubmoduleFiles').mockResolvedValue();

      await submodules.createProject('test-project', '/tmp/projects');

      expect(AppLogger.info).toHaveBeenCalledWith(
        'Creating Azure submodule: my-network of type: vnet',
        true,
      );
    });

    test('should call createSubmoduleFiles after super.createProject resolves', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'my-storage',
        'storage',
      );

      delete (submodules as unknown as Record<string, unknown>)[
        'createProject'
      ];

      const callOrder: string[] = [];
      parentCreateProjectSpy.mockImplementation(async () => {
        callOrder.push('super.createProject');
      });
      const createSubmoduleFilesSpy = jest
        .spyOn(submodules, 'createSubmoduleFiles')
        .mockImplementation(async () => {
          callOrder.push('createSubmoduleFiles');
        });

      await submodules.createProject('test-project', '/tmp/projects');

      expect(callOrder).toEqual([
        'super.createProject',
        'createSubmoduleFiles',
      ]);
      expect(createSubmoduleFilesSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('createSubmoduleFiles - switch cases', () => {
    const submoduleTypes = [
      'aks',
      'vnet',
      'storage',
      'acr',
      'sql',
      'keyvault',
      'appservice',
      'functionapp',
    ] as const;

    test.each(submoduleTypes)(
      'should create 3 files with correct template paths for type "%s"',
      async (submoduleType) => {
        const submoduleName = `my-${submoduleType}-module`;
        const submodules = new AzureSubmodules(
          mockCommand,
          mockConfig,
          submoduleName,
          submoduleType,
        );

        await submodules.createSubmoduleFiles();

        const createFileMock = (
          submodules as unknown as Record<string, jest.Mock>
        )['createFile'];
        const expectedBasePath = `/infrastructure/modules/${submoduleName}`;
        const templateBase = `${process.cwd()}/dist/templates/azure/submodules/${submoduleType}`;

        expect(createFileMock).toHaveBeenCalledTimes(3);

        expect(createFileMock).toHaveBeenCalledWith(
          'main.tf',
          `${templateBase}/main.tf.liquid`,
          expectedBasePath,
          true,
        );
        expect(createFileMock).toHaveBeenCalledWith(
          'variables.tf',
          `${templateBase}/variables.tf.liquid`,
          expectedBasePath,
          true,
        );
        expect(createFileMock).toHaveBeenCalledWith(
          'outputs.tf',
          `${templateBase}/outputs.tf.liquid`,
          expectedBasePath,
          true,
        );
      },
    );

    test('should create aks submodule files with correct paths', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'k8s-cluster',
        'aks',
      );

      await submodules.createSubmoduleFiles();

      const createFileMock = (
        submodules as unknown as Record<string, jest.Mock>
      )['createFile'];
      expect(createFileMock).toHaveBeenCalledTimes(3);
      expect(createFileMock).toHaveBeenCalledWith(
        'main.tf',
        expect.stringContaining('/azure/submodules/aks/main.tf.liquid'),
        '/infrastructure/modules/k8s-cluster',
        true,
      );
    });

    test('should create vnet submodule files with correct paths', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'network',
        'vnet',
      );

      await submodules.createSubmoduleFiles();

      const createFileMock = (
        submodules as unknown as Record<string, jest.Mock>
      )['createFile'];
      expect(createFileMock).toHaveBeenCalledTimes(3);
      expect(createFileMock).toHaveBeenCalledWith(
        'main.tf',
        expect.stringContaining('/azure/submodules/vnet/main.tf.liquid'),
        '/infrastructure/modules/network',
        true,
      );
    });

    test('should create storage submodule files with correct paths', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'blob-store',
        'storage',
      );

      await submodules.createSubmoduleFiles();

      const createFileMock = (
        submodules as unknown as Record<string, jest.Mock>
      )['createFile'];
      expect(createFileMock).toHaveBeenCalledTimes(3);
      expect(createFileMock).toHaveBeenCalledWith(
        'main.tf',
        expect.stringContaining('/azure/submodules/storage/main.tf.liquid'),
        '/infrastructure/modules/blob-store',
        true,
      );
    });

    test('should create acr submodule files with correct paths', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'container-reg',
        'acr',
      );

      await submodules.createSubmoduleFiles();

      const createFileMock = (
        submodules as unknown as Record<string, jest.Mock>
      )['createFile'];
      expect(createFileMock).toHaveBeenCalledTimes(3);
      expect(createFileMock).toHaveBeenCalledWith(
        'main.tf',
        expect.stringContaining('/azure/submodules/acr/main.tf.liquid'),
        '/infrastructure/modules/container-reg',
        true,
      );
    });

    test('should create sql submodule files with correct paths', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'database',
        'sql',
      );

      await submodules.createSubmoduleFiles();

      const createFileMock = (
        submodules as unknown as Record<string, jest.Mock>
      )['createFile'];
      expect(createFileMock).toHaveBeenCalledTimes(3);
      expect(createFileMock).toHaveBeenCalledWith(
        'main.tf',
        expect.stringContaining('/azure/submodules/sql/main.tf.liquid'),
        '/infrastructure/modules/database',
        true,
      );
    });

    test('should create keyvault submodule files with correct paths', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'secrets',
        'keyvault',
      );

      await submodules.createSubmoduleFiles();

      const createFileMock = (
        submodules as unknown as Record<string, jest.Mock>
      )['createFile'];
      expect(createFileMock).toHaveBeenCalledTimes(3);
      expect(createFileMock).toHaveBeenCalledWith(
        'main.tf',
        expect.stringContaining('/azure/submodules/keyvault/main.tf.liquid'),
        '/infrastructure/modules/secrets',
        true,
      );
    });

    test('should create appservice submodule files with correct paths', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'web-app',
        'appservice',
      );

      await submodules.createSubmoduleFiles();

      const createFileMock = (
        submodules as unknown as Record<string, jest.Mock>
      )['createFile'];
      expect(createFileMock).toHaveBeenCalledTimes(3);
      expect(createFileMock).toHaveBeenCalledWith(
        'main.tf',
        expect.stringContaining('/azure/submodules/appservice/main.tf.liquid'),
        '/infrastructure/modules/web-app',
        true,
      );
    });

    test('should create functionapp submodule files with correct paths', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'serverless-func',
        'functionapp',
      );

      await submodules.createSubmoduleFiles();

      const createFileMock = (
        submodules as unknown as Record<string, jest.Mock>
      )['createFile'];
      expect(createFileMock).toHaveBeenCalledTimes(3);
      expect(createFileMock).toHaveBeenCalledWith(
        'main.tf',
        expect.stringContaining('/azure/submodules/functionapp/main.tf.liquid'),
        '/infrastructure/modules/serverless-func',
        true,
      );
    });
  });

  describe('createSubmoduleFiles - default case (unknown type)', () => {
    test('should log a warning for unknown submodule type', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'custom-module',
        'unknowntype',
      );

      await submodules.createSubmoduleFiles();

      expect(AppLogger.warn).toHaveBeenCalledWith(
        'Unknown Azure submodule type: unknowntype',
        true,
      );
    });

    test('should call createGenericSubmodule with 3 createFile calls for unknown type', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'custom-module',
        'unknowntype',
      );

      await submodules.createSubmoduleFiles();

      const createFileMock = (
        submodules as unknown as Record<string, jest.Mock>
      )['createFile'];
      const expectedBasePath = '/infrastructure/modules/custom-module';
      const templateBase = `${process.cwd()}/dist/templates/azure/submodules/generic`;

      expect(createFileMock).toHaveBeenCalledTimes(3);

      expect(createFileMock).toHaveBeenCalledWith(
        'main.tf',
        `${templateBase}/main.tf.liquid`,
        expectedBasePath,
        true,
      );
      expect(createFileMock).toHaveBeenCalledWith(
        'variables.tf',
        `${templateBase}/variables.tf.liquid`,
        expectedBasePath,
        true,
      );
      expect(createFileMock).toHaveBeenCalledWith(
        'outputs.tf',
        `${templateBase}/outputs.tf.liquid`,
        expectedBasePath,
        true,
      );
    });
  });

  describe('createSubmoduleFiles - case insensitivity', () => {
    test('should handle uppercase "AKS" the same as lowercase "aks"', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'my-aks',
        'AKS',
      );

      await submodules.createSubmoduleFiles();

      const createFileMock = (
        submodules as unknown as Record<string, jest.Mock>
      )['createFile'];
      expect(createFileMock).toHaveBeenCalledTimes(3);
      expect(createFileMock).toHaveBeenCalledWith(
        'main.tf',
        expect.stringContaining('/azure/submodules/aks/main.tf.liquid'),
        '/infrastructure/modules/my-aks',
        true,
      );

      // Should NOT have triggered warning for unknown type
      expect(AppLogger.warn).not.toHaveBeenCalled();
    });

    test('should handle mixed case "Aks" the same as lowercase "aks"', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'my-aks',
        'Aks',
      );

      await submodules.createSubmoduleFiles();

      const createFileMock = (
        submodules as unknown as Record<string, jest.Mock>
      )['createFile'];
      expect(createFileMock).toHaveBeenCalledTimes(3);
      expect(createFileMock).toHaveBeenCalledWith(
        'main.tf',
        expect.stringContaining('/azure/submodules/aks/main.tf.liquid'),
        '/infrastructure/modules/my-aks',
        true,
      );

      expect(AppLogger.warn).not.toHaveBeenCalled();
    });

    test('should handle uppercase "VNET" the same as lowercase "vnet"', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'my-vnet',
        'VNET',
      );

      await submodules.createSubmoduleFiles();

      const createFileMock = (
        submodules as unknown as Record<string, jest.Mock>
      )['createFile'];
      expect(createFileMock).toHaveBeenCalledTimes(3);
      expect(createFileMock).toHaveBeenCalledWith(
        'main.tf',
        expect.stringContaining('/azure/submodules/vnet/main.tf.liquid'),
        '/infrastructure/modules/my-vnet',
        true,
      );

      expect(AppLogger.warn).not.toHaveBeenCalled();
    });
  });

  describe('createSubmoduleFiles - error handling', () => {
    test('should log error and re-throw when createFile throws', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'failing-module',
        'aks',
      );

      const testError = new Error('Failed to create file');
      const createFileMock = (
        submodules as unknown as Record<string, jest.Mock>
      )['createFile'];
      createFileMock.mockImplementation(() => {
        throw testError;
      });

      await expect(submodules.createSubmoduleFiles()).rejects.toThrow(
        'Failed to create file',
      );

      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error creating Azure submodule'),
        true,
      );
    });

    test('should include the error details in the logged message', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'error-module',
        'vnet',
      );

      const testError = new Error('Permission denied');
      const createFileMock = (
        submodules as unknown as Record<string, jest.Mock>
      )['createFile'];
      createFileMock.mockImplementation(() => {
        throw testError;
      });

      await expect(submodules.createSubmoduleFiles()).rejects.toThrow(
        'Permission denied',
      );

      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Permission denied'),
        true,
      );
    });

    test('should not log success message when an error occurs', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'error-module',
        'sql',
      );

      const createFileMock = (
        submodules as unknown as Record<string, jest.Mock>
      )['createFile'];
      createFileMock.mockImplementation(() => {
        throw new Error('Disk full');
      });

      await expect(submodules.createSubmoduleFiles()).rejects.toThrow(
        'Disk full',
      );

      expect(AppLogger.info).not.toHaveBeenCalledWith(
        expect.stringContaining('created successfully'),
        true,
      );
    });
  });

  describe('createSubmoduleFiles - success logging', () => {
    test('should log success message after submodule files are created', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'my-aks-cluster',
        'aks',
      );

      await submodules.createSubmoduleFiles();

      expect(AppLogger.info).toHaveBeenCalledWith(
        'Azure submodule my-aks-cluster created successfully',
        true,
      );
    });

    test('should log success message for generic submodule type', async () => {
      const submodules = new AzureSubmodules(
        mockCommand,
        mockConfig,
        'custom-infra',
        'randomtype',
      );

      await submodules.createSubmoduleFiles();

      expect(AppLogger.info).toHaveBeenCalledWith(
        'Azure submodule custom-infra created successfully',
        true,
      );
    });
  });
});
