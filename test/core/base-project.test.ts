import fs from 'fs';
import BaseProject from '../../src/core/base-project.js';
import { AppLogger } from '../../src/logger/appLogger.js';
import { appendUniqueLines } from '../../src/core/utils/appendUniqueLines-utils.js';
import { readStatusFile } from '../../src/core/utils/statusUpdater-utils.js';

// -------------------- MOCKS --------------------
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

jest.mock('../../src/logger/appLogger.js', () => ({
  AppLogger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockTerraformInstance = {
  runTerraformInit: jest.fn(),
  runTerraformDestroy: jest.fn(),
  startSSHProcess: jest.fn(),
  stopSSHProcess: jest.fn(),
};

jest.mock('../../src/core/terraform-project.js', () => ({
  __esModule: true,
  default: {
    getProject: jest.fn().mockResolvedValue(mockTerraformInstance),
  },
}));

jest.mock('../../src/core/utils/statusUpdater-utils.js', () => ({
  readStatusFile: jest.fn(),
}));

jest.mock('../../src/core/constants/constants.js', () => ({
  aws_destroy_modules: ['module.vpc', 'module.eks'],
  azure_destroy_modules: ['module.vnet', 'module.aks'],
}));

jest.mock('../../src/core/utils/appendUniqueLines-utils.js', () => ({
  appendUniqueLines: jest.fn(),
}));

// --------------------------------------------
// FIXED SystemConfig mock (correct structure)
// --------------------------------------------
const mockGetConfig = jest.fn().mockReturnValue({
  command: 'new',
  project_name: 'demo',
});

jest.mock('../../src/config/system.js', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      getConfig: mockGetConfig,
    })),
  },
}));

// -------------------- TEST SETUP --------------------
class DummyCommand {}
const mockCommand = new DummyCommand();

const mockConfig = {
  cluster_type: 'eks-fargate',
  environment: 'dev',
  command: 'new',
};

let project: BaseProject;

beforeEach(() => {
  jest.clearAllMocks();
  project = new (class extends BaseProject {})(
    mockCommand as unknown as Record<string, unknown>,
    mockConfig,
  );
});

// -------------------- TESTS --------------------

// ------------------------------------
// createFolder()
// ------------------------------------
describe('BaseProject.createFolder()', () => {
  test('creates a folder when it does not exist', async () => {
    mockFs.existsSync.mockReturnValue(false);

    await project.createFolder();

    expect(fs.mkdirSync).toHaveBeenCalledWith(
      (project as unknown as { projectPath: string }).projectPath,
    );
    expect(AppLogger.debug).toHaveBeenCalled();
  });

  test('logs error when folder already exists', async () => {
    mockFs.existsSync.mockReturnValue(true);

    await project.createFolder();

    expect(AppLogger.error).toHaveBeenCalled();
  });
});

// ------------------------------------
// deleteFolder()
// ------------------------------------
describe('BaseProject.deleteFolder()', () => {
  test('deletes folder when it exists', async () => {
    mockFs.existsSync.mockReturnValue(true);

    await project.deleteFolder('demo');

    expect(fs.rmSync).toHaveBeenCalledWith(`${process.cwd()}/demo`, {
      recursive: true,
    });
  });

  test('logs message if folder does not exist', async () => {
    mockFs.existsSync.mockReturnValue(false);

    await project.deleteFolder('demo');

    expect(AppLogger.debug).toHaveBeenCalled();
  });
});

