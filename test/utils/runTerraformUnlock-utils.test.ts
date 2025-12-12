// test/utils/runTerraformUnlock-utils.test.ts
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { AppLogger } from '../../src/logger/appLogger.js';
import { executeCommandWithRetry } from '../../src/core/utils/executeCommandWithRetry-utils.js';
import { runTerraformUnlockCommands } from '../../src/core/utils/unlockTerraformState-utils.js';

jest.mock('fs');
jest.mock('child_process');
jest.mock('../../src/core/utils/executeCommandWithRetry-utils.js');
jest.mock('../../src/logger/appLogger.js');

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedExec = execSync as jest.Mock;
const mockedExecuteCommand = executeCommandWithRetry as jest.MockedFunction<typeof executeCommandWithRetry>;
const mockedLogger = AppLogger as jest.Mocked<typeof AppLogger>;

describe('runTerraformUnlockCommands', () => {
    const projectPath = '/fake/project';
    const project_config = { awsProfile: 'default', environment: 'dev' };
    const infrastructurePath = path.join(projectPath, 'infrastructure');
    const terraformStateFile = path.join(infrastructurePath, '.terraform', 'terraform.tfstate');

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('runs unlock commands when terraform state exists and lock ID present', async () => {
        const terraformState = {
            backend: { config: { dynamodb_table: 'table1', region: 'us-east-1' } },
        };

        mockedFs.existsSync.mockImplementation((file) => file === terraformStateFile);
        mockedFs.readFileSync.mockReturnValue(JSON.stringify(terraformState));
        mockedExec.mockReturnValue(Buffer.from('LOCK123'));
        mockedExecuteCommand.mockResolvedValue();

        await runTerraformUnlockCommands(projectPath, project_config);

        expect(mockedExecuteCommand).toHaveBeenCalledTimes(3);
        expect(mockedExec).toHaveBeenCalledTimes(1);
        expect(mockedLogger.error).not.toHaveBeenCalled();
    });

    it('skips force-unlock if lock ID is empty', async () => {
        const terraformState = {
            backend: { config: { dynamodb_table: 'table1', region: 'us-east-1' } },
        };

        mockedFs.existsSync.mockImplementation((file) => file === terraformStateFile);
        mockedFs.readFileSync.mockReturnValue(JSON.stringify(terraformState));
        mockedExec.mockReturnValue(Buffer.from(''));
        mockedExecuteCommand.mockResolvedValue();

        await runTerraformUnlockCommands(projectPath, project_config);

        expect(mockedExecuteCommand).toHaveBeenCalledTimes(2); // Only export + init
        expect(mockedExec).toHaveBeenCalledTimes(1);
    });

    it('throws error if terraform state file does not exist', async () => {
        mockedFs.existsSync.mockReturnValue(false);

        await expect(runTerraformUnlockCommands(projectPath, project_config)).rejects.toThrow(
            /Terraform state file not found/
        );

        expect(mockedLogger.error).toHaveBeenCalled();
        expect(mockedExecuteCommand).not.toHaveBeenCalled();
    });

    it('logs and rethrows errors from executeCommandWithRetry', async () => {
        const terraformState = {
            backend: { config: { dynamodb_table: 'table1', region: 'us-east-1' } },
        };

        mockedFs.existsSync.mockImplementation((file) => file === terraformStateFile);
        mockedFs.readFileSync.mockReturnValue(JSON.stringify(terraformState));
        mockedExec.mockReturnValue(Buffer.from('LOCK123'));
        mockedExecuteCommand.mockRejectedValue(new Error('Some error'));

        await expect(runTerraformUnlockCommands(projectPath, project_config)).rejects.toThrow('Some error');
        expect(mockedLogger.error).toHaveBeenCalled();
    });
});
