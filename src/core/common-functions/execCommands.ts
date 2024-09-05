import { execSync } from 'child_process';
import { env } from 'process';
import { AppLogger } from '../../logger/appLogger.js';

type StdioOption = 'inherit' | 'pipe' | 'ignore';
type ShellOption = string | undefined; 
interface ExecuteCommandOptions {
    cwd?: string;
    stdio?: StdioOption;
    shell?: ShellOption;
    env?:ShellOption;
}

export async function executeCommandWithRetry(
    command: string,
    options: ExecuteCommandOptions = {},
    maxRetries: number
) {
    const {
        cwd = process.cwd(),
        stdio = 'inherit',
        shell = undefined
    } = options;

    let attempts = 0;
    let success = false;

    while (attempts < maxRetries && !success) {
        try {
            attempts++;
            execSync(command, { cwd, stdio, shell, env });
            success = true; 
        } catch (error) {
            if (error instanceof Error) {
                AppLogger.info(`Attempt ${attempts} failed: ${error.message}`, true);
            } else {
                AppLogger.info(`Attempt ${attempts} failed with an unknown error`, true);
            }

            if (attempts >= maxRetries) {
                AppLogger.info('Max retry attempts reached. Aborting.', true);
                throw error;
            } else {
                AppLogger.info(`Retrying... (${attempts}/${maxRetries})`, true);
            }
        }
    }
}

