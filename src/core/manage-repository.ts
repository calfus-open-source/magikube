import { execSync } from "child_process";
import { AppLogger } from "../logger/appLogger.js";
import { ProgressBar } from "../logger/progressLogger.js";
import { ConfigObject } from "./interface.js";

export class ManageRepository {
    static async pushCode(configObject: ConfigObject) {
        const {token, userName, orgName, sourceCodeRepo, region, appName, projectName, appType} = configObject;
        let repoSetupError: boolean = false;
        const execCommand = (command: string, projectPath: string) => execSync(command, { cwd: projectPath, stdio: 'pipe' });
        const projectPath = `${process.cwd()}/${projectName}/${appName}`;
        const repoName = `${projectName}-${appType}-app`;
        // let repoName;
        // if(appType == 'node-express') {
        //     repoName = 'my-app-backend';
        // } else {
        //     repoName = 'my-app-ui';
        // }
        const execAndLog = (command: string, description: string): string => {
            try {
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
            // const accessKeyId = configObject?.awsAccessKey;
            // const secretKeyId = configObject?.awsSecretKey;
            const userName: string = '';
            const password: string = '';
            const encodedUserName = encodeURIComponent(userName || '');
            const encodedPassword = encodeURIComponent(password || '');
            // remoteRepoUrl = `https://git-codecommit.${region}.amazonaws.com/v1/repos/${repoName}`;
            // remoteRepoUrl = `https://${accessKeyId}:${secretKeyId}@git-codecommit.${region}.amazonaws.com/v1/repos/${repoName}`;
            remoteRepoUrl = `https://${encodedUserName}:${encodedPassword}@git-codecommit.${region}.amazonaws.com/v1/repos/${repoName}`;
        } else if (sourceCodeRepo == "github") {
            remoteRepoUrl = `https://${userName}:${token}@github.com/${orgName}/${repoName}.git`;
            // remoteRepoUrl = `https://github.com/${orgName}/${appName}.git`;
        }

        // Define commands and messages
        const commands = [
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