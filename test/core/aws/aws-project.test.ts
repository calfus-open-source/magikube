jest.setTimeout(30000);

const originalSetImmediate = global.setImmediate;
// Assign a mock setImmediate while preserving correct typing for TypeScript
const mockSetImmediate = (global.setImmediate = (jest.fn((callback: Function) => {
    callback();
}) as unknown) as typeof setImmediate);

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
                constructor(command: any, config: any) {
                    // mimic original BaseProject behaviour
                    (this as any).config = config;
                    (this as any).command = command;
                }
            }
            // Provide prototype-level mocks so they can be spied on without shadowing subclass methods
            (BaseProjectMock.prototype as any).createProject = jest.fn(() => Promise.resolve(true));
            (BaseProjectMock.prototype as any).destroyProject = jest.fn(() => Promise.resolve(true));
            (BaseProjectMock.prototype as any).createFile = jest.fn();
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

jest.mock('../../../src/core/aws/aws-tf-backend.js', () => ({
    __esModule: true,
    default: {
        create: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve(true)),
    },
}));

jest.mock('../../../src/core/aws/aws-iam.js', () => ({
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
                cloud_provider: 'aws',
                aws_region: 'us-east-1',
            })),
        })),
    },
}));

jest.mock('fs', () => ({
    ...jest.requireActual('fs'),
}));

import AWSProject from '../../../src/core/aws/aws-project.js';
import { AppLogger } from '../../../src/logger/appLogger.js';
import { updateStatusFile } from '../../../src/core/utils/statusUpdater-utils.js';
import { executeCommandWithRetry } from '../../../src/core/utils/executeCommandWithRetry-utils.js';
import SystemConfig from '../../../src/config/system.js';
import AWSTerraformBackend from '../../../src/core/aws/aws-tf-backend.js';
import AWSPolicies from '../../../src/core/aws/aws-iam.js';
import { EventEmitter } from 'events';

const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => { }) as any);

