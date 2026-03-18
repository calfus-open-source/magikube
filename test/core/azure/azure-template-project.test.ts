jest.setTimeout(30000);

// Mock base-project.js
jest.mock('../../../src/core/base-project.js', () => {
  return {
    __esModule: true,
    default: (() => {
      class BaseProjectMock {
        config: Record<string, unknown>;
        command: Record<string, unknown>;
        projectPath: string;
        constructor(
          command: Record<string, unknown>,
          config: Record<string, unknown>,
        ) {
          this.config = config;
          this.command = command;
          this.projectPath = '';
        }
        createProject = jest.fn(() => Promise.resolve(true));
        destroyProject = jest.fn(() => Promise.resolve(true));
        createFile = jest.fn();
        getConfigString = jest.fn((key: string) => {
          const val = this.config[key];
          return typeof val === 'string' ? val : String(val ?? '');
        });
        deleteFolder = jest.fn(() => Promise.resolve());
      }
      return BaseProjectMock;
    })(),
  };
});

// Track super.createProject calls
const mockSuperCreateProject = jest.fn(() => Promise.resolve());

// Mock azure-project.js (extends BaseProject, so inherits mock)
jest.mock('../../../src/core/azure/azure-project.js', () => {
  const BaseProject = jest.requireMock(
    '../../../src/core/base-project.js',
  ).default;
  class AzureProjectMock extends BaseProject {
    createAKS = jest.fn();
    createVNet = jest.fn();
    createACR = jest.fn();
    createCommon = jest.fn();
  }
  // Add createProject to the prototype so super.createProject() works
  AzureProjectMock.prototype.createProject = mockSuperCreateProject;
  return {
    __esModule: true,
    default: AzureProjectMock,
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
  readStatusFile: jest.fn(() => ({ modules: {} })),
}));

jest.mock('../../../src/core/utils/executeCommandWithRetry-utils.js', () => ({
  executeCommandWithRetry: jest.fn(() => Promise.resolve()),
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

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
}));

import AzureTemplateProject from '../../../src/core/azure/azure-template-project.js';
import { AppLogger } from '../../../src/logger/appLogger.js';

