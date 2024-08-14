import { execSync } from "child_process";
import { AppLogger } from "../logger/appLogger.js";
import { ProgressBar } from "../logger/progressLogger.js";
import { ConfigObject } from "./interface.js";
import SystemConfig from "../config/system.js";
import fs from 'fs-extra';

export class ManageRepository {
    static async pushCode(configObject: ConfigObject) {
        const {token, userName, orgName, sourceCodeRepo, region, appName, projectName, appType} = configObject;
        let repoSetupError: boolean = false;
        const execCommand = (command: string, projectPath: string) => execSync(command, { cwd: projectPath, stdio: 'pipe' });
        const projectPath = `${process.cwd()}/${projectName}/${appName}`;
        const repoName = `${projectName}-${appType}-app`;
        // Function to execute command and log it
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