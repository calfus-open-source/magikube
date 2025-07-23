import { AppLogger } from "../logger/appLogger.js";
import { ProgressBar } from "../logger/progressLogger.js";
import { FullConfigObject } from "./interface.js";
import axios from "axios";
import SystemConfig from "../config/system.js";
import fs from "fs-extra";
import sodium from "libsodium-wrappers";
import { executeCommandWithRetry } from "./utils/executeCommandWithRetry-utils.js";

let publicKey: string;
let publicKeyId: string;

export class ManageRepository {
  static async pushCode(configObject: FullConfigObject) {
    const {
      token,
      userName,
      orgName,
      sourceCodeRepo,
      projectName,
      environment,
      appName,
      appType,
    } = configObject.common;

    const projectConfig = SystemConfig.getInstance().getConfig();
    const {
      aws_region,
      cloud_provider,
      aws_access_key_id,
      aws_secret_access_key,
      azure_tenant_id,
      azure_subscription_id,
      azure_client_id,
      azure_client_secret,
    } = projectConfig;

    let repoSetupError = false;

    const execCommand = (command: string, projectPath: string) =>
      executeCommandWithRetry(command, { cwd: projectPath, stdio: "pipe" }, 1);

    const gitopsRepo = `${projectName}-${environment}-gitops`;

    let projectPath =
      projectConfig.command === "create"
        ? appType === "gitops"
          ? `${process.cwd()}/${appType}`
          : `${process.cwd()}/${projectConfig.service_name}`
        : appType === "gitops"
        ? `${process.cwd()}/${projectName}/${appType}`
        : `${process.cwd()}/${projectName}/${appName}`;

    let repoName =
      projectConfig.command === "create"
        ? appType === "gitops"
          ? `${projectName}-${appName}-gitops`
          : `${projectName}-${projectConfig.service_name}-app`
        : appType === "gitops"
        ? `${projectName}-${appName}-gitops`
        : `${projectName}-${appType}-app`;

    const execAndLog = (command: string, description: string): string => {
      try {
        AppLogger.debug(`${command} this Command Executed`);
        const result = execCommand(command, projectPath);
        AppLogger.debug(
          `${description} Command Executed: ${result.toString()}`
        );
        return result.toString();
      } catch (error) {
        AppLogger.error(
          `Error executing command (${description}): ${error}`,
          true
        );
        throw error;
      }
    };

    const remoteRepoUrl =
      sourceCodeRepo === "github"
        ? `https://${userName}:${token}@github.com/${orgName}/${repoName}.git`
        : "";

    async function fetchPublicKey(token: string, org: string, repo: string) {
      const response = await axios.get(
        `https://api.github.com/repos/${org}/${repo}/actions/secrets/public-key`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }
      );
      return {
        key: response.data.key,
        keyId: response.data.key_id,
      };
    }

    async function fetchPublicKeyWithRetry(
      token: string,
      org: string,
      repo: string,
      retries = 3
    ): Promise<{ key: string; keyId: string }> {
      for (let i = 0; i < retries; i++) {
        try {
          return await fetchPublicKey(token, org, repo);
        } catch (err) {
          AppLogger.error(
            `Retrying public key fetch... Attempt ${i + 1}`,
            true
          );
          if (i === retries - 1) {
            AppLogger.error("Max retries reached for public key fetch", true);
          }
        }
      }

      // Ensures function always returns or throws — this satisfies TypeScript
      throw new Error("Failed to fetch GitHub public key after retries");
    }
    