describe('AzureTemplateProject', () => {
  let templateProject: InstanceType<typeof AzureTemplateProject>;
  let mockCommand: { id: string };
  const mockConfig = {
    project_name: 'test-project',
    cloud_provider: 'azure',
    location: 'eastus',
    environment: 'dev',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockCommand = { id: 'create' };
    templateProject = new AzureTemplateProject(mockCommand, mockConfig);
  });

  describe('constructor', () => {
    test('should set default templatePath to empty string when not provided', () => {
      const project = new AzureTemplateProject(mockCommand, mockConfig);
      // templatePath is private, but we can verify it was constructed without error
      expect(project).toBeDefined();
      // Access private member via bracket notation for verification
      expect(
        (project as unknown as Record<string, unknown>)['templatePath'],
      ).toBe('');
    });

    test('should set custom templatePath when provided', () => {
      const customPath = '/custom/template/path';
      const project = new AzureTemplateProject(
        mockCommand,
        mockConfig,
        customPath,
      );
      expect(project).toBeDefined();
      expect(
        (project as unknown as Record<string, unknown>)['templatePath'],
      ).toBe(customPath);
    });
  });

  describe('createProject', () => {
    test('should call super.createProject() then createTemplateFiles()', async () => {
      const createTemplateFilesSpy = jest
        .spyOn(templateProject, 'createTemplateFiles')
        .mockResolvedValue();

      // The instance-level createProject is a jest.fn() from BaseProjectMock,
      // so we must call the real AzureTemplateProject.prototype.createProject directly.
      await AzureTemplateProject.prototype.createProject.call(
        templateProject,
        'test-project',
        '/test/path',
      );

      // Verify super.createProject was called via the prototype mock
      expect(mockSuperCreateProject).toHaveBeenCalledWith(
        'test-project',
        '/test/path',
      );

      // Verify createTemplateFiles was called after super.createProject
      expect(createTemplateFilesSpy).toHaveBeenCalledWith(
        '/test/path',
        'test-project',
      );

      createTemplateFilesSpy.mockRestore();
    });
  });

  describe('createTemplateFiles', () => {
    test('should call all 4 sub-methods: createMainTemplate, createVariablesTemplate, createOutputsTemplate, createBackendConfig', async () => {
      const createMainTemplateSpy = jest
        .spyOn(templateProject, 'createMainTemplate')
        .mockResolvedValue();
      const createVariablesTemplateSpy = jest
        .spyOn(templateProject, 'createVariablesTemplate')
        .mockResolvedValue();
      const createOutputsTemplateSpy = jest
        .spyOn(templateProject, 'createOutputsTemplate')
        .mockResolvedValue();
      const createBackendConfigSpy = jest
        .spyOn(templateProject, 'createBackendConfig')
        .mockResolvedValue();

      await templateProject.createTemplateFiles('/test/path', 'test-project');

      const expectedBasePath = '/test/path/test-project';
      expect(createMainTemplateSpy).toHaveBeenCalledWith(expectedBasePath);
      expect(createVariablesTemplateSpy).toHaveBeenCalledWith(expectedBasePath);
      expect(createOutputsTemplateSpy).toHaveBeenCalledWith(expectedBasePath);
      expect(createBackendConfigSpy).toHaveBeenCalledWith(expectedBasePath);

      createMainTemplateSpy.mockRestore();
      createVariablesTemplateSpy.mockRestore();
      createOutputsTemplateSpy.mockRestore();
      createBackendConfigSpy.mockRestore();
    });

    test('should log error and re-throw when a sub-method throws', async () => {
      const testError = new Error('Template creation failed');
      jest
        .spyOn(templateProject, 'createMainTemplate')
        .mockRejectedValue(testError);

      await expect(
        templateProject.createTemplateFiles('/test/path', 'test-project'),
      ).rejects.toThrow('Template creation failed');

      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Error creating Azure template files'),
        true,
      );
    });
  });

  describe('customizeTemplate', () => {
    test('should call createAKS, createVNet, createACR for aks type', async () => {
      const createAKSMock = (
        templateProject as unknown as Record<string, jest.Mock>
      ).createAKS;
      const createVNetMock = (
        templateProject as unknown as Record<string, jest.Mock>
      ).createVNet;
      const createACRMock = (
        templateProject as unknown as Record<string, jest.Mock>
      ).createACR;

      await templateProject.customizeTemplate('aks');

      expect(createAKSMock).toHaveBeenCalled();
      expect(createVNetMock).toHaveBeenCalledWith(process.cwd());
      expect(createACRMock).toHaveBeenCalledWith(process.cwd());
    });

    test('should call createFile with app-service template path for app-service type', async () => {
      const createFileMock = (
        templateProject as unknown as Record<string, jest.Mock>
      ).createFile;

      await templateProject.customizeTemplate('app-service');

      expect(createFileMock).toHaveBeenCalledWith(
        'main.tf',
        `${process.cwd()}/dist/templates/azure/modules/app-service/main.tf.liquid`,
        '/infrastructure/modules/app-service',
        true,
      );
    });

    test('should call createFile with function-app template path for function-app type', async () => {
      const createFileMock = (
        templateProject as unknown as Record<string, jest.Mock>
      ).createFile;

      await templateProject.customizeTemplate('function-app');

      expect(createFileMock).toHaveBeenCalledWith(
        'main.tf',
        `${process.cwd()}/dist/templates/azure/modules/function-app/main.tf.liquid`,
        '/infrastructure/modules/function-app',
        true,
      );
    });

    test('should call createFile with storage-account template path for storage type', async () => {
      const createFileMock = (
        templateProject as unknown as Record<string, jest.Mock>
      ).createFile;

      await templateProject.customizeTemplate('storage');

      expect(createFileMock).toHaveBeenCalledWith(
        'main.tf',
        `${process.cwd()}/dist/templates/azure/modules/storage-account/main.tf.liquid`,
        '/infrastructure/modules/storage-account',
        true,
      );
    });

    test('should log warning and not create files for unknown template type', async () => {
      const createFileMock = (
        templateProject as unknown as Record<string, jest.Mock>
      ).createFile;

      await templateProject.customizeTemplate('unknown-type');

      expect(AppLogger.warn).toHaveBeenCalledWith(
        'Unknown template type: unknown-type',
        true,
      );
      expect(createFileMock).not.toHaveBeenCalled();
    });
  });

  describe('createProviderTemplate', () => {
    test('should call createFile with providers.tf.liquid path', async () => {
      const createFileMock = (
        templateProject as unknown as Record<string, jest.Mock>
      ).createFile;

      await templateProject.createProviderTemplate('/some/base/path');

      expect(createFileMock).toHaveBeenCalledWith(
        'providers.tf',
        `${process.cwd()}/dist/templates/azure/template/providers.tf.liquid`,
        '/infrastructure',
        true,
      );
    });
  });

  describe('createTerraformVars', () => {
    test('should call createFile with terraform.tfvars.liquid path', async () => {
      const createFileMock = (
        templateProject as unknown as Record<string, jest.Mock>
      ).createFile;

      await templateProject.createTerraformVars('/some/base/path');

      expect(createFileMock).toHaveBeenCalledWith(
        'terraform.tfvars',
        `${process.cwd()}/dist/templates/azure/template/terraform.tfvars.liquid`,
        '/infrastructure',
        true,
      );
    });
  });

  describe('createMainTemplate', () => {
    test('should call createFile with main.tf template', async () => {
      const createFileMock = (
        templateProject as unknown as Record<string, jest.Mock>
      ).createFile;

      await templateProject.createMainTemplate('/some/base/path');

      expect(createFileMock).toHaveBeenCalledWith(
        'main.tf',
        `${process.cwd()}/dist/templates/azure/template/main.tf.liquid`,
        '/infrastructure',
        true,
      );
    });
  });

  describe('createVariablesTemplate', () => {
    test('should call createFile with variables.tf template', async () => {
      const createFileMock = (
        templateProject as unknown as Record<string, jest.Mock>
      ).createFile;

      await templateProject.createVariablesTemplate('/some/base/path');

      expect(createFileMock).toHaveBeenCalledWith(
        'variables.tf',
        `${process.cwd()}/dist/templates/azure/template/variables.tf.liquid`,
        '/infrastructure',
        true,
      );
    });
  });

  describe('createOutputsTemplate', () => {
    test('should call createFile with outputs.tf template', async () => {
      const createFileMock = (
        templateProject as unknown as Record<string, jest.Mock>
      ).createFile;

      await templateProject.createOutputsTemplate('/some/base/path');

      expect(createFileMock).toHaveBeenCalledWith(
        'outputs.tf',
        `${process.cwd()}/dist/templates/azure/template/outputs.tf.liquid`,
        '/infrastructure',
        true,
      );
    });
  });

  describe('createBackendConfig', () => {
    test('should call createFile with backend-config template and environment-prefixed filename', async () => {
      const createFileMock = (
        templateProject as unknown as Record<string, jest.Mock>
      ).createFile;

      await templateProject.createBackendConfig('/some/base/path');

      expect(createFileMock).toHaveBeenCalledWith(
        'dev-config.tfvars',
        `${process.cwd()}/dist/templates/azure/template/backend-config.tfvars.liquid`,
        '/infrastructure',
        true,
      );
    });
  });
});
