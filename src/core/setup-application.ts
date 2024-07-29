import { execSync } from "child_process";
import { AppLogger } from "../logger/appLogger.js";
import { ProgressBar } from "../logger/progressLogger.js";
import BaseProject from "./base-project.js";
import fs from 'fs-extra';
import SystemConfig from "../config/system.js";
import { AppTypeMap, ConfigObject } from "./interface.js";
import { ManageRepository } from "./manage-repository.js";
import BaseCommand from "../commands/base.js";

export default class CreateApplication extends BaseProject {
    private appTypeMap: AppTypeMap;
    constructor(command: BaseCommand, projectConfig: any) {
        super(command, projectConfig);
        this.appTypeMap = {
          'node-express': {
            appNameKey: 'node_app_name',
            appTypeKey: 'backend_app_type',
            createAppFunction: this.createNodeExpressApp,
          },
          'next': {
            appNameKey: 'next_app_name',
            appTypeKey: 'frontend_app_type',
            createAppFunction: this.createNextApp,
          },
          'react': {
            appNameKey: 'react_app_name',
            appTypeKey: 'frontend_app_type',
            createAppFunction: this.createReactApp,
          },
        };
    }

    createNodeExpressApp = async (projectConfig: any) => {
        let nodeAppName;
        try {
            AppLogger.info('Creating node-express app!', true);
            const { appName: nodeAppName, projectName} = projectConfig;
            await this.createFile('app.ts', '../magikube-templates/express/app.ts.liquid', `./${projectName}/${nodeAppName}/src`);
            const dotFiles = ['gitignore', 'eslintrc.json'];
            for (const file of dotFiles){
                await this.createFile(`.${file}`, `../magikube-templates/express/${file}.liquid`, `./${projectName}/${nodeAppName}`)
            }
            const files = ['package.json', 'tsconfig.json', 'Dockerfile', 'buildspec.yml', 'deployment.yml'];
            for (const file of files) {
                await this.createFile(file, `../magikube-templates/express/${file}.liquid`, `./${projectName}/${nodeAppName}`);
            }
            await this.createFile('AppConfig.ts', `../magikube-templates/express/AppConfig.ts.liquid`, `./${projectName}/${nodeAppName}/src/config`)
            await this.createFile('auth-guard.service.ts', `../magikube-templates/express/auth-guard.service.ts.liquid`, `./${projectName}/${nodeAppName}/src/middlewares`)
            await this.createFile('auth-guard.ts', `../magikube-templates/express/auth-guard.ts.liquid`, `./${projectName}/${nodeAppName}/src/middlewares`)
            await this.createFile('index.ts', `../magikube-templates/express/index.ts.liquid`, `./${projectName}/${nodeAppName}/src/routes`)
            await this.createFile('protected.ts', `../magikube-templates/express/index.ts.liquid`, `./${projectName}/${nodeAppName}/src/routes`)
            execSync('npm install', {
                cwd: `${process.cwd()}/${projectName}/${nodeAppName}`,
                stdio: 'inherit'
            });
            AppLogger.info('Node Express app created successfully.');
            return true;
        } catch (error) {
            AppLogger.error(`Failed to create Node Express app: ${error}`, true);
            AppLogger.error(`Error occured, cleaning up the ${nodeAppName} directory...`, true);
                fs.rmdirSync(`./${projectConfig.project_name}/${nodeAppName}`, { recursive: true });
            return false;
        }
    }
    
    //create Next.js application
    createNextApp = async (projectConfig: any) => {
        let nextAppName;
        try {
            AppLogger.info('Creating next app!', true);
            const { appName: nextAppName, projectName} = projectConfig;
            const commonFiles = ['buildspec.yml', 'Dockerfile', 'nginx.conf', 'next.config.mjs', 'package.json', 'tsconfig.json', 'deployment.yml'];
            const appRouterFiles = ['page.tsx', 'layout.tsx', 'global.css', 'AuthenticationProvider.tsx', 'AuthGuard.tsx'];
            const dotFiles = ['gitignore', 'eslintrc.json', 'env.local']
            const files = [...commonFiles, ...appRouterFiles];
            for (const file of files) {
            const path = appRouterFiles.includes(file) ? `./${projectName}/${nextAppName}/app` : `./${projectName}/${nextAppName}`;
                await this.createFile(file, `../magikube-templates/next/${file}.liquid`, path);
            }
            for (const file of dotFiles) {
                await this.createFile(`.${file}`, `../magikube-templates/next/${file}.liquid`, `./${projectName}/${nextAppName}`);
            }
            await this.createFile(`page.tsx`, `../magikube-templates/next/callback.tsx.liquid`, `./${projectName}/${nextAppName}/app/callback`);
            execSync(`npm i`, {
                cwd: `${process.cwd()}/${projectName}/${nextAppName}`,
                stdio: 'inherit'
            });
            AppLogger.info('Next.js application created successfully.', true);
            return true;
        } catch (error) {
            AppLogger.error(`Failed to create Next.js app: ${error}`);
            AppLogger.debug('Deleting created files and folders...');
            fs.rmdirSync(`./${projectConfig.project_name}/${nextAppName}`, { recursive: true });
            return false;
        } 
    }

