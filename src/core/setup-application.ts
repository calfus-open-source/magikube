import { AppLogger } from "../logger/appLogger.js";
import BaseProject from "./base-project.js";
import fs from 'fs-extra';
import SystemConfig from "../config/system.js";
import { AppTypeMap, ConfigObject } from "./interface.js";
import { ManageRepository } from "./manage-repository.js";
import BaseCommand from "../commands/base.js";
import { executeCommandWithRetry } from "./common-functions/execCommands.js";



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
    async setupAuthenticationService(projectConfig: any){
        const path = process.cwd();
        const appName = 'auth-service';
        const { project_name: projectName } = projectConfig;  
        try {
            AppLogger.info('Creating Auth-Service!', true);  
            const keyCloakBaseFiles = ['app.controller.ts', 'app.module.ts', 'app.service.ts', 'main.ts'];
            const keyCloakHealthFiles = ['health.controller.ts', 'health.module.ts', 'health.service.ts'];
            const dotFiles = ['env.local', 'gitignore'];
            const keyCloakFiles = ['keycloak.controller.ts', 'keycloak.dto.ts', 'keycloak.module.ts', 'keycloak.service.ts'];
            const commonFiles = ['package.json', 'tsconfig.json', 'Dockerfile', 'tsconfig.build.json', 'nest-cli.json'];
            const githubActionFIles = [ 'ci-build.yml' ];
            for (const file of githubActionFIles) {
                await this.createFile(`${file}`, `${path}/dist/keycloak-auth-service/${file}.liquid`, `${path}/${projectName}/${appName}/.github/workflows`, true);
            }
            for (const file of keyCloakBaseFiles) {
                await this.createFile(file, `${path}/dist/keycloak-auth-service/${file}.liquid`, `${path}/${projectName}/${appName}/src`, true);
                }
            for (const file of keyCloakHealthFiles) {
                await this.createFile(file, `${path}/dist/keycloak-auth-service/${file}.liquid`, `${path}/${projectName}/${appName}/src/health`, true);
            }
            for (const file of commonFiles) {
                await this.createFile(file, `${path}/dist/keycloak-auth-service/${file}.liquid`, `${path}/${projectName}/${appName}`, true);
            }
            for (const file of dotFiles) {
                await this.createFile(`.${file}`, `${path}/dist/keycloak-auth-service/${file}.liquid`, `${path}/${projectName}/${appName}`, true);
            }
            for (const file of keyCloakFiles) {
                await this.createFile(file, `${path}/dist/keycloak-auth-service/${file}.liquid`, `${path}/${projectName}/${appName}/src/keycloak`, true);
            }

            await executeCommandWithRetry('npm install', {cwd:`${path}/${projectName}/${appName}`},3);
            AppLogger.info('Auth-Service created successfully!', true);
            return true

        } catch (error) {
            AppLogger.error(`Failed to setup authentication service, ${error}`, true);
            fs.rmdirSync(`${path}/${projectName}/${appName}`, { recursive: true });
            process.exit(1);
  
    }
    }

    // Setup Keycloak
    async setupKeyCloak(projectConfig: any) {
        const path = process.cwd();
        const appName = 'keycloak';
        const { project_name: projectName } = projectConfig;
        try {
            AppLogger.info('Creating Keycloak-Service!', true);
            const keyCloakSetuopFiles = ['config.sh', 'entrypoint.sh','Dockerfile'];
            const themeSetupFiles = ['login.ftl', 'theme.properties', 'error.ftl'];
            const githubActionFIles = [ 'ci-build.yml' ];
            for (const file of githubActionFIles) {
                await this.createFile(`${file}`, `${path}/dist/keycloak/${file}.liquid`, `${path}/${projectName}/${appName}/.github/workflows`, true);
            }
            for (const file of keyCloakSetuopFiles) {
                await this.createFile(file, `${path}/dist/keycloak/${file}.liquid`, `${path}/${projectName}/${appName}`, true);
            }
            for (const file of themeSetupFiles) {
                await this.createFile(file, `${path}/dist/keycloak/${file}.liquid`, `${path}/${projectName}/${appName}/themes/magikube/login`, true);
            }

            AppLogger.info('Keycloak service created successfully.', true);

            return true

        } catch (error) {
            AppLogger.error(`Failed to setup keycloak, ${error}`, true);
            fs.rmdirSync(`${path}/${projectName}/${appName}`, { recursive: true });
            process.exit(1);
      }
   }

    createNodeExpressApp = async (projectConfig: any) => {
        const { appName: nodeAppName, projectName} = projectConfig;
        const path = process.cwd();
        try {
            AppLogger.info('Creating node-express app!', true);
            await this.createFile('app.ts', `${path}/dist/express/app.ts.liquid`, `${path}/${projectName}/${nodeAppName}/src`,true);
            const dotFiles = ['gitignore', 'eslintrc.json'];
            const githubActionFIles = [ 'ci-build.yml' ];
            for (const file of githubActionFIles) {
                await this.createFile(`${file}`, `${path}/dist/express/${file}.liquid`, `${path}/${projectName}/${nodeAppName}/.github/workflows`, true);
            }
            for (const file of dotFiles){
                await this.createFile(`.${file}`, `${path}/dist/express/${file}.liquid`, `${path}/${projectName}/${nodeAppName}`,true)
            }
            const files = ['package.json', 'tsconfig.json', 'Dockerfile', 'buildspec.yml'];
            for (const file of files) {
                await this.createFile(file, `${path}/dist/express/${file}.liquid`, `${path}/${projectName}/${nodeAppName}`,true);
            }
            await this.createFile('AppConfig.ts', `${path}/dist/express/AppConfig.ts.liquid`, `${path}/${projectName}/${nodeAppName}/src/config`,true)
            await this.createFile('auth-guard.service.ts', `${path}/dist/express/auth-guard.service.ts.liquid`, `${path}/${projectName}/${nodeAppName}/src/middlewares`,true)
            await this.createFile('auth-guard.ts', `${path}/dist/express/auth-guard.ts.liquid`, `${path}/${projectName}/${nodeAppName}/src/middlewares`,true)
            await this.createFile('index.ts', `${path}/dist/express/index.ts.liquid`, `${path}/${projectName}/${nodeAppName}/src/routes`,true)
            await this.createFile('protected.ts', `${path}/dist/express/index.ts.liquid`, `${path}/${projectName}/${nodeAppName}/src/routes`,true)

            await executeCommandWithRetry('npm install', {cwd:`${path}/${projectName}/${nodeAppName}`, stdio: 'pipe'}, 3);
            AppLogger.info('Node Express app created successfully.',true);
            return true;

        } catch (error) {
            AppLogger.error(`Failed to create Node-express Application: ${error}`, true);
            fs.rmdirSync(`${path}/${projectName}/${nodeAppName}`, { recursive: true });
            process.exit(1);
        }
    }

    // Create Next.js application
    createNextApp = async (projectConfig: any) => {
        const path = process.cwd();
        const { appName: nextAppName, projectName } = projectConfig;
        try {
            AppLogger.info('Creating next app!', true);    
            const commonFiles = ['buildspec.yml', 'Dockerfile', 'nginx.conf', 'next.config.mjs', 'package.json', 'tsconfig.json'];
            const appRouterFiles = ['page.tsx', 'layout.tsx', 'global.css', 'AuthenticationProvider.tsx', 'AuthGuard.tsx'];
            const dotFiles = ['gitignore', 'eslintrc.json', 'env.local'];
            const files = [...commonFiles, ...appRouterFiles];
            const githubActionFiles = ['ci-build.yml'];

            for (const file of files) {
                const route = appRouterFiles.includes(file) ? `./${projectName}/${nextAppName}/app` : `${path}/${projectName}/${nextAppName}`;
                await this.createFile(file, `${path}/dist/next/${file}.liquid`, route, true);
            }
            for (const file of dotFiles) {
                await this.createFile(`.${file}`, `${path}/dist/next/${file}.liquid`, `${path}/${projectName}/${nextAppName}`, true);
            }
            await this.createFile(`page.tsx`, `${path}/dist/next/callback.tsx.liquid`, `${path}/${projectName}/${nextAppName}/app/callback`, true);
            for (const file of githubActionFiles) {
                await this.createFile(`${file}`, `${path}/dist/next/${file}.liquid`, `${path}/${projectName}/${nextAppName}/.github/workflows`, true);
            }

            await executeCommandWithRetry('npm install', { cwd: `${path}/${projectName}/${nextAppName}` },3);
            AppLogger.info('Next.js application created successfully.', true);
            return true;

        } catch (error) {
            AppLogger.error(`Failed to create Next.js app: ${error}`, true);
            fs.rmdirSync(`${path}/${projectName}/${nextAppName}`, { recursive: true });
            process.exit(1);
        }
    };

    // create React application
    createReactApp = async (projectConfig: any) => {
        const path = process.cwd();
        const { appName: reactAppName, projectName} = projectConfig;
        try {
            AppLogger.info('Creating react app...', true);
            await this.createFile('index.html', `${path}/dist/react/index.html.liquid`, `${path}/${projectName}/${reactAppName}/public`,true);
            const reactAppFile = ['App.tsx', 'index.tsx', 'app.css']
            for (const file of reactAppFile) {
                await this.createFile(file, `${path}/dist/react/${file}.liquid`, `${path}/${projectName}/${reactAppName}/src`,true);
            }
            const reactAuthFiles = ['AuthGuard.tsx', 'AuthenticationProvider.tsx', 'Callback.tsx']
                  for (const file of reactAuthFiles) {
                await this.createFile(file, `${path}/dist/react/${file}.liquid`, `${path}/${projectName}/${reactAppName}/src/components`,true);
            }
            const reactCommonFiles = ['package.json', 'tsconfig.json', 'Dockerfile', 'nginx.conf'];
            for (const file of reactCommonFiles) {
                await this.createFile(file, `${path}/dist/react/${file}.liquid`, `${path}/${projectName}/${reactAppName}`,true);
            }
            const dotFiles = ['gitignore', 'eslintrc.json','env.local','env.local']
            for (const file of dotFiles) {
                await this.createFile(`.${file}`, `${path}/dist/react/${file}.liquid`, `${path}/${projectName}/${reactAppName}`,true);
            }
            const githubActionFIles = [ 'ci-build.yml' ];
            for (const file of githubActionFIles) {
                await this.createFile(`${file}`, `${path}/dist/react/${file}.liquid`, `${path}/${projectName}/${reactAppName}/.github/workflows`, true);
            }

            await executeCommandWithRetry('npm install', {cwd:`${path}/${projectName}/${reactAppName}`}, 3);
            AppLogger.info('React app created successfully.', true);
            return true;

    } catch (error) {
            AppLogger.error(`Failed to create React app:${error}`, true);
            AppLogger.info(`Error occured, cleaning up the ${reactAppName} directory...`, true);
            fs.rmdirSync(`${path}/${projectName}/${reactAppName}`, { recursive: true });
            process.exit(1);
    }
}
   
    // //Setup Gitops 
    // async setupGitops(projectConfig:any){
    //      const path = process.cwd();
    //      const appName = 'gitops';
    //      const { project_name: projectName, frontend_app_type, environment } = projectConfig;   
    //      try{ 
    //          const gitopsFiles = ['deployment.yml', 'ingress.yml', 'service.yml']
    //          const gitopsKeycloakFiles = ['deployment.yml', 'ingress.yml', 'service.yml', 'deployment-postgres.yml']
    //          const commonGitopsFiles = ['auth.yml', 'keycloak.yml', 'express.yml' ]
    //          for(const file of gitopsFiles) {
    //             await this.createFile(file, `../../../magikube-templates/gitops/auth-gitops/${file}.liquid`,`${path}/${projectName}/gitops/${projectName}-${environment}/keycloak-auth-service`, true);
    //          }
            
    //           for(const file of gitopsKeycloakFiles) {
    //             await this.createFile(file, `../../../magikube-templates/gitops/keycloak-gitops/${file}.liquid`,`${path}/${projectName}/gitops/${projectName}-${environment}/keycloak`, true);
    //          }
    //           for(const file of gitopsFiles) {
    //             await this.createFile(file, `../../../magikube-templates/gitops/express-gitops/${file}.liquid`,`${path}/${projectName}/gitops/${projectName}-${environment}/express`, true);
    //          }
    //          if(frontend_app_type == 'react'){
    //           for(const file of gitopsFiles) {
    //             await this.createFile(file, `../../../magikube-templates/gitops/react-gitops/${file}.liquid`,`${path}/${projectName}/gitops/${projectName}-${environment}/react`, true);
    //          }
    //          await this.createFile('react.yml', `../../../magikube-templates/gitops/common-gitops-files/react.yml.liquid`, `${path}/${projectName}/gitops/${projectName}-${environment}`, true )
    //         }
    //         if(frontend_app_type == 'next'){
    //           for(const file of gitopsFiles) {
    //             await this.createFile(file, `../../../magikube-templates/gitops/next-gitops/${file}.liquid`,`${path}/${projectName}/gitops/${projectName}-${environment}/next/`, true);
    //          }
    //          await this.createFile('next.yml', `../../../magikube-templates/gitops/common-gitops-files/next.yml.liquid`, `${path}/${projectName}/gitops/${projectName}-${environment}`, true )
    //         }
    //           for(const file of commonGitopsFiles){
    //             await this.createFile(`${file}`, `../../../magikube-templates/gitops/common-gitops-files/${file}.liquid`, `${path}/${projectName}/gitops/${projectName}-${environment}`, true)
    //         }

    //           AppLogger.info('Gitops setup is done.', true);
    //           return true;
        
    //      }catch (error) {
    //         AppLogger.error(`Failed to setup authentication service, ${error}`, true);
    //         fs.rmdirSync(`${path}/${projectName}/${appName}`, { recursive: true });
    //         process.exit(1);
    //   }
    // }


    async setupGitops(projectConfig: any) {
        const path = process.cwd();
        console.log("path",path)
        const appName = 'gitops';
        const { project_name: projectName, frontend_app_type, environment } = projectConfig;
    
        try {
            const gitopsFiles = ['deployment.yml', 'ingress.yml', 'service.yml'];
            const gitopsKeycloakFiles = ['deployment.yml', 'ingress.yml', 'service.yml', 'deployment-postgres.yml'];
            const commonGitopsFiles = ['auth.yml', 'keycloak.yml', 'express.yml'];
            
            // Adjusted paths
            for (const file of gitopsFiles) {
                console.log(fs.existsSync(`${path}/dist`))
                console.log(`../../Repos/magikube/magikube-templates/gitops/auth-gitops/${file}.liquid`)
                await this.createFile(file, `../../Repos/magikube/magikube-templates/gitops/auth-gitops/${file}.liquid`, `${path}/${projectName}/gitops/${projectName}-${environment}/keycloak-auth-service`, true);
            }
        
            for (const file of gitopsKeycloakFiles) {
                await this.createFile(file, `${path}/dist/gitops/keycloak-gitops/${file}.liquid`, `${path}/${projectName}/gitops/${projectName}-${environment}/keycloak`, true);
            }
    
            for (const file of gitopsFiles) {
                await this.createFile(file, `${path}/dist/gitops/express-gitops/${file}.liquid`, `${path}/${projectName}/gitops/${projectName}-${environment}/express`, true);
            }
    
            if (frontend_app_type === 'react') {
                for (const file of gitopsFiles) {
                    await this.createFile(file, `${path}/dist/gitops/react-gitops/${file}.liquid`, `${path}/${projectName}/gitops/${projectName}-${environment}/react`, true);
                }
                await this.createFile('react.yml', `${path}/dist/gitops/common-gitops-files/react.yml.liquid`, `${path}/${projectName}/gitops/${projectName}-${environment}`, true);
            }
    
            if (frontend_app_type === 'next') {
                for (const file of gitopsFiles) {
                    await this.createFile(file, `${path}/dist/gitops/next-gitops/${file}.liquid`, `${path}/${projectName}/gitops/${projectName}-${environment}/next/`, true);
                }
                await this.createFile('next.yml', `${path}/dist/gitops/common-gitops-files/next.yml.liquid`, `${path}/${projectName}/gitops/${projectName}-${environment}`, true);
            }
    
            for (const file of commonGitopsFiles) {
                await this.createFile(`${file}`, `${path}/dist/gitops/common-gitops-files/${file}.liquid`, `${path}/${projectName}/gitops/${projectName}-${environment}`, true);
            }
    
            AppLogger.info('Gitops setup is done.', true);
            return true;
    
        } catch (error) {
            AppLogger.error(`Failed to setup Gitops service, ${error}`, true);
            fs.rmdirSync(`${path}/${projectName}/${appName}`, { recursive: true });
            process.exit(1);
        }
    }
    
    
