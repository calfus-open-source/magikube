import { execSync } from "child_process";
import { AppLogger } from "../logger/appLogger.js";
import { ProgressBar } from "../logger/progressLogger.js";
import BaseProject from "./base-project.js";
import fs from 'fs-extra';
import SystemConfig from "../config/system.js";

export default class CreateApplication extends BaseProject {
    async createNodeExpressApp(projectConfig: any) {
        let appName;
        let repoSetupError: boolean = false;
        let appSetupError: boolean = false;
        try {
            const { node_app_name: appName, github_access_token: token, git_user_name: userName, github_owner: orgName, project_name: projectName } = projectConfig;
            await this.createFile('app.ts', '../magikube-templates/express/app.ts.liquid', `./${projectName}/${appName}/src`);
            const dotFiles = ['gitignore', 'eslintrc.json'];
            for (const file of dotFiles){
                await this.createFile(`.${file}`, `../magikube-templates/express/${file}.liquid`, `./${projectName}/${appName}`)
            }
            const files = ['package.json', 'tsconfig.json', 'Dockerfile', 'buildspec.yml', 'deployment.yml'];
            for (const file of files) {
                await this.createFile(file, `../magikube-templates/express/${file}.liquid`, `./${projectName}/${appName}`);
            }
            execSync('npm install', {
                cwd: `${process.cwd()}/${projectName}/${appName}`,
                stdio: 'inherit'
            });
            repoSetupError = await this.setupRepo(appName, userName, token, orgName, projectName);
            AppLogger.info('Node Express app created successfully.');
        } catch (error) {
            AppLogger.error(`Failed to create Node Express app: ${error}`, true);
            appSetupError = true;
            if (!repoSetupError && appSetupError) {
                AppLogger.error(`Error occured, cleaning up the ${appName} directory...`, true);
                fs.rmdirSync(`./${projectConfig.project_name}/${appName}`, { recursive: true });
            }
        }
        return appSetupError;
    }
    
    //create Next.js application
    async createNextApp(projectConfig: any) {
        let appSetupError: boolean = false;
        let appName;
        let repoSetupError: boolean = false;
        try {
            const { next_app_name: appName, github_access_token: token, git_user_name: userName, github_owner: orgName, project_name: projectName } = projectConfig;
            const commonFiles = ['buildspec.yml', 'Dockerfile', 'nginx.conf', 'next.config.mjs', 'package.json', 'tsconfig.json', 'deployment.yml'];
            const appRouterFiles = ['page.tsx', 'layout.tsx', 'global.css'];
            const dotFiles = ['gitignore', 'eslintrc.json']
            const files = [...commonFiles, ...appRouterFiles];
            for (const file of files) {
            const path = appRouterFiles.includes(file) ? `./${projectName}/${appName}/app` : `./${projectName}/${appName}`;
                await this.createFile(file, `../magikube-templates/next/${file}.liquid`, path);
            }
            for (const file of dotFiles) {
                await this.createFile(`.${file}`, `../magikube-templates/next/${file}.liquid`, `./${projectName}/${appName}`);
            }
            execSync(`npm i`, {
                cwd: `${process.cwd()}/${projectName}/${appName}`,
                stdio: 'inherit'
            });
            repoSetupError = await this.setupRepo(appName, userName, token, orgName, projectName);
            AppLogger.info('Next.js application created successfully.', true);
        } catch (error) {
            AppLogger.error(`Failed to create Next.js app: ${error}`);
            appSetupError = true;
            if (!repoSetupError && appSetupError) {
                AppLogger.debug('Deleting created files and folders...');
                fs.rmdirSync(`./${projectConfig.project_name}/${appName}`, { recursive: true });
            }
        } 
    }

