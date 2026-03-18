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
    createCommon = jest.fn();
    createProviderFileAzure = jest.fn();
    createAKS = jest.fn();
    createVNet = jest.fn();
    createACR = jest.fn();
  }
  // Add createProject to the prototype so super.createProject() works
  AzureProjectMock.prototype.createProject = mockSuperCreateProject;
  return {
    __esModule: true,
    default: AzureProjectMock,
  };
});

// Mock gitops module
const mockCreateGitOps = jest.fn();
jest.mock('../../../src/core/gitops/common-gitops.js', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      createGitOps: mockCreateGitOps,
    })),
  };
});

// Mock repository module
const mockCreateRepository = jest.fn();
jest.mock('../../../src/core/code-repository/common-repository.js', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      createrepository: mockCreateRepository,
    })),
  };
});

// Mock argocd module
const mockArgoCdProject = jest.fn();
jest.mock('../../../src/core/argocd/setup-argocd-azure.js', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      argoCdProject: mockArgoCdProject,
    })),
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

jest.mock('../../../src/core/interfaces/cloud-project.js', () => ({}));

// Mock fs with existsSync controllable
const mockExistsSync = jest.fn();
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  existsSync: mockExistsSync,
}));

import AzureAKSProject from '../../../src/core/azure/azure-aks-project.js';
import { AppLogger } from '../../../src/logger/appLogger.js';
import gitOpsProject from '../../../src/core/gitops/common-gitops.js';
import repositoryProject from '../../../src/core/code-repository/common-repository.js';
import argoCdProjectAzure from '../../../src/core/argocd/setup-argocd-azure.js';