    async function encryptSecret(
      secret: string,
      publicKey: string
    ): Promise<string> {
      await sodium.ready;
      const binkey = sodium.from_base64(
        publicKey,
        sodium.base64_variants.ORIGINAL
      );
      const binsec = sodium.from_string(secret);
      const encBytes = sodium.crypto_box_seal(binsec, binkey);
      return sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);
    }

    const { key, keyId } = await fetchPublicKeyWithRetry(
      token,
      orgName,
      repoName
    );
    publicKey = key;
    publicKeyId = keyId;

    AppLogger.info("Starting encryption process...", true);

    const encryptedSecrets: Record<string, string> = {};

    if (cloud_provider === "aws") {
      encryptedSecrets["AWS_ACCESS_KEY_ID"] = await encryptSecret(
        aws_access_key_id,
        publicKey
      );
      encryptedSecrets["AWS_SECRET_ACCESS_KEY"] = await encryptSecret(
        aws_secret_access_key,
        publicKey
      );
    } else if (cloud_provider === "azure") {
      encryptedSecrets["AZURE_TENANT_ID"] = await encryptSecret(
        azure_tenant_id,
        publicKey
      );
      encryptedSecrets["AZURE_SUBSCRIPTION_ID"] = await encryptSecret(
        azure_subscription_id,
        publicKey
      );
      encryptedSecrets["AZURE_CLIENT_ID"] = await encryptSecret(
        azure_client_id,
        publicKey
      );
      encryptedSecrets["AZURE_CLIENT_SECRET"] = await encryptSecret(
        azure_client_secret,
        publicKey
      );
    }

    encryptedSecrets["REPO_TOKEN"] = await encryptSecret(token, publicKey);

    // Create curl commands for secrets
    const cloudSecretsCmds = Object.entries(encryptedSecrets).map(
      ([key, value]) => ({
        cmd: `curl -L -X PUT -H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${orgName}/${repoName}/actions/secrets/${key} -d '{"encrypted_value":"${value}","key_id":"${publicKeyId}"}'`,
        message: `Setting secret: ${key}`,
      })
    );

    // Common GitHub environment variable setup
    const envVariablesCmds = [
      {
        cmd: `curl -L -X POST -H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${orgName}/${repoName}/actions/variables -d '{"name":"AWS_REGION","value":"${aws_region}"}'`,
        message: "Creating AWS_REGION variable",
      },
      {
        cmd: `curl -L -X POST -H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${orgName}/${repoName}/actions/variables -d '{"name":"ECR_REPOSITORY","value":"${repoName}"}'`,
        message: "Creating ECR_REPOSITORY variable",
      },
      {
        cmd: `curl -L -X POST -H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${orgName}/${repoName}/actions/variables -d '{"name":"GITOPS_REPO","value":"${gitopsRepo}"}'`,
        message: "Creating GITOPS_REPO variable",
      },
      {
        cmd: `curl -L -X POST -H "Authorization: Bearer ${token}" -H "Accept: application/vnd.github+json" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${orgName}/${repoName}/actions/variables -d '{"name":"USERNAME","value":"${orgName}"}'`,
        message: "Creating USERNAME variable",
      },
    ];

    const gitCommands = [
      { cmd: "git init", message: "Initializing Git repository..." },
      { cmd: "git add .", message: "Adding files to Git..." },
      { cmd: 'git commit -m "Initial commit"', message: "Committing files..." },
      { cmd: "git branch -M main", message: "Creating main branch..." },
      {
        cmd: `git remote add origin ${remoteRepoUrl}`,
        message: "Adding remote repository...",
      },
      {
        cmd: "git push -u origin main",
        message: `${appName} - Setup Completed, Pushing to remote repository...`,
      },
    ];

    const allCommands = [
      ...cloudSecretsCmds,
      ...envVariablesCmds,
      ...gitCommands,
    ];

    const progressBar = ProgressBar.createProgressBar();
    const progressStep = 100 / allCommands.length;
    let currentProgress = 0;

    progressBar.start(100, 0, { message: "Starting Repository Setup..." });

    try {
      for (const { cmd, message } of allCommands) {
        progressBar.update(currentProgress, { message });
        execAndLog(cmd, message);
        currentProgress += progressStep;
      }
      progressBar.update(100, { message: "Repository setup completed." });
      progressBar.stop();
    } catch (error) {
      AppLogger.error(`Error during Git repository setup: ${error}`, true);
      progressBar.stop();
      repoSetupError = true;
    }

    return repoSetupError;
  }
}