    // create React application
    async createReactApp(projectConfig: any){
        let appName;
        let repoSetupError: boolean = false;
        let appSetupError: boolean = false;
        try {
            const {
                react_app_name: appName,
                github_access_token: token,
                git_user_name: userName,
                github_owner: orgName,
                project_name: projectName
            } = projectConfig;
            await this.createFile('index.html', '../magikube-templates/react/index.html.liquid', `./${projectName}/${appName}/public`);
            const reactAppFile = ['App.tsx', 'index.tsx', 'app.css']
            for (const file of reactAppFile) {
                await this.createFile(file, `../magikube-templates/react/${file}.liquid`, `./${projectName}/${appName}/src`);
            }
            const reactCommonFiles = ['package.json', 'tsconfig.json', 'Dockerfile', 'nginx.conf'];
            for (const file of reactCommonFiles) {
                await this.createFile(file, `../magikube-templates/react/${file}.liquid`, `./${projectName}/${appName}`);
            }
            const dotFiles = ['gitignore', 'eslintrc.json']
            for (const file of dotFiles) {
                await this.createFile(`.${file}`, `../magikube-templates/react/${file}.liquid`, `./${projectName}/${appName}`);
            }
            execSync('npm install', {
                cwd: `${process.cwd()}/${projectName}/${appName}`,
                stdio: 'inherit'
            });
            repoSetupError = await this.setupRepo(appName, userName, token, orgName, projectName);
            AppLogger.info('React app created successfully.', true);
        } catch (error) {
            AppLogger.error(`Failed to create React app:${error}`, true);
            appSetupError = true;
            if (!repoSetupError && appSetupError) {
                AppLogger.info(`Error occured, cleaning up the ${appName} directory...`, true);
                fs.rmdirSync(`./${projectConfig.project_name}/${appName}`, { recursive: true });
            }
        }
    }
    
    async setupRepo(appName: string, userName: string, token: string, orgName: string, projectName: string) {
        let repoSetupError: boolean = false;
            const execCommand = (command: string, projectPath: string) => execSync(command, { cwd: projectPath, stdio: 'pipe' });
            const projectPath = `${process.cwd()}/${projectName}/${appName}`;
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
        // Define commands and messages
        const commands = [
            { cmd: 'git init', message: 'Initializing Git repository...' },
            { cmd: 'git add .', message: 'Adding files to Git...' },
            { cmd: 'git commit -m "Initial commit"', message: 'Committing files...' },
            { cmd: 'git branch -M main', message: 'Creating main branch...' },
            { 
            cmd: orgName ? `git remote add origin https://github.com/${orgName}/${appName}.git` : `git remote add origin https://github.com/${userName}/${appName}.git`, 
            message: 'Adding remote repository...'
            },
            { cmd: 'git push -u origin main', message: `${appName} - Setup Completed, Pushing to remote repository...` }
        ];
        // Create a new progress bar instance
        const progressBar = ProgressBar.createProgressBar()
        progressBar.start(100, 0, { message: 'Starting Repo Setup...' });
        const progressUpdateValue = 100/commands.length;
        let chunk = progressUpdateValue;
        try {
            // Create GitHub repository
            const url = orgName ? `https://api.github.com/orgs/${orgName}/repos` : 'https://api.github.com/user/repos';
            if (url) {
            const createRepoCmd = `curl -u "${userName}:${token}" -H "Content-Type: application/json" -d '{"name": "${appName}", "private": true}' ${url}`;
            execSync(createRepoCmd, { stdio: 'pipe' });
            } else {
            throw new Error('Missing GitHub username or organization name');
            }
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
    
    async destroyApp(userName: string, token: string, orgName: string, frontendAppName: string, backendAppName: string, projectName: string) {
        try {    
            const appNames = [];
            if (frontendAppName) appNames.push(frontendAppName);
            if (backendAppName) appNames.push(backendAppName);
            AppLogger.debug(`Repos to be deleted: ${appNames}`);
            for (const appName of appNames) {
                const url = (orgName && userName) ? `https://api.github.com/repos/${orgName}/${appName}` : (!orgName && userName) ? `https://api.github.com/repos/${userName}/${appName}` : '';
                if (url) {
                    AppLogger.debug(`Deleting repository for..., ${url}`);
                    const command = `curl -X DELETE -u "${userName}:${token}" ${url}`;
                    const result = execSync(command, { stdio: 'pipe' });
                    AppLogger.debug(`Repository deleted successfully:, ${result.toString()}`);
                    AppLogger.debug(`Removing repository for..., ${url}`);
                    fs.rmdirSync(`./${projectName}/${appName}`, { recursive: true });
                } else {
                    throw new Error('Missing GitHub username or organization name');
                }
            }
        } catch (error) {
            AppLogger.error(`Failed to delete repository: ${error}`, true);
        }
    }
}
