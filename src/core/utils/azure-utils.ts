import { AppLogger } from '../../logger/appLogger.js';
import { execSync, execFileSync, spawn } from 'child_process';
import { AzureSubscriptionInfo, AzureAccountInfo } from '../interface.js';

/**
 * Custom error class for Azure CLI command failures.
 * Provides structured error information including command, exit code, and output.
 */
export class AzureCommandError extends Error {
  constructor(
    public command: string,
    public exitCode: number | null,
    public stderr: string,
    public stdout: string,
    public timedOut: boolean = false,
  ) {
    super(
      timedOut
        ? `Azure CLI command timed out: ${command}`
        : `Azure CLI command failed with exit code ${exitCode}: ${command}`,
    );
    this.name = 'AzureCommandError';
  }
}

export function checkAzureLogin(): boolean {
  try {
    execSync('az account show', { stdio: 'pipe' });
    return true;
  } catch (_error) {
    return false;
  }
}

export function displayCurrentAccount(): void {
  try {
    const accountInfo = execSync(
      'az account show --query "{Name:name, SubscriptionId:id, TenantId:tenantId}" --output table',
      { encoding: 'utf8' },
    );
    AppLogger.info('Currently logged in account details:', true);
    AppLogger.info(accountInfo, true);
  } catch (_error) {
    AppLogger.error('Failed to get current account details', true);
  }
}

export function getCurrentSubscriptionId(): string | null {
  try {
    const subscriptionId = execSync(
      'az account show --query "id" --output tsv',
      { encoding: 'utf8' },
    ).trim();
    return subscriptionId;
  } catch (_error) {
    AppLogger.error('Failed to get current subscription ID', true);
    return null;
  }
}

export function getCurrentTenantId(): string | null {
  try {
    const tenantId = execSync(
      'az account show --query "tenantId" --output tsv',
      { encoding: 'utf8' },
    ).trim();
    return tenantId;
  } catch (_error) {
    AppLogger.error('Failed to get current tenant ID', true);
    return null;
  }
}

export async function listSubscriptions(): Promise<AzureSubscriptionInfo[]> {
  try {
    const subscriptionsJson = execSync(
      'az account list --query "[].{Name:name, SubscriptionId:id, TenantId:tenantId, State:state}" --output json',
      { encoding: 'utf8' },
    );
    return JSON.parse(subscriptionsJson);
  } catch (error) {
    AppLogger.error(`Error listing subscriptions: ${error}`, true);
    return [];
  }
}

export function getAccountInfo(): AzureAccountInfo | null {
  try {
    const accountJson = execSync('az account show --output json', {
      encoding: 'utf8',
    });
    return JSON.parse(accountJson);
  } catch (_error) {
    AppLogger.error('Failed to get account information', true);
    return null;
  }
}

export async function loginWithServicePrincipal(
  clientId: string,
  clientSecret: string,
  tenantId: string,
): Promise<boolean> {
  try {
    AppLogger.info('Logging in with service principal...', true);

    // Use environment variable for secret to avoid shell exposure
    const loginCommand = `az login --service-principal --username "${clientId}" --password "$AZURE_SP_SECRET" --tenant "${tenantId}"`;
    
    await azExecAsync(loginCommand, {
      env: { ...process.env, AZURE_SP_SECRET: clientSecret },
      timeout: 120000, // 2 minutes timeout for login
      stdio: 'pipe',
    });

    AppLogger.info('Successfully logged in with service principal', true);
    return true;
  } catch (error) {
    // Redact secret from error messages
    const sanitizedError = String(error).replace(
      new RegExp(clientSecret, 'g'),
      '[REDACTED]',
    );
    AppLogger.error(
      `Failed to login with service principal: ${sanitizedError}`,
      true,
    );
    return false;
  }
}

export async function logout(): Promise<boolean> {
  try {
    AppLogger.info('Logging out of Azure CLI...', true);

    execSync('az logout', { encoding: 'utf8' });

    AppLogger.info('Successfully logged out of Azure CLI', true);
    return true;
  } catch (error) {
    AppLogger.error(`Failed to logout: ${error}`, true);
    return false;
  }
}

/**
 * Execute Azure CLI command asynchronously with timeout support.
 * 
 * @param command - Full Azure CLI command string (e.g., "az group create --name mygroup --location eastus")
 * @param options - Execution options
 * @param options.timeout - Timeout in milliseconds (default: 300000 = 5 minutes)
 * @param options.env - Environment variables to pass to the command
 * @param options.stdio - How to handle stdio ('pipe' returns output, 'inherit' streams to console)
 * @param options.signal - AbortSignal for cancellation support
 * @returns Promise resolving to stdout string (empty if stdio='inherit')
 * @throws AzureCommandError if command fails, times out, or is cancelled
 * 
 * @example
 * // With output capture (default)
 * const output = await azExecAsync('az account show --output json');
 * 
 * // With streaming output for long operations
 * await azExecAsync('az group delete --name mygroup --yes', { 
 *   stdio: 'inherit',
 *   timeout: 300000 // 5 minutes
 * });
 * 
 * // With custom environment and timeout
 * await azExecAsync('az login --service-principal --username $CLIENT_ID --password $SECRET', {
 *   env: { ...process.env, CLIENT_ID: id, SECRET: secret },
 *   timeout: 120000 // 2 minutes
 * });
 */
export async function azExecAsync(
  command: string,
  options: {
    timeout?: number;
    env?: NodeJS.ProcessEnv;
    stdio?: 'pipe' | 'inherit';
    signal?: AbortSignal;
  } = {},
): Promise<string> {
  const {
    timeout = 300000, // Default 5 minutes for Azure operations
    env = process.env,
    stdio = 'pipe',
    signal,
  } = options;

  return new Promise((resolve, reject) => {
    // Parse command into executable and args
    const args = command.split(/\s+/).slice(1); // Remove 'az' from command
    
    const child = spawn('az', args, {
      env,
      stdio: stdio === 'inherit' ? 'inherit' : ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let timeoutHandle: NodeJS.Timeout | null = null;

    // Set up timeout
    if (timeout > 0) {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        // Force kill after 5 seconds if graceful termination fails
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 5000);
      }, timeout);
    }

    // Set up cancellation via AbortSignal
    if (signal) {
      signal.addEventListener('abort', () => {
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 5000);
      });
    }

    // Collect output if stdio is 'pipe'
    if (stdio === 'pipe') {
      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('error', (error) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      reject(
        new AzureCommandError(command, null, error.message, stdout, timedOut),
      );
    });

    child.on('close', (code) => {
      if (timeoutHandle) clearTimeout(timeoutHandle);

      if (timedOut) {
        reject(
          new AzureCommandError(
            command,
            code,
            stderr || 'Command timed out',
            stdout,
            true,
          ),
        );
      } else if (signal?.aborted) {
        reject(
          new AzureCommandError(
            command,
            code,
            stderr || 'Command was cancelled',
            stdout,
            false,
          ),
        );
      } else if (code === 0) {
        resolve(stdio === 'inherit' ? '' : stdout.trim());
      } else {
        reject(new AzureCommandError(command, code, stderr, stdout, false));
      }
    });
  });
}
