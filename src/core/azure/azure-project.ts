import BaseProject from '../base-project.js';
import AzureTerraformBackend from "./azure-tf-backend.js";
import AzurePolicies from "./azure-iam.js";
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import * as jsyaml from 'js-yaml';
import * as os from 'os';
import { AppLogger } from '../../logger/appLogger.js';
import { ProgressBar } from '../../logger/progressLogger.js';
import CreateApplication from '../setup-application.js';
import BaseCommand from '../../commands/base.js';
import { executeCommandWithRetry } from '../utils/executeCommandWithRetry-utils.js';
import { updateStatusFile } from '../utils/statusUpdater-utils.js';
import { join } from 'path';
import SystemConfig from '../../config/system.js';
import { CloudProject } from "../interfaces/cloud-project.js";

let sshProcess: any;

export default class AzureProject extends BaseProject implements CloudProject {
    async createProject(name: string, path: string, commandName?: string): Promise<void> {  
        if(this.config.command === "new"){
            await super.createProject(name, path);
        }

        if (
            (!this.config.moduleType && this.config.command !=="create") || 
            (this.config.moduleType && this.config.moduleType.length > 1) 
        ) {
        await AzurePolicies.create(
            this,
            this.config.azure_location,
            this.config.azure_client_id,
            this.config.azure_client_secret,
            this.config.azure_tenant_id,
            this.config.azure_subscription_id,
            this.config.project_name
        );
        }

        await AzureTerraformBackend.create(
            this,
            this.config.project_id,
            this.config.azure_location,
            this.config.azure_client_id,
            this.config.azure_client_secret,
            this.config.azure_tenant_id,
            this.config.azure_subscription_id
        );
    }

    async destroyProject(name: string, path: string): Promise<void> {
        let azureStatus = false;
        if (this.config.cloud_provider === 'azure') {
            azureStatus = true;
        }
        let command: BaseCommand | undefined;
        const createApplication = new CreateApplication(command as BaseCommand, this.config)
        if (!this.config.dryrun) {
            // Once the prompts are accepted at the start, these parameters will be accessible
            if (this.config.command === "new" || this.config.command === "resume"){       
            const {git_user_name,github_access_token, github_owner,project_name,} = this.config;
            let frontend_app_name;
            let backend_app_name;
            if(this.config.frontend_app_type == "react") {
                frontend_app_name = this.config.react_app_name;
            }
            if (this.config.frontend_app_type == "next") {
                frontend_app_name = this.config.next_app_name;
            }
            if (this.config.backend_app_type == "node-express") {
                backend_app_name = this.config.node_app_name;
            }
            await createApplication.destroyApp(git_user_name, github_access_token, github_owner, frontend_app_name, backend_app_name, project_name);

            if (azureStatus) {
                await super.destroyProject(name, path);
            }
        }

            const status = await AzurePolicies.delete(
                this,
                this.config.azure_location,
                this.config.azure_client_id,
                this.config.azure_client_secret,
                this.config.azure_tenant_id,
                this.config.azure_subscription_id
            );


            if (status) {
                azureStatus = await AzureTerraformBackend.delete(
                    this,
                    this.config.project_id,
                    this.config.azure_location,
                    this.config.azure_client_id,
                    this.config.azure_client_secret,
                    this.config.azure_tenant_id,
                    this.config.azure_subscription_id
                );
            }
        
    }
  }

  async createCommon(path?: string): Promise<void> {
    this.createResourceGroup(path);
    this.createVNet(path);
    this.createDNSZone();
    this.createACR();
    this.createIngressController();
    this.createSQLDatabase(path);
    this.createEnvironment();
  }

  async createResourceGroup(path?: string): Promise<void> {
    this.createFile(
      "main.tf",
      `${path}/dist/templates/azure/modules/resource-group/main.tf.liquid`,
      "/infrastructure/modules/resource-group",
      true
    );
    this.createFile(
      "variables.tf",
      `${path}/dist/templates/azure/modules/resource-group/variables.tf.liquid`,
      "/infrastructure/modules/resource-group",
      true
    );
  }