//Setup Gitops-k8s 
// async setupGitopsk8s(projectConfig:any){
//     const path = process.cwd();
//     const appName = 'gitops';
//     const { project_name: projectName, frontend_app_type, environment } = projectConfig;   
//     try{ 
//         const gitopsFiles = ['deployment.yml', 'ingress.yml', 'service.yml']
//         const gitopsKeycloakFiles = ['deployment.yml', 'ingress.yml', 'service.yml', 'deployment-postgres.yml']
//         const commonGitopsFiles = ['auth.yml', 'keycloak.yml', 'express.yml' ]
//         for(const file of gitopsFiles) {
//            await this.createFile(file, `${path}/dist/gitops-k8s/auth-gitops/${file}.liquid`,`${path}/${projectName}/gitops-k8s/${projectName}-${environment}/keycloak-auth-service`, true);
//         }
       
//          for(const file of gitopsKeycloakFiles) {
//            await this.createFile(file, `${path}/dist/gitops-k8s/keycloak-gitops/${file}.liquid`,`${path}/${projectName}/gitops-k8s/${projectName}-${environment}/keycloak`, true);
//         }
//          for(const file of gitopsFiles) {
//            await this.createFile(file, `${path}/dist/gitops-k8s/express-gitops/${file}.liquid`,`${path}/${projectName}/gitops-k8s/${projectName}-${environment}/express`, true);
//         }
//         if(frontend_app_type == 'react'){
//          for(const file of gitopsFiles) {
//            await this.createFile(file, `${path}/dist/gitops-k8s/react-gitops/${file}.liquid`,`${path}/${projectName}/gitops-k8s/${projectName}-${environment}/react`, true);
//         }
//         await this.createFile('react.yml', `${path}/dist/gitops-k8s/common-gitops-files/react.yml.liquid`, `${path}/${projectName}/gitops-k8s/${projectName}-${environment}`, true )
//        }
//        if(frontend_app_type == 'next'){
//          for(const file of gitopsFiles) {
//            await this.createFile(file, `${path}/dist/gitops-k8s/next-gitops/${file}.liquid`,`${path}/${projectName}/gitops-k8s/${projectName}-${environment}/next/`, true);
//         }
//         await this.createFile('next.yml', `${path}/dist/gitops-k8s/common-gitops-files/next.yml.liquid`, `${path}/${projectName}/gitops-k8s/${projectName}-${environment}`, true )
//        }
//          for(const file of commonGitopsFiles){
//            await this.createFile(`${file}`, `${path}/dist/gitops-k8s/common-gitops-files/${file}.liquid`, `${path}/${projectName}/gitops-k8s/${projectName}-${environment}`, true)
//        }

//          AppLogger.info('Gitops setup is done.', true);
//          return true;
   
//     }catch (error) {
//        AppLogger.error(`Failed to setup authentication service, ${error}`, true);
//        fs.rmdirSync(`${path}/${projectName}/${appName}`, { recursive: true });
//        process.exit(1);
//  }
// }
    
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
                    const appPath = fs.existsSync(`./${projectName}/${appName}`)
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


    async MoveFiles(Dirname :string){
        
    }
}