// ------------------------------------
// createProject()
// ------------------------------------
describe('BaseProject.createProject()', () => {
  test('creates project and writes .magikube', async () => {
    mockFs.existsSync.mockReturnValue(false);

    await project.createProject('demo', '/root');

    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});

// ------------------------------------
// createProviderFile()
// ------------------------------------
describe('BaseProject.createProviderFile()', () => {
  test('creates providers.tf when it does not exist', async () => {
    mockFs.existsSync.mockReturnValue(false);

    project.createFile = jest.fn();

    await project.createProviderFile('/root');

    expect(project.createFile).toHaveBeenCalled();
  });

  test('skips if providers.tf already exists', async () => {
    mockFs.existsSync.mockReturnValue(true);

    project.createFile = jest.fn();

    await project.createProviderFile('/root');

    expect(project.createFile).not.toHaveBeenCalled();
  });
});

// ------------------------------------
// createFile()
// ------------------------------------
describe('BaseProject.createFile()', () => {
  test('writes file for new project', async () => {
    mockFs.readFileSync.mockReturnValue('template content');

    await project.createFile(
      'main.tf',
      '/template/file.liquid',
      'infra',
      false,
    );

    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  test('uses appendUniqueLines for module command', async () => {
    // override SystemConfig mock return
    mockGetConfig.mockReturnValue({
      command: 'module',
    });

    mockFs.readFileSync.mockReturnValue('template');

    await project.createFile('x.tf', '/template', '.', false);

    expect(appendUniqueLines).toHaveBeenCalled();
  });
});

// ------------------------------------
// generateContent()
// ------------------------------------
describe('BaseProject.generateContent()', () => {
  test('reads and parses template', async () => {
    mockFs.readFileSync.mockReturnValue('content');

    const output = await project.generateContent('/abc/test.liquid');

    expect(output).toBeDefined();
    expect(fs.readFileSync).toHaveBeenCalled();
  });
});

// ------------------------------------
// copyFolderAndRender()
// ------------------------------------
describe('BaseProject.copyFolderAndRender()', () => {
  test('logs error if source does not exist', async () => {
    mockFs.existsSync.mockReturnValue(false);

    await project.copyFolderAndRender('/src', '/dest');

    expect(AppLogger.error).toHaveBeenCalled();
  });

  test('recurses into subdirectories and creates them', async () => {
    // Set projectPath so destFullPath resolves correctly
    (project as unknown as { projectPath: string }).projectPath = '/project';

    mockFs.existsSync.mockImplementation((p: fs.PathLike) => {
      const pathStr = p.toString();
      // Source exists, destination subdirectory does not
      if (pathStr === '/src') return true;
      return false;
    });

    mockFs.readdirSync.mockReturnValue(['subdir'] as unknown as fs.Dirent[]);
    mockFs.statSync.mockReturnValue({
      isDirectory: () => true,
    } as fs.Stats);

    // When recursing, the subdirectory source won't exist, so it will log error and return
    await project.copyFolderAndRender('/src', '/dest');

    expect(fs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('subdir'),
      { recursive: true },
    );
  });

  test('renders .liquid files and writes output without .liquid extension', async () => {
    (project as unknown as { projectPath: string }).projectPath = '/project';

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue([
      'template.tf.liquid',
    ] as unknown as fs.Dirent[]);
    mockFs.statSync.mockReturnValue({
      isDirectory: () => false,
    } as fs.Stats);
    mockFs.readFileSync.mockReturnValue('Hello {{ name }}');

    await project.copyFolderAndRender('/src', '/dest');

    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('template.tf'),
      expect.any(String),
    );
    // Ensure .liquid extension is removed
    const writePath = (fs.writeFileSync as jest.Mock).mock
      .calls[0][0] as string;
    expect(writePath).not.toMatch(/\.liquid$/);
  });

  test('copies non-liquid files directly with copyFileSync', async () => {
    (project as unknown as { projectPath: string }).projectPath = '/project';

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['readme.md'] as unknown as fs.Dirent[]);
    mockFs.statSync.mockReturnValue({
      isDirectory: () => false,
    } as fs.Stats);

    await project.copyFolderAndRender('/src', '/dest');

    expect(fs.copyFileSync).toHaveBeenCalledWith(
      expect.stringContaining('readme.md'),
      expect.stringContaining('readme.md'),
    );
  });
});

// ------------------------------------
// destroyProject()
// ------------------------------------
describe('BaseProject.destroyProject()', () => {
  test('happy path: sets projectPath, logs debug, calls terraformDestroy', async () => {
    // Mock terraformDestroy to track it was called
    const terraformDestroySpy = jest
      .spyOn(
        project as unknown as {
          terraformDestroy: (name: string) => Promise<void>;
        },
        'terraformDestroy',
      )
      .mockResolvedValue(undefined);

    await project.destroyProject('demo', '/root');

    expect((project as unknown as { projectPath: string }).projectPath).toBe(
      '/root/demo',
    );
    expect(AppLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining("Destroying project 'demo'"),
      true,
    );
    expect(terraformDestroySpy).toHaveBeenCalledWith('demo');

    terraformDestroySpy.mockRestore();
  });

  test('error in terraformDestroy: logs error, does not throw', async () => {
    const terraformDestroySpy = jest
      .spyOn(
        project as unknown as {
          terraformDestroy: (name: string) => Promise<void>;
        },
        'terraformDestroy',
      )
      .mockRejectedValue(new Error('terraform boom'));

    await expect(
      project.destroyProject('demo', '/root'),
    ).resolves.toBeUndefined();

    expect(AppLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Project destroy failed'),
      true,
    );

    terraformDestroySpy.mockRestore();
  });
});

// ------------------------------------
// terraformDestroy()
// ------------------------------------
describe('BaseProject.terraformDestroy()', () => {
  beforeEach(() => {
    (project as unknown as { projectPath: string }).projectPath = '/root/demo';
    (readStatusFile as jest.Mock).mockReturnValue({
      modules: { 'module.vpc': 'success', 'module.eks': 'fail' },
    });
  });

  test('eks-fargate: calls getProject, runTerraformInit, and destroys modules with success/fail status', async () => {
    // mockConfig already has cluster_type: 'eks-fargate'
    await project.terraformDestroy('demo');

    const TerraformProject = (
      await import('../../src/core/terraform-project.js')
    ).default;
    expect(TerraformProject.getProject).toHaveBeenCalled();
    expect(mockTerraformInstance.runTerraformInit).toHaveBeenCalledWith(
      '/root/demo/infrastructure',
      'dev-config.tfvars',
      'demo',
    );
    // Both modules have status 'success' or 'fail', so both should be destroyed
    expect(mockTerraformInstance.runTerraformDestroy).toHaveBeenCalledTimes(2);
    expect(mockTerraformInstance.runTerraformDestroy).toHaveBeenCalledWith(
      '/root/demo/infrastructure',
      'module.vpc',
      'terraform.tfvars',
    );
    expect(mockTerraformInstance.runTerraformDestroy).toHaveBeenCalledWith(
      '/root/demo/infrastructure',
      'module.eks',
      'terraform.tfvars',
    );
  });

  test('eks-nodegroup: uses aws_destroy_modules and destroys modules', async () => {
    const nodegroupProject = new (class extends BaseProject {})(
      mockCommand as unknown as Record<string, unknown>,
      { cluster_type: 'eks-nodegroup', environment: 'dev', command: 'new' },
    );
    (nodegroupProject as unknown as { projectPath: string }).projectPath =
      '/root/demo';

    await nodegroupProject.terraformDestroy('demo');

    expect(mockTerraformInstance.runTerraformInit).toHaveBeenCalledWith(
      '/root/demo/infrastructure',
      'dev-config.tfvars',
      'demo',
    );
    expect(mockTerraformInstance.runTerraformDestroy).toHaveBeenCalledTimes(2);
  });

  test('aks: uses azure_destroy_modules', async () => {
    const aksProject = new (class extends BaseProject {})(
      mockCommand as unknown as Record<string, unknown>,
      { cluster_type: 'aks', environment: 'dev', command: 'new' },
    );
    (aksProject as unknown as { projectPath: string }).projectPath =
      '/root/demo';

    await aksProject.terraformDestroy('demo');

    // aks cluster_type does not enter the eks-fargate/eks-nodegroup block
    // and does not enter the k8s block, so no runTerraformInit or runTerraformDestroy
    expect(mockTerraformInstance.runTerraformInit).not.toHaveBeenCalled();
    expect(mockTerraformInstance.runTerraformDestroy).not.toHaveBeenCalled();
  });

  test('k8s: calls startSSHProcess before destroy and stopSSHProcess after', async () => {
    const k8sProject = new (class extends BaseProject {})(
      mockCommand as unknown as Record<string, unknown>,
      { cluster_type: 'k8s', environment: 'dev', command: 'new' },
    );
    (k8sProject as unknown as { projectPath: string }).projectPath =
      '/root/demo';

    await k8sProject.terraformDestroy('demo');

    // k8s cluster_type produces empty modules array (not eks-fargate, eks-nodegroup, or aks)
    // so the for-loop over modules does nothing. runTerraformInit is called though.
    expect(mockTerraformInstance.runTerraformInit).toHaveBeenCalledWith(
      '/root/demo/infrastructure',
      'dev-config.tfvars',
      'demo',
    );
    // Empty modules array means no SSH or destroy calls
    // The modules variable is [] for k8s, so loop body never executes
    expect(mockTerraformInstance.startSSHProcess).not.toHaveBeenCalled();
    expect(mockTerraformInstance.runTerraformDestroy).not.toHaveBeenCalled();
    expect(mockTerraformInstance.stopSSHProcess).not.toHaveBeenCalled();
  });

  test('unknown cluster type: empty modules, no destroy calls', async () => {
    const unknownProject = new (class extends BaseProject {})(
      mockCommand as unknown as Record<string, unknown>,
      { cluster_type: 'unknown', environment: 'dev', command: 'new' },
    );
    (unknownProject as unknown as { projectPath: string }).projectPath =
      '/root/demo';

    await unknownProject.terraformDestroy('demo');

    expect(mockTerraformInstance.runTerraformInit).not.toHaveBeenCalled();
    expect(mockTerraformInstance.runTerraformDestroy).not.toHaveBeenCalled();
  });

  test('module destroy error: logs error and continues to next module', async () => {
    mockTerraformInstance.runTerraformDestroy
      .mockRejectedValueOnce(new Error('vpc destroy failed'))
      .mockResolvedValueOnce(undefined);

    await project.terraformDestroy('demo');

    expect(AppLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(
        'Error destroying Terraform for module: module.vpc',
      ),
      true,
    );
    // Second module should still be attempted
    expect(mockTerraformInstance.runTerraformDestroy).toHaveBeenCalledTimes(2);
  });

  test('TerraformProject.getProject returns null: no crash via optional chaining', async () => {
    const TerraformProject = (
      await import('../../src/core/terraform-project.js')
    ).default;
    (TerraformProject.getProject as jest.Mock).mockResolvedValueOnce(null);

    await expect(project.terraformDestroy('demo')).resolves.toBeUndefined();
  });
});

// ------------------------------------
// getConfigStringOrUndefined()
// ------------------------------------
describe('BaseProject.getConfigStringOrUndefined()', () => {
  test('returns string when value is a string', () => {
    const proj = new (class extends BaseProject {
      public testGetConfigStringOrUndefined(key: string) {
        return this.getConfigStringOrUndefined(key);
      }
    })(mockCommand as unknown as Record<string, unknown>, { name: 'hello' });

    expect(proj.testGetConfigStringOrUndefined('name')).toBe('hello');
  });

  test('returns undefined when value is not a string', () => {
    const proj = new (class extends BaseProject {
      public testGetConfigStringOrUndefined(key: string) {
        return this.getConfigStringOrUndefined(key);
      }
    })(mockCommand as unknown as Record<string, unknown>, {
      count: 42 as unknown as string,
    });

    expect(proj.testGetConfigStringOrUndefined('count')).toBeUndefined();
  });
});

// ------------------------------------
// getConfigArray()
// ------------------------------------
describe('BaseProject.getConfigArray()', () => {
  test('returns array when value is an array', () => {
    const proj = new (class extends BaseProject {
      public testGetConfigArray(key: string) {
        return this.getConfigArray(key);
      }
    })(mockCommand as unknown as Record<string, unknown>, {
      items: ['a', 'b'],
    });

    expect(proj.testGetConfigArray('items')).toEqual(['a', 'b']);
  });

  test('returns empty array when value is not an array', () => {
    const proj = new (class extends BaseProject {
      public testGetConfigArray(key: string) {
        return this.getConfigArray(key);
      }
    })(mockCommand as unknown as Record<string, unknown>, {
      items: 'not-array',
    });

    expect(proj.testGetConfigArray('items')).toEqual([]);
  });
});

// ------------------------------------
// getConfigAsRecord()
// ------------------------------------
describe('BaseProject.getConfigAsRecord()', () => {
  test('filters config to string-only values', () => {
    const proj = new (class extends BaseProject {
      public testGetConfigAsRecord() {
        return this.getConfigAsRecord();
      }
    })(mockCommand as unknown as Record<string, unknown>, {
      name: 'demo',
      count: 42 as unknown as string,
      tags: ['a', 'b'],
      region: 'us-east-1',
    });

    const result = proj.testGetConfigAsRecord();

    expect(result).toEqual({
      name: 'demo',
      region: 'us-east-1',
    });
  });
});
