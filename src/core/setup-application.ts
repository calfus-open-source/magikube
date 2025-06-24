import { AppLogger } from "../logger/appLogger.js";
import BaseProject from "./base-project.js";
import fs from 'fs-extra';
import SystemConfig from "../config/system.js";
import { AppTypeMap, FullConfigObject } from "./interface.js";
import { ManageRepository } from "./manage-repository.js";
import BaseCommand from "../commands/base.js";
import { executeCommandWithRetry } from "./utils/executeCommandWithRetry-utils.js";
import { updateStatusFile } from "./utils/statusUpdater-utils.js";
import path, { join } from "path";


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
    
    // Setup Auth service
    async setupAuthenticationService(projectConfig:any ){
        const appName = 'auth-service';
        const { project_name: projectName } = projectConfig; 
         let copyFilePath;
         let createFilePath;
         let applicationPath;
         if (this.config.command === "create") {
           copyFilePath = path.resolve(process.cwd(), "..");
           createFilePath = `${projectConfig.service_name}`;
           applicationPath = `${process.cwd()}/${projectConfig.service_name}`;
         } else {
           copyFilePath = process.cwd();
           createFilePath = `${appName}`;
           applicationPath = `${process.cwd()}/${projectName}/${appName}`;
         } 
        try {
            AppLogger.info('Creating Auth-Service!', true);  
            const keyCloakBaseFiles = ['app.controller.ts', 'app.module.ts', 'app.service.ts', 'main.ts'];
            const keyCloakHealthFiles = ['health.controller.ts', 'health.module.ts', 'health.service.ts'];
            const dotFiles = ['env.local', 'gitignore'];
            const keyCloakFiles = ['keycloak.controller.ts', 'keycloak.dto.ts', 'keycloak.module.ts', 'keycloak.service.ts'];
            const commonFiles = ['package.json', 'tsconfig.json', 'Dockerfile', 'tsconfig.build.json', 'nest-cli.json'];
            const githubActionFIles = [ 'ci-build.yml' ];
            for (const file of githubActionFIles) {
                await this.createFile(`${file}`, `${copyFilePath}/dist/keycloak-auth-service/${file}.liquid`, `${createFilePath}/.github/workflows`, true);
            }
            for (const file of keyCloakBaseFiles) {
                await this.createFile(file, `${copyFilePath}/dist/keycloak-auth-service/${file}.liquid`, `${createFilePath}/src`, true);
                }
            for (const file of keyCloakHealthFiles) {
                await this.createFile(file, `${copyFilePath}/dist/keycloak-auth-service/${file}.liquid`, `${createFilePath}/src/health`, true);
            }
            for (const file of commonFiles) {
                await this.createFile(file, `${copyFilePath}/dist/keycloak-auth-service/${file}.liquid`, `${createFilePath}`, true);
            }
            for (const file of dotFiles) {
                await this.createFile(`.${file}`, `${copyFilePath}/dist/keycloak-auth-service/${file}.liquid`, `${createFilePath}`, true);
            }
            for (const file of keyCloakFiles) {
                await this.createFile(file, `${copyFilePath}/dist/keycloak-auth-service/${file}.liquid`, `${createFilePath}/src/keycloak`, true);
            }

            await executeCommandWithRetry('npm install', {cwd:`${applicationPath}`},3);
            updateStatusFile(projectName, appName, "success")
            AppLogger.info('Auth-Service created successfully!', true);
            return true

        } catch (error) {
            AppLogger.error(`Failed to setup authentication service, ${error}`, true);
            updateStatusFile(projectName, appName, "fail");
            fs.rmdirSync(`${applicationPath}`, { recursive: true });
            process.exit(1);
  
    }
    }

    // Setup Keycloak
    async setupKeyCloak(projectConfig: any) {
        const appName = 'keycloak';
        const { project_name: projectName } = projectConfig;
                let copyFilePath;
                let createFilePath;
                let applicationPath;
                if (this.config.command === "create") {
                  copyFilePath = path.resolve(process.cwd(), "..");
                  createFilePath = `${projectConfig.service_name}`;
                  applicationPath = `${process.cwd()}/${projectConfig.service_name}`;
                } else {
                  copyFilePath = process.cwd();
                  createFilePath = `${appName}`;
                  applicationPath = `${process.cwd()}/${projectName}/${appName}`;
                }
        try {
            AppLogger.info('Creating Keycloak-Service...', true);
            const keyCloakSetuopFiles = ['config.sh', 'entrypoint.sh','Dockerfile'];
            const themeSetupFiles = ['login.ftl', 'theme.properties', 'error.ftl'];
            const githubActionFIles = [ 'ci-build.yml' ];
            for (const file of githubActionFIles) {
                await this.createFile(`${file}`, `${copyFilePath}/dist/keycloak/${file}.liquid`, `${createFilePath}/.github/workflows`, true);
            }
            for (const file of keyCloakSetuopFiles) {
                await this.createFile(file, `${copyFilePath}/dist/keycloak/${file}.liquid`, `${createFilePath}`, true);
            }
            for (const file of themeSetupFiles) {
                await this.createFile(file, `${copyFilePath}/dist/keycloak/${file}.liquid`, `${createFilePath}/themes/magikube/login`, true);
            }

            AppLogger.info('Keycloak service created successfully.', true);
            updateStatusFile(projectName, appName, "success");

            return true

        } catch (error) {
            AppLogger.error(`Failed to setup keycloak, ${error}`, true);
            updateStatusFile(projectName, appName, "fail");
            fs.rmdirSync(`${applicationPath}`, { recursive: true });
            process.exit(1);
      }
    }
    
   // Create Node.js application
    createNodeExpressApp = async (configObject: any) => {
        const projectConfig = SystemConfig.getInstance().getConfig();
        const { appName: nodeAppName, projectName } = configObject;
        const filePath = process.cwd();
         let copyFilePath;
         let createFilePath;
         let applicationPath;
         if (this.config.command === "create") {
           copyFilePath = path.resolve(process.cwd(), "..");
           createFilePath = `${projectConfig.service_name}`;
           applicationPath = `${process.cwd()}/${projectConfig.service_name}`;
         } else {
           copyFilePath = process.cwd();
           createFilePath = `${nodeAppName}`;
           applicationPath = `${process.cwd()}/${projectName}/${nodeAppName}`;
         }
        try {
            AppLogger.info('Creating node-express app!', true);
            await this.createFile('app.ts', `${copyFilePath}/dist/express/app.ts.liquid`, `${createFilePath}/src`,true);
            const dotFiles = ['gitignore', 'eslintrc.json'];
            const githubActionFIles = [ 'ci-build.yml' ];
            for (const file of githubActionFIles) {
                await this.createFile(`${file}`, `${copyFilePath}/dist/express/${file}.liquid`, `${createFilePath}/.github/workflows`, true);
            }
            for (const file of dotFiles){
                await this.createFile(`.${file}`, `${copyFilePath}/dist/express/${file}.liquid`, `${createFilePath}`,true)
            }
            const files = ['package.json', 'tsconfig.json', 'Dockerfile', 'buildspec.yml'];
            for (const file of files) {
                await this.createFile(file, `${copyFilePath}/dist/express/${file}.liquid`, `${createFilePath}`,true);
            }
            await this.createFile('AppConfig.ts', `${copyFilePath}/dist/express/AppConfig.ts.liquid`, `${createFilePath}/src/config`,true)
            await this.createFile('auth-guard.service.ts', `${copyFilePath}/dist/express/auth-guard.service.ts.liquid`, `${createFilePath}/src/middlewares`,true)
            await this.createFile('auth-guard.ts', `${copyFilePath}/dist/express/auth-guard.ts.liquid`, `${createFilePath}/src/middlewares`,true)
            await this.createFile('index.ts', `${copyFilePath}/dist/express/index.ts.liquid`, `${createFilePath}/src/routes`,true)
            await this.createFile('protected.ts', `${copyFilePath}/dist/express/index.ts.liquid`, `${createFilePath}/src/routes`,true)
            await executeCommandWithRetry('npm install', {cwd:`${applicationPath}`, stdio: 'pipe'}, 3);
            AppLogger.info('Node Express app created successfully.',true);
            updateStatusFile(projectName, nodeAppName, "success");
            return true;

        } catch (error) {
            AppLogger.error(`Failed to create Node-express Application: ${error}`, true);
            updateStatusFile(projectName, nodeAppName, "fail");
            fs.rmdirSync(`${applicationPath}`, { recursive: true });
            process.exit(1);
        }
    }

    // Create Next.js application
    createNextApp = async (configObject: any) => {
        const filePath = process.cwd();
        const projectConfig = SystemConfig.getInstance().getConfig();
        const { appName: nextAppName, projectName } = configObject;
        let copyFilePath;
        let createFilePath;
        let applicationPath;
        if (this.config.command === "create") {
          copyFilePath = path.resolve(process.cwd(), "..");
          createFilePath = `${projectConfig.service_name}`;
          applicationPath = `${process.cwd()}/${projectConfig.service_name}`;
        } else {
          copyFilePath = process.cwd();
          createFilePath = `${nextAppName}`;
          applicationPath = `${process.cwd()}/${projectName}/${nextAppName}`;
        }
        try {
            AppLogger.info('Creating next app!', true);    
            const commonFiles = ['buildspec.yml', 'Dockerfile', 'nginx.conf', 'next.config.mjs', 'package.json', 'tsconfig.json'];
            const appRouterFiles = ['page.tsx', 'layout.tsx', 'global.css', 'AuthenticationProvider.tsx', 'AuthGuard.tsx'];
            const dotFiles = ['gitignore', 'eslintrc.json', 'env.local'];
            const files = [...commonFiles, ...appRouterFiles];
            const githubActionFiles = ['ci-build.yml'];

            for (const file of files) {
                //const route = appRouterFiles.includes(file) ? `${copyFilePath}/${projectName}/${nextAppName}/app` : `${createFilePath}`;
                await this.createFile(file, `${copyFilePath}/dist/next/${file}.liquid`, `${createFilePath}`, true);
            }
            for (const file of dotFiles) {
                await this.createFile(`.${file}`, `${copyFilePath}/dist/next/${file}.liquid`, `${createFilePath}`, true);
            }
            await this.createFile(`page.tsx`, `${copyFilePath}/dist/next/callback.tsx.liquid`, `${createFilePath}/app/callback`, true);
            for (const file of githubActionFiles) {
                await this.createFile(`${file}`, `${copyFilePath}/dist/next/${file}.liquid`, `${createFilePath}/.github/workflows`, true);
            }
            await executeCommandWithRetry('npm install', { cwd: `${applicationPath}` },3);
            updateStatusFile(projectName, nextAppName, "success");
            AppLogger.info("Next.js application created successfully.", true);
            return true;

        } catch (error) {
            AppLogger.error(`Failed to create Next.js app: ${error}`, true);
            updateStatusFile(projectName, nextAppName, "fail");
            fs.rmdirSync(`${applicationPath}`, { recursive: true });
            process.exit(1);
        }
    };

    // create React application
    createReactApp = async (configObject: any) => {
        const projectConfig = SystemConfig.getInstance().getConfig();
        const { appName: reactAppName, projectName } = configObject;
        let copyFilePath;
        let createFilePath;
        let applicationPath;
        if (this.config.command === "create") {
          copyFilePath = path.resolve(process.cwd(), "..");
          createFilePath = `${projectConfig.service_name}`;
          applicationPath = `${process.cwd()}/${projectConfig.service_name}`;
        } else {
          copyFilePath = process.cwd();
          createFilePath = `${reactAppName}`;
          applicationPath = `${process.cwd()}/${projectName}/${reactAppName}`;

        }

        try {
            AppLogger.info('Creating react app...', true);
            await this.createFile('index.html', `${copyFilePath}/dist/react/index.html.liquid`, `${createFilePath}/public`,true);
            const reactAppFile = ['App.tsx', 'index.tsx', 'app.css']
            for (const file of reactAppFile) {
                await this.createFile(file, `${copyFilePath}/dist/react/${file}.liquid`, `${createFilePath}/src`,true);
            }
            const reactAuthFiles = ['AuthGuard.tsx', 'AuthenticationProvider.tsx', 'Callback.tsx']
                  for (const file of reactAuthFiles) {
                await this.createFile(file, `${copyFilePath}/dist/react/${file}.liquid`, `${createFilePath}/src/components`,true);
            }
            const reactCommonFiles = ['package.json', 'tsconfig.json', 'Dockerfile', 'nginx.conf'];
            for (const file of reactCommonFiles) {
                await this.createFile(file, `${copyFilePath}/dist/react/${file}.liquid`, `${createFilePath}`,true);
            }
            const dotFiles = ['gitignore', 'eslintrc.json','env.local']
            for (const file of dotFiles) {
                await this.createFile(`.${file}`, `${copyFilePath}/dist/react/${file}.liquid`, `${createFilePath}`,true);
            }
            const githubActionFIles = [ 'ci-build.yml' ];
            for (const file of githubActionFIles) {
                await this.createFile(`${file}`, `${copyFilePath}/dist/react/${file}.liquid`, `${createFilePath}/.github/workflows`, true);
            }
            await executeCommandWithRetry('npm install', {cwd:`${applicationPath}`}, 3);
            AppLogger.info('React app created successfully.', true);
            updateStatusFile(projectName, reactAppName, "success");
            return true;

    } catch (error) {
            AppLogger.error(`Failed to create React app:${error}`, true);
            AppLogger.info(`Error occured, cleaning up the ${reactAppName} directory...`, true);
            updateStatusFile(projectName, reactAppName, "fail");
            fs.rmdirSync(`${applicationPath}`, { recursive: true });
            process.exit(1);
      }
    }

    //create GenAI aplication
    createGenAIApp =  async (configObject:any) => {
            const projectConfig = SystemConfig.getInstance().getConfig();
            const { genAI_app_name: genAIAppName, projectName } = configObject;            
            let copyFilePath;
            let createFilePath;
            let applicationPath;
            if (this.config.command === "create") {
              copyFilePath = path.resolve(process.cwd(), "..");
              createFilePath = `${projectConfig.service_name}`;
              applicationPath = `${process.cwd()}/${projectConfig.service_name}`;
            } else {
              copyFilePath = process.cwd();
              createFilePath = `${genAIAppName}`;
              applicationPath = `${process.cwd()}/${projectName}/${genAIAppName}`;
            }
         try {
            AppLogger.info("creating gen AI app...", true);
            const genAIserviceFiles = ["main.py", "requirements.txt", "Dockerfile"];
            const dotFiles = ["env.local", "gitignore"];
            for(const file of genAIserviceFiles){
              await this.createFile(file, `${copyFilePath}/dist/genAI/${file}.liquid`, `${createFilePath}`,true) 
            }
            for(const file of dotFiles){
              await this.createFile(`.${file}`, `${copyFilePath}/dist/genAI/${file}.liquid`, `${createFilePath}`,true)
            }
            updateStatusFile(projectName, genAIAppName, "success");
            AppLogger.info("Gen AI service setup is done.", true);
            return true;
         }
         catch(error:any){
            updateStatusFile(projectName, genAIAppName, "fail");
            AppLogger.error(`Failed to setup the gen AI service: ${error}`,true)
            process.exit(1);
         }   
    }
 

    //Setup Gitops 
    async setupGitops(projectConfig:any){
         const filePath = process.cwd();
         const appName = 'gitops';
         const { project_name: projectName, frontend_app_type, environment } = projectConfig;   
         try{ 
             const gitopsFiles = ['deployment.yml', 'ingress.yml', 'service.yml']
             const gitopsKeycloakFiles = ['deployment.yml', 'ingress.yml', 'service.yml', 'deployment-postgres.yml']
             const commonGitopsFiles = ['auth.yml', 'keycloak.yml', 'express.yml' ]
             for(const file of gitopsFiles) {
                await this.createFile(file, `${filePath}/dist/gitops/auth-gitops/${file}.liquid`,`gitops/${projectName}-${environment}/keycloak-auth-service`, true);
             }
            
              for(const file of gitopsKeycloakFiles) {
                await this.createFile(file, `${filePath}/dist/gitops/keycloak-gitops/${file}.liquid`,`gitops/${projectName}-${environment}/keycloak`, true);
             }
              for(const file of gitopsFiles) {
                await this.createFile(file, `${filePath}/dist/gitops/express-gitops/${file}.liquid`,`gitops/${projectName}-${environment}/express`, true);
             }
             if(frontend_app_type == 'react'){
              for(const file of gitopsFiles) {
                await this.createFile(file, `${filePath}/dist/gitops/react-gitops/${file}.liquid`,`gitops/${projectName}-${environment}/react`, true);
             }
             await this.createFile('react.yml', `${filePath}/dist/gitops/common-gitops-files/react.yml.liquid`, `gitops/${projectName}-${environment}`, true )
            }
            if(frontend_app_type == 'next'){
              for(const file of gitopsFiles) {
                await this.createFile(file, `${filePath}/dist/gitops/next-gitops/${file}.liquid`,`gitops/${projectName}-${environment}/next/`, true);
             }
             await this.createFile('next.yml', `${filePath}/dist/gitops/common-gitops-files/next.yml.liquid`, `gitops/${projectName}-${environment}`, true )
            }
              for(const file of commonGitopsFiles){
                await this.createFile(`${file}`, `${filePath}/dist/gitops/common-gitops-files/${file}.liquid`, `gitops/${projectName}-${environment}`, true)
            }

              AppLogger.info('Gitops setup is done.', true);
              updateStatusFile(projectName, "gitops", "success");
              return true;
        
         }catch (error) {
            AppLogger.error(`Failed to setup Gitops service, ${error}`, true);
            updateStatusFile(projectName, "gitops", "success");
            fs.rmdirSync(`${filePath}/${projectName}/${appName}`, { recursive: true });
            process.exit(1);
      }
    }

    // Wrapper for app creation and repo setup
    async handleAppCreation(appType: string, configObject: FullConfigObject, projectConfig: any) {
        try {
            const appConfig = this.appTypeMap[appType];
            if (appConfig) {
                configObject.common.appName = projectConfig[appConfig.appNameKey];
                configObject.common.appType = projectConfig[appConfig.appTypeKey];
                const appStatus = await appConfig.createAppFunction(configObject.common);
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
            process.exit(1);
        }
    }
    
    async destroyApp(userName: string, token: string, orgName: string, frontendAppName: string, backendAppName: string, projectName: string) {
        try {    
            const appNames = [];
            if (backendAppName) appNames.push(backendAppName);
            if (frontendAppName) appNames.push(frontendAppName);
            AppLogger.debug(`Repos to be deleted: ${appNames}`);
            for (const appName of appNames) {
                const url = (orgName && userName) ? `https://api.github.com/repos/${orgName}/${appName}` : (!orgName && userName) ? `https://api.github.com/repos/${userName}/${appName}` : '';
                if (url) {
                    AppLogger.debug(`Deleting repository for..., ${url}`);
                    const command = `curl -X DELETE -u "${userName}:${token}" ${url}`;
                    try{
                       executeCommandWithRetry(command, { stdio: 'pipe' },3)
                       AppLogger.info(`Repository deleted successfully : ${url}`, true)
                    }catch(error){
                            AppLogger.error(`Failed to delete repository: ${error}`, true);
                    }
                    const appfilePath = fs.existsSync(`./${projectName}/${appName}`)
                    if (fs.existsSync(`./${projectName}/${appName}`)) {
                          fs.rmdirSync(`./${projectName}/${appName}`, { recursive: true });
                    } 
                } else {
                    throw new Error('Missing GitHub username or organization name');
                }
            }
        } catch (error) {
                    AppLogger.error(`${error}`, true);
        }
    }
   
}