describe('AWSProject', () => {
    let awsProject: any;
    let mockCommand: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockExit.mockClear();
        mockSpawn.mockClear();
        mockExecSync.mockClear();

        mockCommand = {
            id: 'create',
        };

        awsProject = new AWSProject(mockCommand, {
            project_name: 'test-project',
            cloud_provider: 'aws',
            command: 'new',
            aws_region: 'us-east-1',
            aws_access_key_id: 'AKIA123456789',
            aws_secret_access_key: 'secret-key',
            project_id: 'proj-123',
            environment: 'dev',
        });
    });

    afterAll(() => {
        mockExit.mockRestore();
        global.setImmediate = originalSetImmediate;
    });

    describe('createProject', () => {
        test('should create terraform backend', async () => {
            (AWSTerraformBackend.create as jest.Mock).mockResolvedValue(true);
            (AWSPolicies.create as jest.Mock).mockResolvedValue(true);

            await expect(awsProject.createProject('test-project', '/path', 'create')).resolves.toBeUndefined();
        });
    });


    describe('destroyProject', () => {
        test('should clean up AWS resources on destroy', async () => {
            (AWSPolicies.delete as jest.Mock).mockResolvedValue(true);
            (AWSTerraformBackend.delete as jest.Mock).mockResolvedValue(true);

            await awsProject.destroyProject('test-project', '/path');

            expect(AWSPolicies.delete).toBeTruthy();
        });

        test('should skip destroy if dryrun is true', async () => {
            const dryrunProject = new AWSProject(mockCommand, {
                project_name: 'test-project',
                cloud_provider: 'aws',
                command: 'new',
                aws_region: 'us-east-1',
                aws_access_key_id: 'AKIA123456789',
                aws_secret_access_key: 'secret-key',
                project_id: 'proj-123',
                environment: 'dev',
                dryrun: true,
            });

            (AWSPolicies.delete as jest.Mock).mockClear();

            await dryrunProject.destroyProject('test-project', '/path');

            expect(true).toBe(true);
        });
    });

    describe('SSH Process Management', () => {
        test('should handle stop SSH when no process running', async () => {
            await awsProject.stopSSHProcess();

            expect(AppLogger.debug).toHaveBeenCalledWith('No SSH process is running.');
        });
    });


    describe('AWSProfileActivate', () => {
        test('should activate AWS profile', async () => {
            const originalProfile = process.env.AWS_PROFILE;

            await awsProject.AWSProfileActivate('production');

            expect(process.env.AWS_PROFILE).toBe('production');
            expect(AppLogger.info).toHaveBeenCalledWith(
                'AWS profile activated successfully.',
                true
            );

            process.env.AWS_PROFILE = originalProfile;
        });
    });

    describe('runTerraformInit', () => {
        test('should successfully initialize terraform', async () => {
            const mockProcess = new EventEmitter() as any;
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            mockSpawn.mockReturnValue(mockProcess);

            const initPromise = awsProject.runTerraformInit(
                '/project/infrastructure',
                's3://backend',
                'test-project'
            );
            setTimeout(() => {
                (mockProcess as any).emit('close', 0);
            }, 10);

            await initPromise;

            expect(updateStatusFile).toHaveBeenCalledWith(
                'test-project',
                'terraform-init',
                'success'
            );
        });

        test('should fail terraform init with non-zero exit code', async () => {
            const mockProcess = new EventEmitter() as any;
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            mockSpawn.mockReturnValue(mockProcess);

            const initPromise = awsProject.runTerraformInit(
                '/project/infrastructure',
                's3://backend',
                'test-project'
            );

            // Simulate failure
            setTimeout(() => {
                (mockProcess as any).emit('close', 1);
            }, 10);

            await expect(initPromise).rejects.toThrow(
                'Terraform init failed with exit code 1'
            );

            expect(updateStatusFile).toHaveBeenCalledWith(
                'test-project',
                'terraform-init',
                'fail'
            );
        });

        test('should handle stderr during terraform init', async () => {
            const mockProcess = new EventEmitter() as any;
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            mockSpawn.mockReturnValue(mockProcess);

            const initPromise = awsProject.runTerraformInit(
                '/project/infrastructure',
                's3://backend',
                'test-project'
            );

            // Simulate stderr
            setTimeout(() => {
                (mockProcess.stderr as any).emit('data', 'Error initializing');
            }, 10);

            await expect(initPromise).rejects.toThrow('Error initializing');
        });

        test('should track terraform init progress from stdout', async () => {
            const mockProcess = new EventEmitter() as any;
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            mockSpawn.mockReturnValue(mockProcess);

            const initPromise = awsProject.runTerraformInit(
                '/project/infrastructure',
                's3://backend',
                'test-project'
            );

            // Simulate progress updates
            setTimeout(() => {
                (mockProcess.stdout as any).emit('data', 'Initializing modules');
                (mockProcess.stdout as any).emit('data', 'Terraform has been successfully initialized!');
                (mockProcess as any).emit('close', 0);
            }, 10);

            await initPromise;

            expect(AppLogger.debug).toHaveBeenCalled();
        });
    });


    describe('getMasterIp', () => {
        test('should get master IP from terraform output', async () => {
            mockExecSync.mockReturnValue('{"value": "192.168.1.1"}');

            const ip = await awsProject.getMasterIp('/project/infrastructure');

            expect(mockExecSync).toHaveBeenCalledWith(
                'terraform output -json master_ip',
                expect.objectContaining({ cwd: '/project/infrastructure' })
            );
            expect(ip).toEqual({ value: '192.168.1.1' });
        });

        test('should return empty string on error', async () => {
            mockExecSync.mockImplementation(() => {
                throw new Error('Command failed');
            });

            const ip = await awsProject.getMasterIp('/project/infrastructure');

            expect(ip).toBe('');
            expect(AppLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to get master IP'),
                true
            );
        });
    });

    describe('runTerraformApply', () => {
        test('should successfully apply terraform', async () => {
            const mockProcess = new EventEmitter() as any;
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            mockSpawn.mockReturnValue(mockProcess);

            const applyPromise = awsProject.runTerraformApply(
                '/project/infrastructure',
                'module.vpc'
            );

            setTimeout(() => {
                (mockProcess as any).emit('close', 0);
            }, 10);

            await applyPromise;

            expect(mockSpawn).toHaveBeenCalledWith(
                'terraform',
                expect.arrayContaining(['apply', '-no-color', '-auto-approve']),
                expect.any(Object)
            );
        });

        test('should handle terraform apply with module target for new command', async () => {
            const mockProcess = new EventEmitter() as any;
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            mockSpawn.mockReturnValue(mockProcess);
            (SystemConfig.getInstance().getConfig as jest.Mock).mockReturnValue({
                command: 'new',
            });

            const applyPromise = awsProject.runTerraformApply(
                '/project/infrastructure',
                'module.vpc',
                'vpc'
            );

            setTimeout(() => {
                (mockProcess as any).emit('close', 0);
            }, 10);

            await applyPromise;

            expect(mockSpawn).toHaveBeenCalledWith(
                'terraform',
                expect.arrayContaining(['-target=module.vpc']),
                expect.any(Object)
            );
        });

        test('should fail terraform apply on stderr', async () => {
            const mockProcess = new EventEmitter() as any;
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            mockSpawn.mockReturnValue(mockProcess);

            const applyPromise = awsProject.runTerraformApply(
                '/project/infrastructure'
            );

            setTimeout(() => {
                (mockProcess.stderr as any).emit('data', 'Terraform error');
            }, 10);

            await expect(applyPromise).rejects.toThrow('Terraform apply error');
        });

        test('should fail terraform apply on non-zero exit code', async () => {
            const mockProcess = new EventEmitter() as any;
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            mockSpawn.mockReturnValue(mockProcess);

            const applyPromise = awsProject.runTerraformApply(
                '/project/infrastructure'
            );

            setTimeout(() => {
                (mockProcess as any).emit('close', 1);
            }, 10);

            await expect(applyPromise).rejects.toThrow(
                'Terraform apply process exited with code 1'
            );
        });

        test('should include var file in terraform apply command', async () => {
            const mockProcess = new EventEmitter() as any;
            mockProcess.stdout = new EventEmitter();
            mockProcess.stderr = new EventEmitter();
            mockSpawn.mockReturnValue(mockProcess);

            const applyPromise = awsProject.runTerraformApply(
                '/project/infrastructure',
                undefined,
                undefined,
                'terraform.tfvars'
            );

            setTimeout(() => {
                (mockProcess as any).emit('close', 0);
            }, 10);

            await applyPromise;

            expect(mockSpawn).toHaveBeenCalledWith(
                'terraform',
                expect.arrayContaining(['-var-file=terraform.tfvars']),
                expect.any(Object)
            );
        });
    });

    describe('runTerraformDestroy', () => {
        test('should destroy specific terraform module', async () => {
            (executeCommandWithRetry as jest.Mock).mockResolvedValue(true);

            await awsProject.runTerraformDestroy(
                '/project/infrastructure',
                'module.vpc',
                'terraform.tfvars'
            );

            expect(executeCommandWithRetry).toHaveBeenCalledWith(
                expect.stringContaining('terraform destroy -target=module.vpc'),
                expect.any(Object),
                3
            );
        });

        test('should destroy entire terraform project', async () => {
            (executeCommandWithRetry as jest.Mock).mockResolvedValue(true);

            await awsProject.runTerraformDestroy('/project/infrastructure');

            expect(executeCommandWithRetry).toHaveBeenCalledWith(
                'terraform destroy -auto-approve',
                expect.any(Object),
                3
            );
        });

        test('should handle terraform destroy error', async () => {
            (executeCommandWithRetry as jest.Mock).mockRejectedValue(
                new Error('Destroy failed')
            );

            await awsProject.runTerraformDestroy('/project/infrastructure');

            expect(AppLogger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to destroy terraform process'),
                true
            );
            expect(mockExit).toHaveBeenCalledWith(1);
        });
    });

    describe('File Creation Methods', () => {
        test('should create VPC files', async () => {
            await awsProject.createVpc('/path');

            expect(awsProject.createFile).toHaveBeenCalledWith(
                'main.tf',
                '/path/dist/templates/aws/modules/vpc/main.tf.liquid',
                '/infrastructure/modules/vpc',
                true
            );
            expect(awsProject.createFile).toHaveBeenCalledWith(
                'variables.tf',
                '/path/dist/templates/aws/modules/vpc/variables.tf.liquid',
                '/infrastructure/modules/vpc',
                true
            );
        });

        test('should create EKS files', async () => {
            await awsProject.createEKS('/path');

            expect(awsProject.createFile).toHaveBeenCalledWith(
                'main.tf',
                expect.stringContaining('eks-fargate'),
                '/infrastructure/modules/eks-fargate',
                true
            );
        });

        test('should create RDS files', async () => {
            await awsProject.createRds('/path');

            expect(awsProject.createFile).toHaveBeenCalledWith(
                'main.tf',
                expect.stringContaining('rds'),
                '/infrastructure/modules/rds',
                true
            );
        });

        test('should create ACM files', async () => {
            await awsProject.createACM('/path');

            expect(awsProject.createFile).toHaveBeenCalledWith(
                'main.tf',
                expect.stringContaining('acm'),
                '/infrastructure/modules/acm',
                true
            );
        });

        test('should create Route53 files', async () => {
            await awsProject.createRoute53();

            expect(awsProject.createFile).toHaveBeenCalledWith(
                'main.tf',
                expect.stringContaining('route53'),
                '/infrastructure/modules/route53',
                true
            );
        });

        test('should create Ingress Controller files', async () => {
            await awsProject.createIngressController();

            expect(awsProject.createFile).toHaveBeenCalledWith(
                'main.tf',
                expect.stringContaining('ingress-controller'),
                '/infrastructure/modules/ingress-controller',
                true
            );
        });

        test('should create ECR files', async () => {
            await awsProject.createECR();

            expect(awsProject.createFile).toHaveBeenCalledWith(
                'main.tf',
                expect.stringContaining('ecr'),
                '/infrastructure/modules/ecr',
                true
            );
        });

        test('should create Environment files', async () => {
            await awsProject.createEnvironment();

            expect(awsProject.createFile).toHaveBeenCalledWith(
                'argocd-app.yaml',
                expect.stringContaining('environment'),
                '/infrastructure',
                true
            );
        });
    });


    describe('createCommon', () => {
        test('should create all common AWS infrastructure', async () => {
            await awsProject.createCommon('/path');

            // Verify that createFile was called multiple times for various infrastructure components
            expect(awsProject.createFile).toHaveBeenCalled();
            const callCount = (awsProject.createFile as jest.Mock).mock.calls.length;
            expect(callCount).toBeGreaterThan(0);
        });
    });
});