  async createAKS(path?:string): Promise<void> {
    this.createFile(
      "main.tf",
      `${path}/dist/templates/azure/modules/aks/main.tf.liquid`,
      "/infrastructure/modules/aks",
      true
    );
    this.createFile(
      "variables.tf",
      `${path}/dist/templates/azure/modules/aks/variables.tf.liquid`,
      "/infrastructure/modules/aks",
      true
    );
  }

  async createSQLDatabase(path?:string): Promise<void> {
    this.createFile(
      "main.tf",
      `${path}/dist/templates/azure/modules/sql-database/main.tf.liquid`,
      "/infrastructure/modules/sql-database",
      true
    );
    this.createFile(
      "variables.tf",
      `${path}/dist/templates/azure/modules/sql-database/variables.tf.liquid`,
      "/infrastructure/modules/sql-database",
      true
    );
  }

  async createDNSZone(): Promise<void> {
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/azure/modules/dns-zone/main.tf.liquid`,
      "/infrastructure/modules/dns-zone",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/azure/modules/dns-zone/variables.tf.liquid`,
      "/infrastructure/modules/dns-zone",
      true
    );
  }

  async createIngressController(): Promise<void> {
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/azure/modules/ingress-controller/main.tf.liquid`,
      "/infrastructure/modules/ingress-controller",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/azure/modules/ingress-controller/variables.tf.liquid`,
      "/infrastructure/modules/ingress-controller",
      true
    );
  }

  async createVNet(path?:string): Promise<void> {
    this.createFile(
      "main.tf",
      `${path}/dist/templates/azure/modules/vnet/main.tf.liquid`,
      "/infrastructure/modules/vnet",
      true
    );
    this.createFile(
      "variables.tf",
      `${path}/dist/templates/azure/modules/vnet/variables.tf.liquid`,
      "/infrastructure/modules/vnet",
      true
    );
  }

  async createEnvironment(): Promise<void> {
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/azure/modules/environment/main.tf.liquid`,
      "/infrastructure/modules/environment",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/azure/modules/environment/variables.tf.liquid`,
      "/infrastructure/modules/environment",
      true
    );
  }

  async createACR(): Promise<void> {
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/azure/modules/acr/main.tf.liquid`,
      "/infrastructure/modules/acr",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/azure/modules/acr/variables.tf.liquid`,
      "/infrastructure/modules/acr",
      true
    );
  }

    async startSSHProcess() {
        // Azure specific SSH process if needed
        AppLogger.debug('Starting SSH process for Azure');
    }

    async stopSSHProcess() {
        // Azure specific SSH process cleanup if needed
        AppLogger.debug('Stopping SSH process for Azure');
    }

    async getCreds(profileName: string) {
        const AzureProfile = (await import('./azure-profile.js')).default;
        const profiles = AzureProfile.getProfiles();
        const profile = profiles.find((p: any) => p.profileName === profileName);
        
        if (!profile) {
            throw new Error(`Azure profile '${profileName}' not found`);
        }
        
        return {
            clientId: profile.clientId,
            clientSecret: profile.clientSecret,
            tenantId: profile.tenantId,
            subscriptionId: profile.subscriptionId
        };
    }

    async AzureProfileActivate(profileName: string) {
        // Azure CLI profile activation
        // Get creds from profile name
        const creds = await this.getCreds(profileName);
        process.env.AZURE_CLIENT_ID = creds.clientId;
        process.env.AZURE_CLIENT_SECRET = creds.clientSecret;
        process.env.AZURE_TENANT_ID = creds.tenantId;
        process.env.AZURE_SUBSCRIPTION_ID = creds.subscriptionId;
        AppLogger.info(`Activating Azure profile: ${profileName}`,true);
    }

    async runTerraformInit(projectPath: string, backend: string, projectName: string): Promise<void> {
        const progressBar = ProgressBar.createProgressBar();
        try {
            AppLogger.info(`Initializing Terraform in ${projectPath}`, true);
            progressBar.start(100, 0, { message: 'Initializing Terraform backend for Azure...' });
            
            const terraform = spawn('terraform', ['init', `-backend-config=${backend}`], {
                cwd: projectPath,
                stdio: 'pipe'
            });

            let output = '';
            let errorOutput = '';

            terraform.stdout.on('data', (data) => {
                const dataStr = data.toString();
                output += dataStr;
                AppLogger.debug(dataStr);
                
                // Update progress based on keywords
                const progressUpdates = [
                    { keyword: 'Initializing modules', progress: 25, message: 'Initializing modules...' },
                    { keyword: 'Initializing provider plugins', progress: 50, message: 'Initializing provider plugins...' },
                    { keyword: 'Configuring backend', progress: 75, message: 'Configuring backend...' },
                    { keyword: 'Terraform has been successfully initialized!', progress: 100, message: 'Initialization complete' },
                ];
                
                for (const { keyword, progress, message } of progressUpdates) {
                    if (dataStr.includes(keyword)) {
                        progressBar.update(progress, { message });
                        break;
                    }
                }
            });

            terraform.stderr.on('data', (data) => {
                const dataStr = data.toString();
                errorOutput += dataStr;
                AppLogger.debug(dataStr);
            });

            await new Promise<void>((resolve, reject) => {
                terraform.on('close', (code) => {
                    progressBar.stop();
                    if (code === 0) {
                        AppLogger.info('Terraform initialization completed successfully', true);
                        resolve();
                    } else {
                        AppLogger.error(`Terraform initialization failed with code ${code}`, true);
                        AppLogger.error(errorOutput, true);
                        reject(new Error(`Terraform init failed with code ${code}`));
                    }
                });
            });

        } catch (error) {
            progressBar.stop();
            AppLogger.error(`Error during Terraform initialization: ${error}`, true);
            throw error;
        }
    }

    async getMasterIp(projectPath: string): Promise<string> {
        try {
            const result = execSync('terraform output -raw aks_cluster_endpoint', { 
                cwd: projectPath,
                encoding: 'utf8'
            });
            return result.trim();
        } catch (error) {
            AppLogger.error(`Error getting AKS cluster endpoint: ${error}`, true);
            return '';
        }
    }

    async runTerraformApply(projectPath: string, module?: string, moduleName?:string, varFile?: string): Promise<void> {
        const progressBar = ProgressBar.createProgressBar();
        try {
            let command = 'terraform apply -auto-approve';
            
            if (module) {
                command += ` -target=${module}`;
            }
            
            if (varFile) {
                command += ` -var-file=${varFile}`;
            }

            AppLogger.info(`Running Terraform apply in ${projectPath}`, true);
            progressBar.start(100, 0, { message: 'Applying Terraform configuration for Azure...' });
            
            await executeCommandWithRetry(
                command,
                { cwd: projectPath, stdio: 'inherit' },
                3
            );

            progressBar.update(100, { message: 'Terraform apply completed.' });
            progressBar.stop();
            AppLogger.info('Terraform apply completed successfully', true);
            
            if (module && moduleName) {
                updateStatusFile(this.config, moduleName, 'success');
            }

        } catch (error) {
            progressBar.stop();
            AppLogger.error(`Error during Terraform apply: ${error}`, true);
            throw error;
        }
    }

    async runTerraformDestroy(projectPath: string, module?: string, varFile?: string): Promise<void> {
        const progressBar = ProgressBar.createProgressBar();
        try {
            let command = 'terraform destroy -auto-approve';
            
            if (module) {
                command += ` -target=${module}`;
            }
            
            if (varFile) {
                command += ` -var-file=${varFile}`;
            }

            AppLogger.info(`Running Terraform destroy in ${projectPath}`, true);
            progressBar.start(100, 0, { message: 'Destroying Terraform resources in Azure...' });
            
            await executeCommandWithRetry(
                command,
                { cwd: projectPath, stdio: 'inherit' },
                3
            );

            progressBar.update(100, { message: 'Terraform destroy completed.' });
            progressBar.stop();
            AppLogger.info('Terraform destroy completed successfully', true);

        } catch (error) {
            progressBar.stop();
            AppLogger.error(`Error during Terraform destroy: ${error}`, true);
            throw error;
        }
    }

    async runTerraformDestroyTemplate(projectPath: string, varFile?: string): Promise<void> {
        await this.runTerraformDestroy(projectPath, undefined, varFile);
    }

    async editKubeConfigFile(newClusterConfigPath: string): Promise<void> {
        try {
            const homeDir = os.homedir();
            const kubeConfigPath = join(homeDir, '.kube', 'config');
            
            if (fs.existsSync(newClusterConfigPath)) {
                const newConfig = fs.readFileSync(newClusterConfigPath, 'utf8');
                const newConfigObj = jsyaml.load(newConfig) as any;
                
                let existingConfigObj: any = { clusters: [], contexts: [], users: [] };
                
                if (fs.existsSync(kubeConfigPath)) {
                    const existingConfig = fs.readFileSync(kubeConfigPath, 'utf8');
                    existingConfigObj = jsyaml.load(existingConfig) as any;
                }
                
                // Merge configurations
                if (newConfigObj.clusters) {
                    existingConfigObj.clusters = existingConfigObj.clusters || [];
                    newConfigObj.clusters.forEach((cluster: any) => {
                        const existingIndex = existingConfigObj.clusters.findIndex(
                            (c: any) => c.name === cluster.name
                        );
                        if (existingIndex >= 0) {
                            existingConfigObj.clusters[existingIndex] = cluster;
                        } else {
                            existingConfigObj.clusters.push(cluster);
                        }
                    });
                }
                
                if (newConfigObj.contexts) {
                    existingConfigObj.contexts = existingConfigObj.contexts || [];
                    newConfigObj.contexts.forEach((context: any) => {
                        const existingIndex = existingConfigObj.contexts.findIndex(
                            (c: any) => c.name === context.name
                        );
                        if (existingIndex >= 0) {
                            existingConfigObj.contexts[existingIndex] = context;
                        } else {
                            existingConfigObj.contexts.push(context);
                        }
                    });
                }
                
                if (newConfigObj.users) {
                    existingConfigObj.users = existingConfigObj.users || [];
                    newConfigObj.users.forEach((user: any) => {
                        const existingIndex = existingConfigObj.users.findIndex(
                            (u: any) => u.name === user.name
                        );
                        if (existingIndex >= 0) {
                            existingConfigObj.users[existingIndex] = user;
                        } else {
                            existingConfigObj.users.push(user);
                        }
                    });
                }
                
                existingConfigObj['current-context'] = newConfigObj['current-context'];
                
                const mergedConfig = jsyaml.dump(existingConfigObj);
                fs.writeFileSync(kubeConfigPath, mergedConfig);
                
                AppLogger.info('Azure AKS kubeconfig merged successfully', true);
            }
        } catch (error) {
            AppLogger.error(`Error editing kubeconfig: ${error}`, true);
        }
    }

    async runAnsiblePlaybook(playbook: string, projectPath: string) {
        try {
            AppLogger.info(`Running Ansible playbook: ${playbook}`, true);
            const result = execSync(`ansible-playbook ${playbook}`, {
                cwd: projectPath,
                encoding: 'utf8'
            });
            AppLogger.debug(result);
        } catch (error) {
            AppLogger.error(`Error running Ansible playbook: ${error}`, true);
        }
    }
} 