jest.setTimeout(30000);

// Replace global setTimeout with a mock that invokes callbacks immediately
// to avoid the 15-second delay in the source code without breaking async/await
const originalSetTimeout = global.setTimeout;
const mockSetTimeoutFn = jest.fn(
  (callback: (...args: unknown[]) => void, _ms?: number) => {
    callback();
    return 0 as unknown as NodeJS.Timeout;
  },
);
global.setTimeout = mockSetTimeoutFn as unknown as typeof setTimeout;

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234'),
}));

jest.mock('../../src/logger/appLogger.js', () => ({
  AppLogger: {
    configureLogger: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockMergeConfigs = jest.fn();
const mockGetConfig = jest.fn();

jest.mock('../../src/config/system.js', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn(() => ({
      mergeConfigs: mockMergeConfigs,
      getConfig: mockGetConfig,
    })),
  },
}));

jest.mock('../../src/core/utils/projectConfigReader-utils.js', () => ({
  dotMagikubeConfig: jest.fn(),
}));

const mockCreateProject = jest.fn(() => Promise.resolve());
const mockAWSProfileActivate = jest.fn(() => Promise.resolve());
const mockRunTerraformInit = jest.fn(() => Promise.resolve());
const mockRunTerraformApply = jest.fn(() => Promise.resolve());

jest.mock('../../src/core/restartTerraform-project.js', () => ({
  __esModule: true,
  default: {
    getProject: jest.fn(),
  },
}));

jest.mock('../../src/core/utils/statusUpdater-utils.js', () => ({
  readStatusFile: jest.fn(),
  updateStatusFile: jest.fn(),
}));

jest.mock('../../src/core/utils/unlockTerraformState-utils.js', () => ({
  runTerraformUnlockCommands: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/core/utils/executeCommandWithRetry-utils.js', () => ({
  executeCommandWithRetry: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/core/utils/healthCheck-utils.js', () => ({
  serviceHealthCheck: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/core/utils/setupAndPushService-utils.js', () => ({
  setupAndPushServices: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../src/core/constants/constants.js', () => ({
  aws_modules: [
    'module.vpc',
    'module.eks',
    'module.acm',
    'module.ecr-repo',
    'module.gitops',
    'module.repository',
    'module.ingress-controller',
    'module.argo',
    'module.environment',
  ],
  azure_modules: [
    'module.vnet',
    'module.nsg',
    'module.bastion',
    'module.kv',
    'module.agw',
    'module.k8s_common',
    'module.acr',
    'module.aks',
    'module.sql_server',
    'module.gitops',
    'module.repository',
  ],
}));

import RestartProject from '../../src/commands/resume/index.js';
import { AppLogger } from '../../src/logger/appLogger.js';
import { dotMagikubeConfig } from '../../src/core/utils/projectConfigReader-utils.js';
import RestartTerraformProject from '../../src/core/restartTerraform-project.js';
import {
  readStatusFile,
  updateStatusFile,
} from '../../src/core/utils/statusUpdater-utils.js';
import { runTerraformUnlockCommands } from '../../src/core/utils/unlockTerraformState-utils.js';
import { executeCommandWithRetry } from '../../src/core/utils/executeCommandWithRetry-utils.js';
import { serviceHealthCheck } from '../../src/core/utils/healthCheck-utils.js';
import { setupAndPushServices } from '../../src/core/utils/setupAndPushService-utils.js';

// Helper: creates a mock command instance with parse mocked
function createMockCommand(projectName = 'myapp') {
  const mockCommand = Object.create(RestartProject.prototype);
  mockCommand.id = 'resume';
  mockCommand.parse = jest.fn().mockResolvedValue({
    args: { name: projectName },
  });
  return mockCommand;
}

// Helper: creates a mock terraform object
function createMockTerraform() {
  return {
    createProject: mockCreateProject,
    AWSProfileActivate: mockAWSProfileActivate,
    runTerraformInit: mockRunTerraformInit,
    runTerraformApply: mockRunTerraformApply,
  };
}

// Default AWS config
function awsConfig(overrides: Record<string, unknown> = {}) {
  return {
    cloud_provider: 'aws',
    cluster_type: 'eks-fargate',
    aws_profile: 'default',
    environment: 'dev',
    github_access_token: 'test-token',
    git_user_name: 'testuser',
    github_owner: 'testorg',
    source_code_repository: 'testrepo',
    aws_region: 'us-east-1',
    aws_access_key_id: 'AKIATEST',
    aws_secret_access_key: 'secrettest',
    ...overrides,
  };
}

// Default Azure config
function azureConfig(overrides: Record<string, unknown> = {}) {
  return {
    cloud_provider: 'azure',
    cluster_type: 'aks',
    environment: 'dev',
    github_access_token: 'test-token',
    git_user_name: 'testuser',
    github_owner: 'testorg',
    source_code_repository: 'testrepo',
    aws_region: 'eastus',
    aws_access_key_id: '',
    aws_secret_access_key: '',
    ...overrides,
  };
}

const mockExit = jest
  .spyOn(process, 'exit')
  .mockImplementation((() => {}) as unknown as (code?: number) => never);

describe('RestartProject Command', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExit.mockClear();
    mockSetTimeoutFn.mockClear();
    mockCreateProject.mockReset().mockResolvedValue(undefined);
    mockAWSProfileActivate.mockReset().mockResolvedValue(undefined);
    mockRunTerraformInit.mockReset().mockResolvedValue(undefined);
    mockRunTerraformApply.mockReset().mockResolvedValue(undefined);
  });

  afterAll(() => {
    mockExit.mockRestore();
    global.setTimeout = originalSetTimeout;
  });

  describe('Command Metadata', () => {
    test('should have correct description', () => {
      expect(RestartProject.description).toContain('Restart');
    });

    test('should have name argument required', () => {
      expect(RestartProject.args.name.required).toBe(true);
      expect(RestartProject.args.name.description).toContain('restarted');
    });

    test('should have examples', () => {
      expect(RestartProject.examples.length).toBeGreaterThan(0);
    });
  });

  describe('Happy path - AWS resume with failed terraform-apply', () => {
    let mockCommand: ReturnType<typeof createMockCommand>;

    beforeEach(() => {
      mockCommand = createMockCommand('myapp');

      const config = awsConfig();
      (dotMagikubeConfig as jest.Mock).mockReturnValue({ ...config });
      mockGetConfig.mockReturnValue(config);

      (RestartTerraformProject.getProject as jest.Mock).mockResolvedValue(
        createMockTerraform(),
      );

      (readStatusFile as jest.Mock).mockResolvedValue({
        services: { 'terraform-apply': 'fail' },
        modules: {
          'module.vpc': 'success',
          'module.eks': 'fail',
          'module.acm': 'pending',
          'module.ecr-repo': 'success',
          'module.gitops': 'success',
          'module.repository': 'success',
          'module.ingress-controller': 'success',
          'module.argo': 'success',
          'module.environment': 'success',
        },
      });
    });

    test('should configure logger with project name', async () => {
      await mockCommand.run();

      expect(AppLogger.configureLogger).toHaveBeenCalledWith('myapp', 'resume');
    });

    test('should read .magikube config and merge into SystemConfig', async () => {
      await mockCommand.run();

      expect(dotMagikubeConfig).toHaveBeenCalledWith('myapp', process.cwd());
      expect(mockMergeConfigs).toHaveBeenCalled();
    });

    test('should call terraform createProject', async () => {
      await mockCommand.run();

      expect(mockCreateProject).toHaveBeenCalledWith('myapp', process.cwd());
    });

    test('should call AWSProfileActivate for aws provider', async () => {
      await mockCommand.run();

      expect(mockAWSProfileActivate).toHaveBeenCalledWith('default');
    });

    test('should call runTerraformInit', async () => {
      await mockCommand.run();

      expect(mockRunTerraformInit).toHaveBeenCalledWith(
        `${process.cwd()}/myapp/infrastructure`,
        'dev-config.tfvars',
        'myapp',
      );
    });

    test('should run terraform unlock commands when terraform-apply is fail', async () => {
      await mockCommand.run();

      expect(runTerraformUnlockCommands).toHaveBeenCalledWith(
        expect.stringContaining('myapp'),
        expect.objectContaining({ cloud_provider: 'aws' }),
      );
    });

    test('should destroy and re-apply failed modules', async () => {
      await mockCommand.run();

      // module.eks has status 'fail', so executeCommandWithRetry should be called
      // for AWS_PROFILE export and terraform destroy -target=module.eks
      expect(executeCommandWithRetry).toHaveBeenCalledWith(
        expect.stringContaining('terraform destroy -target=module.eks'),
        expect.any(Object),
        1,
      );

      // module.eks (fail) and module.acm (pending) should both go through runTerraformApply
      expect(mockRunTerraformApply).toHaveBeenCalledWith(
        `${process.cwd()}/myapp/infrastructure`,
        'module.eks',
        'terraform.tfvars',
      );
      expect(mockRunTerraformApply).toHaveBeenCalledWith(
        `${process.cwd()}/myapp/infrastructure`,
        'module.acm',
        'terraform.tfvars',
      );
    });

    test('should update status file for each applied module', async () => {
      await mockCommand.run();

      // Before apply: updateStatusFile(name, module, 'fail')
      // After apply success: updateStatusFile(name, module, 'success')
      expect(updateStatusFile).toHaveBeenCalledWith(
        'myapp',
        'module.eks',
        'fail',
      );
      expect(updateStatusFile).toHaveBeenCalledWith(
        'myapp',
        'module.eks',
        'success',
      );
      expect(updateStatusFile).toHaveBeenCalledWith(
        'myapp',
        'module.acm',
        'fail',
      );
      expect(updateStatusFile).toHaveBeenCalledWith(
        'myapp',
        'module.acm',
        'success',
      );
    });

    test('should call setupAndPushServices and serviceHealthCheck', async () => {
      await mockCommand.run();

      expect(setupAndPushServices).toHaveBeenCalled();
      expect(serviceHealthCheck).toHaveBeenCalled();
    });

    test('should remove dist folder via executeCommandWithRetry', async () => {
      await mockCommand.run();

      expect(executeCommandWithRetry).toHaveBeenCalledWith(
        expect.stringContaining('rm -rf'),
        expect.objectContaining({ cwd: process.cwd() }),
        1,
      );
    });
  });

  describe('Happy path - Azure resume with pending modules', () => {
    let mockCommand: ReturnType<typeof createMockCommand>;

    beforeEach(() => {
      mockCommand = createMockCommand('azure-app');

      const config = azureConfig();
      (dotMagikubeConfig as jest.Mock).mockReturnValue({ ...config });
      mockGetConfig.mockReturnValue(config);

      (RestartTerraformProject.getProject as jest.Mock).mockResolvedValue(
        createMockTerraform(),
      );

      const moduleStatuses: Record<string, string> = {};
      const azureModules = [
        'module.vnet',
        'module.nsg',
        'module.bastion',
        'module.kv',
        'module.agw',
        'module.k8s_common',
        'module.acr',
        'module.aks',
        'module.sql_server',
        'module.gitops',
        'module.repository',
      ];
      azureModules.forEach((m) => {
        moduleStatuses[m] = 'pending';
      });

      (readStatusFile as jest.Mock).mockResolvedValue({
        services: { 'terraform-apply': 'pending' },
        modules: moduleStatuses,
      });
    });

    test('should NOT call AWSProfileActivate for azure provider', async () => {
      await mockCommand.run();

      expect(mockAWSProfileActivate).not.toHaveBeenCalled();
    });

    test('should iterate over azure_modules and apply pending modules', async () => {
      await mockCommand.run();

      // All azure modules are pending so each should get runTerraformApply
      expect(mockRunTerraformApply).toHaveBeenCalledTimes(11);

      // Verify a few specific modules
      expect(mockRunTerraformApply).toHaveBeenCalledWith(
        `${process.cwd()}/azure-app/infrastructure`,
        'module.vnet',
        'terraform.tfvars',
      );
      expect(mockRunTerraformApply).toHaveBeenCalledWith(
        `${process.cwd()}/azure-app/infrastructure`,
        'module.aks',
        'terraform.tfvars',
      );
    });

    test('should not call terraform destroy for pending modules (only for fail)', async () => {
      await mockCommand.run();

      // Pending modules should NOT have terraform destroy called on them
      expect(executeCommandWithRetry).not.toHaveBeenCalledWith(
        expect.stringContaining('terraform destroy -target='),
        expect.any(Object),
        1,
      );
    });

    test('should call runTerraformUnlockCommands for azure', async () => {
      await mockCommand.run();

      expect(runTerraformUnlockCommands).toHaveBeenCalled();
    });
  });

  describe('Missing .magikube config', () => {
    test('should log error and exit with code 1 when config is null', async () => {
      const mockCommand = createMockCommand('missing-project');
      (dotMagikubeConfig as jest.Mock).mockReturnValue(null);

      // process.exit is mocked as no-op, so execution continues past it and
      // hits `responses.command = this.id` where responses is null, causing a TypeError.
      // We catch that to verify the assertions before the crash point.
      try {
        await mockCommand.run();
      } catch (_e) {
        // Expected TypeError from setting property on null
      }

      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('The .magikube configuration file is missing'),
        true,
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('should log error and exit with code 1 when config is undefined', async () => {
      const mockCommand = createMockCommand('missing-project');
      (dotMagikubeConfig as jest.Mock).mockReturnValue(undefined);

      try {
        await mockCommand.run();
      } catch (_e) {
        // Expected TypeError from setting property on undefined
      }

      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('The .magikube configuration file is missing'),
        true,
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('should not proceed with terraform operations', async () => {
      const mockCommand = createMockCommand('missing-project');
      (dotMagikubeConfig as jest.Mock).mockReturnValue(null);

      try {
        await mockCommand.run();
      } catch (_e) {
        // Expected TypeError
      }

      expect(RestartTerraformProject.getProject).not.toHaveBeenCalled();
    });
  });

  describe('No terraform project returned', () => {
    let mockCommand: ReturnType<typeof createMockCommand>;

    beforeEach(() => {
      mockCommand = createMockCommand('myapp');

      const config = awsConfig();
      (dotMagikubeConfig as jest.Mock).mockReturnValue({ ...config });
      mockGetConfig.mockReturnValue(config);

      (RestartTerraformProject.getProject as jest.Mock).mockResolvedValue(null);

      (readStatusFile as jest.Mock).mockResolvedValue({
        services: { 'terraform-apply': 'fail' },
        modules: { 'module.vpc': 'fail' },
      });
    });

    test('should skip terraform operations when getProject returns null', async () => {
      await mockCommand.run();

      expect(mockCreateProject).not.toHaveBeenCalled();
      expect(mockRunTerraformInit).not.toHaveBeenCalled();
      expect(mockRunTerraformApply).not.toHaveBeenCalled();
      expect(mockAWSProfileActivate).not.toHaveBeenCalled();
    });

    test('should still run dist folder cleanup', async () => {
      await mockCommand.run();

      expect(executeCommandWithRetry).toHaveBeenCalledWith(
        expect.stringContaining('rm -rf'),
        expect.objectContaining({ cwd: process.cwd() }),
        1,
      );
    });

    test('should still run serviceHealthCheck', async () => {
      await mockCommand.run();

      expect(serviceHealthCheck).toHaveBeenCalled();
    });

    test('should not call setupAndPushServices when terraform is null', async () => {
      await mockCommand.run();

      expect(setupAndPushServices).not.toHaveBeenCalled();
    });
  });

  describe('Module apply failure during resume', () => {
    let mockCommand: ReturnType<typeof createMockCommand>;

    beforeEach(() => {
      mockCommand = createMockCommand('myapp');

      const config = awsConfig();
      (dotMagikubeConfig as jest.Mock).mockReturnValue({ ...config });
      mockGetConfig.mockReturnValue(config);

      (RestartTerraformProject.getProject as jest.Mock).mockResolvedValue(
        createMockTerraform(),
      );

      (readStatusFile as jest.Mock).mockResolvedValue({
        services: { 'terraform-apply': 'fail' },
        modules: {
          'module.vpc': 'fail',
          'module.eks': 'fail',
          'module.acm': 'success',
          'module.ecr-repo': 'success',
          'module.gitops': 'success',
          'module.repository': 'success',
          'module.ingress-controller': 'success',
          'module.argo': 'success',
          'module.environment': 'success',
        },
      });
    });

    test('should log error and continue to next module on apply failure', async () => {
      // Make the first module apply throw, second succeed
      mockRunTerraformApply
        .mockRejectedValueOnce(new Error('VPC apply failed'))
        .mockResolvedValueOnce(undefined);

      await mockCommand.run();

      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Error applying Terraform for module: module.vpc',
        ),
        true,
      );

      // Should still attempt the second failed module
      expect(mockRunTerraformApply).toHaveBeenCalledTimes(2);
    });

    test('should set allModulesAppliedSuccessfully to false and update status to fail', async () => {
      mockRunTerraformApply.mockRejectedValueOnce(
        new Error('VPC apply failed'),
      );

      await mockCommand.run();

      // terraform-apply status should be set to 'fail' since at least one module failed
      expect(updateStatusFile).toHaveBeenCalledWith(
        'myapp',
        'terraform-apply',
        'fail',
      );
    });

    test('should update individual module status to fail on error', async () => {
      mockRunTerraformApply.mockRejectedValueOnce(
        new Error('VPC apply failed'),
      );

      await mockCommand.run();

      // The module's status should be marked 'fail' in the catch block
      // updateStatusFile is called with 'fail' before apply attempt, then again with 'fail' on error
      const failCalls = (updateStatusFile as jest.Mock).mock.calls.filter(
        (call: unknown[]) => call[1] === 'module.vpc' && call[2] === 'fail',
      );
      expect(failCalls.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('All modules succeed', () => {
    test('should set terraform-apply status to success when all modules pass', async () => {
      const mockCommand = createMockCommand('myapp');

      const config = awsConfig();
      (dotMagikubeConfig as jest.Mock).mockReturnValue({ ...config });
      mockGetConfig.mockReturnValue(config);

      (RestartTerraformProject.getProject as jest.Mock).mockResolvedValue(
        createMockTerraform(),
      );

      (readStatusFile as jest.Mock).mockResolvedValue({
        services: { 'terraform-apply': 'fail' },
        modules: {
          'module.vpc': 'fail',
          'module.eks': 'success',
          'module.acm': 'success',
          'module.ecr-repo': 'success',
          'module.gitops': 'success',
          'module.repository': 'success',
          'module.ingress-controller': 'success',
          'module.argo': 'success',
          'module.environment': 'success',
        },
      });

      mockRunTerraformApply.mockResolvedValue(undefined);

      await mockCommand.run();

      expect(updateStatusFile).toHaveBeenCalledWith(
        'myapp',
        'terraform-apply',
        'success',
      );
    });
  });

  describe('AWS profile activation', () => {
    test('should call AWSProfileActivate only when cloud_provider is aws', async () => {
      const mockCommand = createMockCommand('myapp');

      const config = awsConfig();
      (dotMagikubeConfig as jest.Mock).mockReturnValue({ ...config });
      mockGetConfig.mockReturnValue(config);

      (RestartTerraformProject.getProject as jest.Mock).mockResolvedValue(
        createMockTerraform(),
      );

      (readStatusFile as jest.Mock).mockResolvedValue({
        services: { 'terraform-apply': 'success' },
        modules: {},
      });

      await mockCommand.run();

      expect(mockAWSProfileActivate).toHaveBeenCalledWith('default');
    });

    test('should NOT call AWSProfileActivate when cloud_provider is azure', async () => {
      const mockCommand = createMockCommand('myapp');

      const config = azureConfig();
      (dotMagikubeConfig as jest.Mock).mockReturnValue({ ...config });
      mockGetConfig.mockReturnValue(config);

      (RestartTerraformProject.getProject as jest.Mock).mockResolvedValue(
        createMockTerraform(),
      );

      (readStatusFile as jest.Mock).mockResolvedValue({
        services: { 'terraform-apply': 'success' },
        modules: {},
      });

      await mockCommand.run();

      expect(mockAWSProfileActivate).not.toHaveBeenCalled();
    });
  });

  describe('Cluster type branching', () => {
    const clusterTypes = ['eks-fargate', 'eks-nodegroup', 'aks'];

    clusterTypes.forEach((clusterType) => {
      test(`should go through terraform init/apply flow for cluster_type=${clusterType}`, async () => {
        const mockCommand = createMockCommand('myapp');

        const provider = clusterType === 'aks' ? 'azure' : 'aws';
        const config =
          provider === 'aws'
            ? awsConfig({ cluster_type: clusterType })
            : azureConfig({ cluster_type: clusterType });

        (dotMagikubeConfig as jest.Mock).mockReturnValue({ ...config });
        mockGetConfig.mockReturnValue(config);

        (RestartTerraformProject.getProject as jest.Mock).mockResolvedValue(
          createMockTerraform(),
        );

        (readStatusFile as jest.Mock).mockResolvedValue({
          services: { 'terraform-apply': 'fail' },
          modules: { 'module.vpc': 'fail' },
        });

        await mockCommand.run();

        expect(mockRunTerraformInit).toHaveBeenCalled();
      });
    });

    test('should skip the terraform init/apply block for non-matching cluster type', async () => {
      const mockCommand = createMockCommand('myapp');

      const config = awsConfig({ cluster_type: 'k8s' });
      (dotMagikubeConfig as jest.Mock).mockReturnValue({ ...config });
      mockGetConfig.mockReturnValue(config);

      (RestartTerraformProject.getProject as jest.Mock).mockResolvedValue(
        createMockTerraform(),
      );

      (readStatusFile as jest.Mock).mockResolvedValue({
        services: { 'terraform-apply': 'fail' },
        modules: { 'module.vpc': 'fail' },
      });

      await mockCommand.run();

      // createProject should still be called
      expect(mockCreateProject).toHaveBeenCalled();

      // But terraform init and unlock should NOT be called for unsupported cluster type
      expect(mockRunTerraformInit).not.toHaveBeenCalled();
      expect(runTerraformUnlockCommands).not.toHaveBeenCalled();
    });
  });

  describe('Terraform-apply status not fail/pending skips unlock block', () => {
    test('should skip unlock and module iteration when terraform-apply status is success', async () => {
      const mockCommand = createMockCommand('myapp');

      const config = awsConfig();
      (dotMagikubeConfig as jest.Mock).mockReturnValue({ ...config });
      mockGetConfig.mockReturnValue(config);

      (RestartTerraformProject.getProject as jest.Mock).mockResolvedValue(
        createMockTerraform(),
      );

      (readStatusFile as jest.Mock).mockResolvedValue({
        services: { 'terraform-apply': 'success' },
        modules: {},
      });

      await mockCommand.run();

      // Terraform init should still be called (it's outside the if-block)
      expect(mockRunTerraformInit).toHaveBeenCalled();

      // But unlock and module apply should be skipped
      expect(runTerraformUnlockCommands).not.toHaveBeenCalled();
      expect(mockRunTerraformApply).not.toHaveBeenCalled();
    });
  });

  describe('Global error catch', () => {
    test('should log error and exit with code 1 on unexpected error in try block', async () => {
      const mockCommand = createMockCommand('myapp');

      const config = awsConfig();
      (dotMagikubeConfig as jest.Mock).mockReturnValue({ ...config });
      mockGetConfig.mockReturnValue(config);

      // Make readStatusFile throw to trigger the outer catch
      (readStatusFile as jest.Mock).mockRejectedValue(
        new Error('Status file read error'),
      );

      (RestartTerraformProject.getProject as jest.Mock).mockResolvedValue(
        createMockTerraform(),
      );

      await mockCommand.run();

      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('An error occurred during the setup process'),
        true,
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('should catch error from RestartTerraformProject.getProject throwing', async () => {
      const mockCommand = createMockCommand('myapp');

      const config = awsConfig();
      (dotMagikubeConfig as jest.Mock).mockReturnValue({ ...config });
      mockGetConfig.mockReturnValue(config);

      (RestartTerraformProject.getProject as jest.Mock).mockRejectedValue(
        new Error('getProject failure'),
      );

      (readStatusFile as jest.Mock).mockResolvedValue({
        services: { 'terraform-apply': 'success' },
        modules: {},
      });

      await mockCommand.run();

      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('An error occurred during the setup process'),
        true,
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    test('should catch error from terraform createProject throwing', async () => {
      const mockCommand = createMockCommand('myapp');

      const config = awsConfig();
      (dotMagikubeConfig as jest.Mock).mockReturnValue({ ...config });
      mockGetConfig.mockReturnValue(config);

      mockCreateProject.mockRejectedValue(new Error('createProject failed'));

      (RestartTerraformProject.getProject as jest.Mock).mockResolvedValue(
        createMockTerraform(),
      );

      (readStatusFile as jest.Mock).mockResolvedValue({
        services: { 'terraform-apply': 'success' },
        modules: {},
      });

      await mockCommand.run();

      expect(AppLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('An error occurred during the setup process'),
        true,
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe('15-second delay', () => {
    test('should call setTimeout with 15000ms delay', async () => {
      const mockCommand = createMockCommand('myapp');

      const config = awsConfig();
      (dotMagikubeConfig as jest.Mock).mockReturnValue({ ...config });
      mockGetConfig.mockReturnValue(config);

      (RestartTerraformProject.getProject as jest.Mock).mockResolvedValue(
        createMockTerraform(),
      );

      (readStatusFile as jest.Mock).mockResolvedValue({
        services: { 'terraform-apply': 'success' },
        modules: {},
      });

      await mockCommand.run();

      // The mock setTimeout should have been called with the 15000ms delay
      expect(mockSetTimeoutFn).toHaveBeenCalledWith(
        expect.any(Function),
        15000,
      );

      // And terraform init should have been called after the delay resolved
      expect(mockRunTerraformInit).toHaveBeenCalled();
    });
  });

  describe('Logger initialization', () => {
    test('should call AppLogger.info with Logger Started message', async () => {
      const mockCommand = createMockCommand('myapp');

      const config = awsConfig();
      (dotMagikubeConfig as jest.Mock).mockReturnValue({ ...config });
      mockGetConfig.mockReturnValue(config);

      (RestartTerraformProject.getProject as jest.Mock).mockResolvedValue(
        createMockTerraform(),
      );

      (readStatusFile as jest.Mock).mockResolvedValue({
        services: { 'terraform-apply': 'success' },
        modules: {},
      });

      await mockCommand.run();

      expect(AppLogger.info).toHaveBeenCalledWith('Logger Started ...');
    });
  });

  describe('Config merging', () => {
    test('should set command id on responses before merging', async () => {
      const mockCommand = createMockCommand('myapp');

      const config = awsConfig();
      (dotMagikubeConfig as jest.Mock).mockReturnValue({ ...config });
      mockGetConfig.mockReturnValue(config);

      (RestartTerraformProject.getProject as jest.Mock).mockResolvedValue(
        createMockTerraform(),
      );

      (readStatusFile as jest.Mock).mockResolvedValue({
        services: { 'terraform-apply': 'success' },
        modules: {},
      });

      await mockCommand.run();

      // mergeConfigs should have been called with an object containing command: 'resume'
      expect(mockMergeConfigs).toHaveBeenCalledWith(
        expect.objectContaining({ command: 'resume' }),
      );
    });
  });

  describe('Module status combinations', () => {
    test('should skip modules with success status', async () => {
      const mockCommand = createMockCommand('myapp');

      const config = awsConfig();
      (dotMagikubeConfig as jest.Mock).mockReturnValue({ ...config });
      mockGetConfig.mockReturnValue(config);

      (RestartTerraformProject.getProject as jest.Mock).mockResolvedValue(
        createMockTerraform(),
      );

      (readStatusFile as jest.Mock).mockResolvedValue({
        services: { 'terraform-apply': 'fail' },
        modules: {
          'module.vpc': 'success',
          'module.eks': 'success',
          'module.acm': 'success',
          'module.ecr-repo': 'success',
          'module.gitops': 'success',
          'module.repository': 'success',
          'module.ingress-controller': 'success',
          'module.argo': 'success',
          'module.environment': 'success',
        },
      });

      await mockCommand.run();

      // No modules to apply since all are success
      expect(mockRunTerraformApply).not.toHaveBeenCalled();

      // All modules succeeded so terraform-apply should be set to success
      expect(updateStatusFile).toHaveBeenCalledWith(
        'myapp',
        'terraform-apply',
        'success',
      );
    });

    test('should handle mix of fail and pending modules', async () => {
      const mockCommand = createMockCommand('myapp');

      const config = awsConfig();
      (dotMagikubeConfig as jest.Mock).mockReturnValue({ ...config });
      mockGetConfig.mockReturnValue(config);

      (RestartTerraformProject.getProject as jest.Mock).mockResolvedValue(
        createMockTerraform(),
      );

      (readStatusFile as jest.Mock).mockResolvedValue({
        services: { 'terraform-apply': 'pending' },
        modules: {
          'module.vpc': 'fail',
          'module.eks': 'pending',
          'module.acm': 'success',
          'module.ecr-repo': 'success',
          'module.gitops': 'success',
          'module.repository': 'success',
          'module.ingress-controller': 'success',
          'module.argo': 'success',
          'module.environment': 'success',
        },
      });

      await mockCommand.run();

      // module.vpc (fail) should have destroy called, module.eks (pending) should not
      expect(executeCommandWithRetry).toHaveBeenCalledWith(
        expect.stringContaining('terraform destroy -target=module.vpc'),
        expect.any(Object),
        1,
      );

      // Both should have runTerraformApply called
      expect(mockRunTerraformApply).toHaveBeenCalledTimes(2);
    });
  });

  describe('FullConfigObject construction', () => {
    test('should construct configObject from project_config and pass to setupAndPushServices', async () => {
      const mockCommand = createMockCommand('myapp');

      const config = awsConfig({
        github_access_token: 'my-token',
        git_user_name: 'myuser',
        github_owner: 'myorg',
        source_code_repository: 'myrepo',
        environment: 'staging',
      });
      (dotMagikubeConfig as jest.Mock).mockReturnValue({ ...config });
      mockGetConfig.mockReturnValue(config);

      (RestartTerraformProject.getProject as jest.Mock).mockResolvedValue(
        createMockTerraform(),
      );

      (readStatusFile as jest.Mock).mockResolvedValue({
        services: { 'terraform-apply': 'success' },
        modules: {},
      });

      await mockCommand.run();

      expect(setupAndPushServices).toHaveBeenCalledWith(
        config,
        expect.objectContaining({
          common: expect.objectContaining({
            token: 'my-token',
            userName: 'myuser',
            orgName: 'myorg',
            sourceCodeRepo: 'myrepo',
            projectName: 'myapp',
            environment: 'staging',
          }),
        }),
      );
    });
  });
});
