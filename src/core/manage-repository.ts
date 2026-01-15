import { AppLogger } from '../logger/appLogger.js';
import { ProgressBar } from '../logger/progressLogger.js';
import { ConfigObject } from './interface.js';
import axios from 'axios';
import SystemConfig from '../config/system.js';
import fs from 'fs-extra';
import sodium from 'libsodium-wrappers';
import { executeCommandWithRetry } from './utils/executeCommandWithRetry-utils.js';

let encryptedAwsAccessKeyId: string;
let encryptedAwsSecretAccessKey: string;
let encryptedGithubToken: string;
let publicKey: string;
let publicKeyId: string;
export class ManageRepository {
  static async pushCode(configObject: ConfigObject) {
    const {
      token,
      userName,
      orgName,
      sourceCodeRepo,
      region,
      appName,
      projectName,
      appType,
      awsAccessKey,
      awsSecretKey,
      environment,
    } = configObject;
    const projectConfig = SystemConfig.getInstance().getConfig();
    let repoSetupError: boolean = false;
    const execCommand = (command: string, projectPath: string) =>
      executeCommandWithRetry(command, { cwd: projectPath, stdio: 'pipe' }, 1);
    const gitopsRepo = `${projectName}-${environment}-gitops`;
    let projectPath;
    let repoName: string;
    if (projectConfig.command === 'create') {
      projectPath =
        appType === 'gitops'
          ? `${process.cwd()}/${appType}`
          : `${process.cwd()}/${projectConfig.service_name}`;
    } else {
      projectPath =
        appType === 'gitops'
          ? `${process.cwd()}/${projectName}/${appType}`
          : `${process.cwd()}/${projectName}/${appName}`;
    }
    if (projectConfig.command === 'create') {
      repoName =
        appType === 'gitops'
          ? `${projectName}-${appName}-gitops`
          : `${projectName}-${projectConfig.service_name}-app`;
    } else {
      repoName =
        appType === 'gitops'
          ? `${projectName}-${appName}-gitops`
          : `${projectName}-${appType}-app`;
    }

    const execAndLog = (command: string, description: string): string => {
      try {
        AppLogger.debug(`${command} this Command Executed`);
        const result = execCommand(command, projectPath);
        AppLogger.debug(
          `${description} Command Executed: ${result.toString()}`,
        );
        return result.toString();
      } catch (error) {
        AppLogger.error(
          `Error executing command (${description}): ${error}`,
          true,
        );
        throw error;
      }
    };

    let remoteRepoUrl;
    if (sourceCodeRepo == 'github') {
      remoteRepoUrl = `https://${userName}:${token}@github.com/${orgName}/${repoName}.git`;
    }

    async function fetchPublicKey(
      token: string,
      orgName: string,
      repoName: string,
    ): Promise<{ key: string; keyId: string }> {
      try {
        const response = await axios.get(
          `https://api.github.com/repos/${orgName}/${repoName}/actions/secrets/public-key`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'X-GitHub-Api-Version': '2022-11-28',
              Accept: 'application/vnd.github.v3+json',
            },
            timeout: 10000,
          },
        );
        return {
          key: response.data.key,
          keyId: response.data.key_id,
        };
      } catch (error) {
        AppLogger.error(`Error fetching public key:${error}`, true);
        throw error; // Re-throw the error after logging it
      }
    }

    const fetchkey = async () => {
      const mytoken = `${token}`;
      const myorgName = `${orgName}`;
      const myrepoName = `${repoName}`;
      // const { key, keyId } = await fetchPublicKey(mytoken, myorgName, myrepoName);
      async function fetchPublicKeyWithRetry(
        mytoken: string,
        myorgName: string,
        myrepoName: string,
        maxRetries: number = 3,
      ): Promise<{ key: string; keyId: string }> {
        let attempts = 0;
        let result = { key: '', keyId: '' };

        while (attempts < maxRetries) {
          try {
            attempts++;
            result = await fetchPublicKey(mytoken, myorgName, myrepoName);
            return result;
          } catch (error) {
            if (attempts >= maxRetries) {
              AppLogger.error(
                'Max retry attempts reached for fetching public key and keyId',
                true,
              );
              throw error;
            } else {
              AppLogger.error(
                `Attempt ${attempts} failed to fetch public key and keyId. Retrying...`,
                true,
              );
            }
          }
        }

        return result;
      }

      try {
        const { key, keyId } = await fetchPublicKeyWithRetry(
          mytoken,
          myorgName,
          myrepoName,
        );
        publicKey = key;
        publicKeyId = keyId;
      } catch (error) {
        AppLogger.error(`Failed to fetch public key and keyId ${error}`, true);
      }
    };

    await fetchkey();
    AppLogger.info('Starting encryption process...', true);
    async function encryptSecret(
      secret: string,
      publicKey: string,
    ): Promise<string> {
      await sodium.ready;
      const binkey = sodium.from_base64(
        publicKey,
        sodium.base64_variants.ORIGINAL,
      );
      const binsec = sodium.from_string(secret);
      const encBytes = sodium.crypto_box_seal(binsec, binkey);

      return sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);
    }

    async function encryptSecrets() {
      const mytoken = `${token}`;
      const myorgName = `${orgName}`;
      const myrepoName = `${repoName}`;

      const { key: publicKey } = await fetchPublicKey(
        mytoken,
        myorgName,
        myrepoName,
      );

      const awsAccessKeyId = `${awsAccessKey}`;
      const awsSecretAccessKey = `${awsSecretKey}`;
      const githubToken = `${token}`;

      encryptedAwsAccessKeyId = await encryptSecret(awsAccessKeyId, publicKey);
      encryptedAwsSecretAccessKey = await encryptSecret(
        awsSecretAccessKey,
        publicKey,
      );
      encryptedGithubToken = await encryptSecret(githubToken, publicKey);

      return {
        encryptedAwsAccessKeyId,
        encryptedAwsSecretAccessKey,
        encryptedGithubToken,
      };
    }

    const data = await encryptSecrets();

    const commands = [
      {
        cmd: `curl -L -X POST -H "Accept: application/vnd.github+json" -H "Authorization: Bearer ${token}" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${orgName}/${repoName}/actions/variables -d '{"name":"AWS_REGION","value":"${region}"}'`,
        message: 'Creating environment variables',
      },
      {
        cmd: `curl -L -X POST -H "Accept: application/vnd.github+json" -H "Authorization: Bearer ${token}" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${orgName}/${repoName}/actions/variables -d '{"name":"ECR_REPOSITORY","value":"${repoName}"}'`,
        message: 'Creating environment variables',
      },
      {
        cmd: `curl -L -X POST -H "Accept: application/vnd.github+json" -H "Authorization: Bearer ${token}" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${orgName}/${repoName}/actions/variables -d '{"name":"GITOPS_REPO","value":"${gitopsRepo}"}'`,
        message: 'Creating environment variables',
      },
      {
        cmd: `curl -L -X POST -H "Accept: application/vnd.github+json" -H "Authorization: Bearer ${token}" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${orgName}/${repoName}/actions/variables -d '{"name":"USERNAME","value":"${orgName}"}'`,
        message: 'Creating environment variables',
      },
      {
        cmd: `curl -L -X PUT -H "Accept: application/vnd.github+json" -H "Authorization: Bearer ${token}" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${orgName}/${repoName}/actions/secrets/AWS_ACCESS_KEY_ID -d '{"encrypted_value":"${data.encryptedAwsAccessKeyId}","key_id":"${publicKeyId}"}'`,
        message: 'adding aws access key ...',
      },
      {
        cmd: `curl -L -X PUT -H "Accept: application/vnd.github+json" -H "Authorization: Bearer ${token}" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${orgName}/${repoName}/actions/secrets/AWS_SECRET_ACCESS_KEY -d '{"encrypted_value":"${data.encryptedAwsSecretAccessKey}","key_id":"${publicKeyId}"}'`,
        message: 'adding aws access key ...',
      },
      {
        cmd: `curl -L -X PUT -H "Accept: application/vnd.github+json" -H "Authorization: Bearer ${token}" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${orgName}/${repoName}/actions/secrets/REPO_TOKEN -d '{"encrypted_value":"${data.encryptedGithubToken}","key_id":"${publicKeyId}"}'`,
        message: 'adding aws access key ...',
      },
      { cmd: 'git init', message: 'Initializing Git repository...' },
      { cmd: 'git add .', message: 'Adding files to Git...' },
      { cmd: 'git commit -m "Initial commit"', message: 'Committing files...' },
      { cmd: 'git branch -M main', message: 'Creating main branch...' },
      {
        cmd: `git remote add origin ${remoteRepoUrl}`,
        message: 'Adding remote repository...',
      },
      {
        cmd: 'git push -u origin main',
        message: `${appName} - Setup Completed, Pushing to remote repository...${repoName}`,
      },
    ];

    // Create a new progress bar instance
    const progressBar = ProgressBar.createProgressBar();
    progressBar.start(100, 0, { message: 'Starting Repo Setup...' });
    const progressUpdateValue = 100 / commands.length;
    let chunk = progressUpdateValue;
    try {
      // Execute Git commands with progress bar
      commands.forEach((command, index) => {
        progressBar.update(chunk, { message: command.message });
        execAndLog(command.cmd, command.message);
        chunk += progressUpdateValue;
      });
      progressBar.stop();
      return repoSetupError;
    } catch (error) {
      AppLogger.error(`Error during Git repository setup: ${error}`, true);
      repoSetupError = true;
      return repoSetupError;
    }
  }
}
