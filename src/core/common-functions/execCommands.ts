import { execSync } from 'child_process';
import { AppLogger } from '../../logger/appLogger.js';

type StdioOption = 'inherit' | 'pipe' | 'ignore';
type ShellOption = string | undefined; 

interface ExecuteCommandOptions {
    cwd?: string;
    stdio?: StdioOption;
    shell?: ShellOption;
    env?: NodeJS.ProcessEnv; 
}

export async function executeCommandWithRetry(
  command: string,
  options: ExecuteCommandOptions = {},
  maxRetries: number
) {
  const { cwd = process.cwd(), stdio = 'inherit', shell = undefined } = options;

  let attempts = 0;
  let success = false;

  while (attempts < maxRetries && !success) {
    try {
      attempts++;
     const res =  execSync(command, { cwd, stdio, shell, env: process.env });
     if(res){
     AppLogger.info(`Executing command  ${command} : ${res.toString()}`);
     }
     success = true;
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'message' in error) {
        const errorMessage = (error as Error).message;
        const errorStderr =
          'stderr' in error && error.stderr
            ? (error.stderr as Buffer).toString()
            : 'No stderr output';

        AppLogger.info(`Attempt ${attempts} failed: ${errorMessage}`, true);
        AppLogger.info(`Error details: ${errorStderr}`, true);
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
