import { execSync } from 'child_process';

type StdioOption = 'inherit' | 'pipe' | 'ignore';
type ShellOption = string | undefined; 
interface ExecuteCommandOptions {
    cwd?: string;
    maxRetries?: number;
    stdio?: StdioOption;
    shell?: ShellOption;
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
            execSync(command, { cwd, stdio, shell });
            success = true; 
        } catch (error) {
            if (error instanceof Error) {
                console.error(`Attempt ${attempts} failed: ${error.message}`);
            } else {
                console.error(`Attempt ${attempts} failed with an unknown error`);
            }

            if (attempts >= maxRetries) {
                console.error('Max retry attempts reached. Aborting.');
                throw new Error(`Failed to run '${command}' after ${maxRetries} attempts.`);
            } else {
                console.log(`Retrying... (${attempts}/${maxRetries})`);
            }
        }
    }
}



