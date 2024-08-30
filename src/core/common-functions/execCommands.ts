import { execSync } from 'child_process';
import { env } from 'process';
import { AppLogger } from '../../logger/appLogger.js';

type StdioOption = 'inherit' | 'pipe' | 'ignore';
type ShellOption = string | undefined; 
interface ExecuteCommandOptions {
    cwd?: string;
    maxRetries?: number;
    stdio?: StdioOption;
    shell?: ShellOption;
    env?:ShellOption;
}

export async function executeCommandWithRetry(
    command: string,
    options: ExecuteCommandOptions = {} 
) {
    const {
        cwd = process.cwd(),
        maxRetries = 3,
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
                console.error(``);
                 AppLogger.info(`Attempt ${attempts} failed: ${error.message}`, true);
            } else {
                console.error();
                AppLogger.info(`Attempt ${attempts} failed with an unknown error`, true);
            }

            if (attempts >= maxRetries) {
                 AppLogger.info('Max retry attempts reached. Aborting.', true);         
            } else {
                 AppLogger.info(`Retrying... (${attempts}/${maxRetries})`, true);
            }
        }
    }
}