    // create React application
    createReactApp = async (projectConfig: any) => {
        let reactAppName;
        try {
            AppLogger.info('Creating react app!', true);
            const { appName: reactAppName, projectName} = projectConfig;
            await this.createFile('index.html', '../magikube-templates/react/index.html.liquid', `./${projectName}/${reactAppName}/public`);
            const reactAppFile = ['App.tsx', 'index.tsx', 'app.css']
            for (const file of reactAppFile) {
                await this.createFile(file, `../magikube-templates/react/${file}.liquid`, `./${projectName}/${reactAppName}/src`);
            }
            const reactAuthFiles = ['AuthGuard.tsx', 'AuthenticationProvider.tsx', 'Callback.tsx']
                  for (const file of reactAuthFiles) {
                await this.createFile(file, `../magikube-templates/react/${file}.liquid`, `./${projectName}/${reactAppName}/src/components`);
            }
            const reactCommonFiles = ['package.json', 'tsconfig.json', 'Dockerfile', 'nginx.conf'];
            for (const file of reactCommonFiles) {
                await this.createFile(file, `../magikube-templates/react/${file}.liquid`, `./${projectName}/${reactAppName}`);
            }
            const dotFiles = ['gitignore', 'eslintrc.json','env.local','env.local']
            for (const file of dotFiles) {
                await this.createFile(`.${file}`, `../magikube-templates/react/${file}.liquid`, `./${projectName}/${reactAppName}`);
            }
            execSync('npm install', {
                cwd: `${process.cwd()}/${projectName}/${reactAppName}`,
                stdio: 'inherit'
            });
            AppLogger.info('React app created successfully.', true);
            return true;
        } catch (error) {
            AppLogger.error(`Failed to create React app:${error}`, true);
            AppLogger.info(`Error occured, cleaning up the ${reactAppName} directory...`, true);
            fs.rmdirSync(`./${projectConfig.project_name}/${reactAppName}`, { recursive: true });
            return false;
        }
    }

    async setupKeyCloak(projectConfig: any) {
        try {
            const appName = 'keycloak'
            const { project_name: projectName } = projectConfig;
            const keyCloakSetuopFiles = ['config.sh', 'entrypoint.sh', 'docker-compose.yml', 'deployment.yml', 'Dockerfile']
            const tmemeSetupFiles = ['login.ftl','theme.properties', 'error.ftl' ]
            for (const file of keyCloakSetuopFiles) {
                await this.createFile(file, `../magikube-templates/keycloak/${file}.liquid`, `./${projectName}/${appName}`);
            }
            for (const file of tmemeSetupFiles) {
                await this.createFile(file, `../magikube-templates/keycloak/${file}.liquid`, `./${projectName}/${appName}/themes/magikube/login`)
            }
            const commands = ['docker-compose build'];
            commands.forEach(command => {
                execSync(command, {
                    cwd: `${process.cwd()}/${projectName}/${appName}`,
                    stdio: 'inherit'
                });
            })
        } catch (error) {
            AppLogger.error(`Failed to setup keycloak, ${error}`, true);
        }
    }

    async setupAuthenticationService(projectConfig: any) {
        try {
            const appName = 'auth-service'
            const { project_name: projectName } = projectConfig;
            const keyCloakBaseFiles = ['app.controller.ts', 'app.module.ts', 'app.service.ts', 'main.ts'];
            const keyCloakHealthFiles = ['health.controller.ts', 'health.module.ts', 'health.service.ts'];
            const dotFiles = ['env.local', 'gitignore']
            const keyCloakFiles = ['keycloak.controller.ts', 'keycloak.dto.ts', 'keycloak.module.ts', 'keycloak.service.ts'];   
            const commonFiles = ['package.json', 'tsconfig.json', 'Dockerfile', 'tsconfig.build.json', 'nest-cli.json' ]         
            for (const file of keyCloakBaseFiles) {
                await this.createFile(file, `../magikube-templates/keycloak-auth-service/${file}.liquid`, `./${projectName}/${appName}/src`);
            }
            for (const file of keyCloakHealthFiles) {
                await this.createFile(file, `../magikube-templates/keycloak-auth-service/${file}.liquid`, `./${projectName}/${appName}/src/health`);
            }
             for (const file of commonFiles) {
                await this.createFile(file, `../magikube-templates/keycloak-auth-service/${file}.liquid`, `./${projectName}/${appName}`);
            }
             for (const file of dotFiles) {
                await this.createFile(`.${file}`, `../magikube-templates/keycloak-auth-service/${file}.liquid`, `./${projectName}/${appName}`);
            }
            for (const file of keyCloakFiles) {
                await this.createFile(file, `../magikube-templates/keycloak-auth-service/${file}.liquid`, `./${projectName}/${appName}/src/keycloak`);
            }
            execSync('npm install', {
                cwd: `${process.cwd()}/${projectName}/${appName}`,
                stdio: 'inherit'
            });
        } catch (error) {
            AppLogger.error(`Failed to setup keycloak, ${error}`, true);
        }
    }
    
    // Wrapper for app creation and repo setup
    async handleAppCreation(appType: string, configObject: ConfigObject) {
        try {
            const projectConfig = SystemConfig.getInstance().getConfig();
            const appConfig = this.appTypeMap[appType];
            if (appConfig) {
                configObject.appName = projectConfig[appConfig.appNameKey];
                configObject.appType = projectConfig[appConfig.appTypeKey];
                const appStatus = await appConfig.createAppFunction(configObject);
                // After app creation, repository setup initiates
                if (appStatus) {
                    const repoSetupError = await ManageRepository.pushCode(configObject);
                    if (repoSetupError) {
                        throw new Error('Repo Setup Error');
                    }
                }
            }
        } catch (error) {
            AppLogger.error('Error occured while setting up the repository', true)
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
