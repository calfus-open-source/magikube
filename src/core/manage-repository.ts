import { execSync } from "child_process";
import { AppLogger } from "../logger/appLogger.js";
import { ProgressBar } from "../logger/progressLogger.js";
import { ConfigObject } from "./interface.js";
import { Octokit } from "@octokit/rest";
import SystemConfig from "../config/system.js";
import fs from 'fs-extra';
import sodium from 'libsodium-wrappers'

let encryptedAwsAccessKeyId: string;
let encryptedAwsSecretAccessKey: string;
let encryptedGithubToken: string;
let publicKey: string;
let publicKeyId: string;
export class ManageRepository {
    static async pushCode(configObject: ConfigObject) {
        const {token, userName, orgName, sourceCodeRepo, region, appName, projectName, appType, awsAccessKey, awsSecretKey, getEnvironment} = configObject;
        let repoSetupError: boolean = false;
        const execCommand = (command: string, projectPath: string) => execSync(command, { cwd: projectPath, stdio: 'pipe' });
        const projectPath = `${process.cwd()}/${projectName}/${appName}`;
        const repoName = `${projectName}-${appType}-app`;
        const gitopsRepo = `${projectName}.${getEnvironment}.gitops`;
        // Function to execute command and log it
        const execAndLog = (command: string, description: string): string => {
            try {
                AppLogger.debug(`${command} this Command Executed`);
            const result = execCommand(command, projectPath);
            AppLogger.debug(`${description} Command Executed: ${result.toString()}`);
            return result.toString();
            } catch (error) {
            AppLogger.error(`Error executing command (${description}): ${error}`, true);
            throw error;
            }
        };
        let remoteRepoUrl;
        if (sourceCodeRepo == "codecommit") {
            // Accessing credentials and encoding them
            const dotMagikubePath = `${process.cwd()}/${SystemConfig.getInstance().getConfig().project_name}/.magikube`;
            const credentialsFileContent = fs.readFileSync(dotMagikubePath, 'utf8');
            const credentials = JSON.parse(credentialsFileContent);
            const encodedUserName = encodeURIComponent(credentials?.codecommit_git_username || '');
            const encodedPassword = encodeURIComponent(credentials?.codecommit_git_password || '');
            remoteRepoUrl = `https://${encodedUserName}:${encodedPassword}@git-codecommit.${region}.amazonaws.com/v1/repos/${repoName}`;
        } else if (sourceCodeRepo == "github") {
            remoteRepoUrl = `https://${userName}:${token}@github.com/${orgName}/${repoName}.git`;
        }

        async function fetchPublicKey(token: string, orgName: string, repoName: string): Promise<{ key: string, keyId: string }> {
        const octokit = new Octokit({
            auth: `${token}`,
        });

                const response = await octokit.request('GET /repos/{owner}/{repo}/actions/secrets/public-key', {
                    owner: `${orgName}`,
                    repo: `${repoName}`,
                    headers: {
                    'X-GitHub-Api-Version': '2022-11-28',
                    },
                });

                return {
                    key: response.data.key,
                    keyId: response.data.key_id,
                };
        }
        let fetchkey =  async () => {
            const mytoken = `${token}`;
            const myorgName = `${orgName}`;
            const myrepoName = `${repoName}`;
            const { key, keyId } = await fetchPublicKey(mytoken, myorgName, myrepoName);

            publicKey = key;
            publicKeyId = keyId;
           }
        await fetchkey()
        console.log('Starting encryption process...');
        async function encryptSecret(secret: string, publicKey: string): Promise<string> {
        await sodium.ready; 
        const binkey = sodium.from_base64(publicKey, sodium.base64_variants.ORIGINAL);
        const binsec = sodium.from_string(secret);
        const encBytes = sodium.crypto_box_seal(binsec, binkey);

        return sodium.to_base64(encBytes, sodium.base64_variants.ORIGINAL);
        }
        async function encryptSecrets()   {
            const mytoken = `${token}`;
            const myorgName = `${orgName}`;
            const myrepoName = `${repoName}`;

            const { key: publicKey } = await fetchPublicKey(mytoken, myorgName, myrepoName);
            const awsAccessKeyId = `${awsAccessKey}`;
            const awsSecretAccessKey = `${awsSecretKey}`;
            const githubToken = `${token}`;

             encryptedAwsAccessKeyId = await encryptSecret(awsAccessKeyId, publicKey);
             encryptedAwsSecretAccessKey = await encryptSecret(awsSecretAccessKey, publicKey);
             encryptedGithubToken = await encryptSecret(githubToken, publicKey);

            return {encryptedAwsAccessKeyId,encryptedAwsSecretAccessKey,encryptedGithubToken}
        }

            let data = await encryptSecrets()

            const commands = [
                { cmd: `curl -L -X POST -H "Accept: application/vnd.github+json" -H "Authorization: Bearer ${token}" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${orgName}/${repoName}/actions/variables -d '{"name":"AWS_REGION","value":"${region}"}'`, message: 'Creating environment variables'},
                { cmd: `curl -L -X POST -H "Accept: application/vnd.github+json" -H "Authorization: Bearer ${token}" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${orgName}/${repoName}/actions/variables -d '{"name":"ECR_REPOSITORY","value":"${repoName}"}'`, message: 'Creating environment variables'},
                { cmd: `curl -L -X POST -H "Accept: application/vnd.github+json" -H "Authorization: Bearer ${token}" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${orgName}/${repoName}/actions/variables -d '{"name":"GITOPS_REPO","value":"${gitopsRepo}"}'`, message: 'Creating environment variables'},
                { cmd: `curl -L -X POST -H "Accept: application/vnd.github+json" -H "Authorization: Bearer ${token}" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${orgName}/${repoName}/actions/variables -d '{"name":"USERNAME","value":"${userName}"}'`, message: 'Creating environment variables'},
                { cmd: `curl -L -X PUT -H "Accept: application/vnd.github+json" -H "Authorization: Bearer ${token}" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${orgName}/${repoName}/actions/secrets/AWS_ACCESS_KEY_ID -d '{"encrypted_value":"${data.encryptedAwsAccessKeyId}","key_id":"${publicKeyId}"}'`, message: 'adding aws access key ...' },
                { cmd: `curl -L -X PUT -H "Accept: application/vnd.github+json" -H "Authorization: Bearer ${token}" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${orgName}/${repoName}/actions/secrets/AWS_SECRET_ACCESS_KEY -d '{"encrypted_value":"${data.encryptedAwsSecretAccessKey}","key_id":"${publicKeyId}"}'`, message: 'adding aws access key ...' },
                { cmd: `curl -L -X PUT -H "Accept: application/vnd.github+json" -H "Authorization: Bearer ${token}" -H "X-GitHub-Api-Version: 2022-11-28" https://api.github.com/repos/${orgName}/${repoName}/actions/secrets/REPO_TOKEN -d '{"encrypted_value":"${data.encryptedGithubToken}","key_id":"${publicKeyId}"}'`,
                     message: 'adding aws access key ...' },
                { cmd: 'git init', message: 'Initializing Git repository...' },
                { cmd: 'git add .', message: 'Adding files to Git...' },
                { cmd: 'git commit -m "Initial commit"', message: 'Committing files...' },
                { cmd: 'git branch -M main', message: 'Creating main branch...' },
                { cmd: `git remote add origin ${remoteRepoUrl}`, message: 'Adding remote repository...' },
                { cmd: 'git push -u origin main', message: `${appName} - Setup Completed, Pushing to remote repository...${repoName}` }
            ];
        // Create a new progress bar instance
        const progressBar = ProgressBar.createProgressBar()
        progressBar.start(100, 0, { message: 'Starting Repo Setup...' });
        const progressUpdateValue = 100/commands.length;
        let chunk = progressUpdateValue;
        try {
            // Execute Git commands with progress bar
            commands.forEach((command, index) => {
            progressBar.update(chunk, { message: command.message });
            // console.log("command.cmd",command.cmd)
            // AppLogger.debug(command.cmd)
            // console.log("command.message",command.message)
            // AppLogger.debug(command.message)
            execAndLog(command.cmd, command.message);
            chunk += progressUpdateValue
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