describe('AzureAKSProject', () => {
  let aksProject: InstanceType<typeof AzureAKSProject>;
  let mockCommand: { id: string };
  const mockConfig = {
    project_name: 'test-project',
    cloud_provider: 'azure',
    location: 'eastus',
    environment: 'dev',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsSync.mockReset();
    mockCommand = { id: 'create' };
    aksProject = new AzureAKSProject(mockCommand, mockConfig);
  });

  describe('createProject', () => {
    test('should call super.createProject() then createMainFile()', async () => {
      const createMainFileSpy = jest
        .spyOn(aksProject, 'createMainFile')
        .mockResolvedValue();

      // The instance-level createProject is a jest.fn() from BaseProjectMock,
      // so we must call the real AzureAKSProject.prototype.createProject directly.
      await AzureAKSProject.prototype.createProject.call(
        aksProject,
        'test-project',
        '/test/path',
      );

      // Verify super.createProject was called via the prototype mock
      expect(mockSuperCreateProject).toHaveBeenCalledWith(
        'test-project',
        '/test/path',
      );

      // Verify createMainFile was called
      expect(createMainFileSpy).toHaveBeenCalled();

      createMainFileSpy.mockRestore();
    });
  });

  describe('createMainFile', () => {
    test('should make all 5 createFile calls for infrastructure files', async () => {
      // Mock createProviderFileAzure and createCommon on the instance (from AzureProject mock)
      const _createProviderFileAzureMock = (
        aksProject as unknown as Record<string, jest.Mock>
      ).createProviderFileAzure;
      const _createCommonMock = (
        aksProject as unknown as Record<string, jest.Mock>
      ).createCommon;
      const createFileMock = (
        aksProject as unknown as Record<string, jest.Mock>
      ).createFile;
      const getConfigStringMock = (
        aksProject as unknown as Record<string, jest.Mock>
      ).getConfigString;

      // getConfigString('environment') should return 'dev'
      getConfigStringMock.mockImplementation((key: string) => {
        if (key === 'environment') return 'dev';
        return '';
      });

      await aksProject.createMainFile();

      const cwd = process.cwd();

      // Verify 5 createFile calls
      expect(createFileMock).toHaveBeenCalledWith(
        'main.tf',
        `${cwd}/dist/templates/azure/environments/dev/main.tf.liquid`,
        '/infrastructure',
        true,
      );
      expect(createFileMock).toHaveBeenCalledWith(
        'terraform.tfvars',
        `${cwd}/dist/templates/azure/environments/dev/terraform.tfvars.liquid`,
        '/infrastructure',
        true,
      );
      expect(createFileMock).toHaveBeenCalledWith(
        'variables.tf',
        `${cwd}/dist/templates/azure/environments/dev/variables.tf.liquid`,
        '/infrastructure',
        true,
      );
      expect(createFileMock).toHaveBeenCalledWith(
        'outputs.tf',
        `${cwd}/dist/templates/azure/environments/dev/outputs.tf.liquid`,
        '/infrastructure',
        true,
      );
      expect(createFileMock).toHaveBeenCalledWith(
        'dev-config.tfvars',
        `${cwd}/dist/templates/azure/environments/dev/backend-config.tfvars.liquid`,
        '/infrastructure',
        true,
      );
    });

    test('should create gitOpsProject, repositoryProject, argoCdProjectAzure instances and call their methods', async () => {
      const getConfigStringMock = (
        aksProject as unknown as Record<string, jest.Mock>
      ).getConfigString;
      getConfigStringMock.mockImplementation((key: string) => {
        if (key === 'environment') return 'dev';
        return '';
      });

      // Set path and name on the instance so they are available
      (aksProject as unknown as Record<string, unknown>)['path'] = '/test/path';
      (aksProject as unknown as Record<string, unknown>)['name'] =
        'test-project';

      await aksProject.createMainFile();

      // Verify gitOpsProject constructor was called and createGitOps invoked
      expect(gitOpsProject).toHaveBeenCalled();
      expect(mockCreateGitOps).toHaveBeenCalled();

      // Verify repositoryProject constructor was called and createrepository invoked
      expect(repositoryProject).toHaveBeenCalled();
      expect(mockCreateRepository).toHaveBeenCalled();

      // Verify argoCdProjectAzure constructor was called and argoCdProject invoked
      expect(argoCdProjectAzure).toHaveBeenCalled();
      expect(mockArgoCdProject).toHaveBeenCalled();
    });

    test('should call createProviderFileAzure and createCommon', async () => {
      const createProviderFileAzureMock = (
        aksProject as unknown as Record<string, jest.Mock>
      ).createProviderFileAzure;
      const createCommonMock = (
        aksProject as unknown as Record<string, jest.Mock>
      ).createCommon;
      const getConfigStringMock = (
        aksProject as unknown as Record<string, jest.Mock>
      ).getConfigString;
      getConfigStringMock.mockImplementation((key: string) => {
        if (key === 'environment') return 'dev';
        return '';
      });

      await aksProject.createMainFile();

      expect(createProviderFileAzureMock).toHaveBeenCalledWith(process.cwd());
      expect(createCommonMock).toHaveBeenCalledWith(process.cwd());
    });
  });

  describe('createProviderFileAzure', () => {
    test('should create providers.tf when file does not exist', async () => {
      // Use real createProviderFileAzure method - need to restore it from the original class
      // Since the mock on AzureProject makes createProviderFileAzure a jest.fn(),
      // we test the actual AzureAKSProject.createProviderFileAzure which is defined on AzureAKSProject
      const createFileMock = (
        aksProject as unknown as Record<string, jest.Mock>
      ).createFile;

      // Set projectPath so join works
      (aksProject as unknown as Record<string, string>).projectPath =
        '/test/project';

      mockExistsSync.mockReturnValue(false);

      // Call the real createProviderFileAzure from AzureAKSProject prototype
      await AzureAKSProject.prototype.createProviderFileAzure.call(
        aksProject,
        '/some/path',
      );

      expect(mockExistsSync).toHaveBeenCalledWith(
        '/test/project/infrastructure/providers.tf',
      );
      expect(createFileMock).toHaveBeenCalledWith(
        'providers.tf',
        '/some/path/dist/templates/azure/environments/dev/provider.tf.liquid',
        '/infrastructure',
        true,
      );
      expect(AppLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining("Creating 'providers.tf'"),
      );
    });

    test('should skip creation when providers.tf already exists', async () => {
      const createFileMock = (
        aksProject as unknown as Record<string, jest.Mock>
      ).createFile;

      // Set projectPath so join works
      (aksProject as unknown as Record<string, string>).projectPath =
        '/test/project';

      mockExistsSync.mockReturnValue(true);

      // Call the real createProviderFileAzure from AzureAKSProject prototype
      await AzureAKSProject.prototype.createProviderFileAzure.call(
        aksProject,
        '/some/path',
      );

      expect(mockExistsSync).toHaveBeenCalledWith(
        '/test/project/infrastructure/providers.tf',
      );
      expect(createFileMock).not.toHaveBeenCalled();
    });
  });
});
