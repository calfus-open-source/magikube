import BaseProject from '../base-project.js';
import AzureTerraformBackend from './azure-tf-backend.js';
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import * as jsyaml from 'js-yaml';
import * as os from 'os';
import { AppLogger } from '../../logger/appLogger.js';
import ProgressBar from '../../logger/progressLogger.js';
import { updateStatusFile as _updateStatusFile } from '../utils/statusUpdater-utils.js';
import { join } from 'path';
import SystemConfig from '../../config/system.js';
import { CloudProject } from '../interfaces/cloud-project.js';
import { azure_destroy_modules } from '../constants/constants.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
let sshProcess: any;

export default class AzureProject extends BaseProject implements CloudProject {
  async createProject(
    name: string,
    path: string,
    _commandName?: string,
  ): Promise<void> {
    if (this.config.command === 'new') {
      await super.createProject(name, path);
    }

    await AzureTerraformBackend.create(
      this,
      this.config.project_name,
      this.config.azure_location,
      this.config.azure_client_id,
      this.config.azure_client_secret,
      this.config.azure_tenant_id,
      this.config.azure_subscription_id,
    );
  }

  async createCommon(path?: string): Promise<void> {
    const basePath = path || process.cwd();
    this.createVNet(basePath);
    this.createACR(basePath);
    this.createAKS(basePath);
    this.createApplicationGateway(basePath);
    this.createBastion(basePath);
    this.createKeyVault(basePath);
    this.createSecurityGroups(basePath);
    this.createSqlServer(basePath);
  }

  async createVNet(basePath: string): Promise<void> {
    this.createFile(
      'main.tf',
      `${basePath}/dist/templates/azure/modules/vnet/main.tf.liquid`,
      '/infrastructure/modules/vnet',
      true,
    );
    this.createFile(
      'variables.tf',
      `${basePath}/dist/templates/azure/modules/vnet/variables.tf.liquid`,
      '/infrastructure/modules/vnet',
      true,
    );
    this.createFile(
      'subnet.tf',
      `${basePath}/dist/templates/azure/modules/vnet/subnets.tf.liquid`,
      '/infrastructure/modules/vnet',
      true,
    );
    this.createFile(
      'outputs.tf',
      `${basePath}/dist/templates/azure/modules/vnet/outputs.tf.liquid`,
      '/infrastructure/modules/vnet',
      true,
    );
  }

  async createACR(basePath: string): Promise<void> {
    this.createFile(
      'main.tf',
      `${basePath}/dist/templates/azure/modules/acr/main.tf.liquid`,
      '/infrastructure/modules/acr',
      true,
    );
    this.createFile(
      'variables.tf',
      `${basePath}/dist/templates/azure/modules/acr/variables.tf.liquid`,
      '/infrastructure/modules/acr',
      true,
    );
    this.createFile(
      'outputs.tf',
      `${basePath}/dist/templates/azure/modules/acr/outputs.tf.liquid`,
      '/infrastructure/modules/acr',
      true,
    );
  }

  async createApplicationGateway(basePath: string): Promise<void> {
    this.createFile(
      'main.tf',
      `${basePath}/dist/templates/azure/modules/application_gateway/main.tf.liquid`,
      '/infrastructure/modules/application_gateway',
      true,
    );
    this.createFile(
      'variables.tf',
      `${basePath}/dist/templates/azure/modules/application_gateway/variables.tf.liquid`,
      '/infrastructure/modules/application_gateway',
      true,
    );
    this.createFile(
      'outputs.tf',
      `${basePath}/dist/templates/azure/modules/application_gateway/outputs.tf.liquid`,
      '/infrastructure/modules/application_gateway',
      true,
    );
  }

  async createBastion(basePath: string): Promise<void> {
    this.createFile(
      'main.tf',
      `${basePath}/dist/templates/azure/modules/bastion/main.tf.liquid`,
      '/infrastructure/modules/bastion',
      true,
    );
    this.createFile(
      'variables.tf',
      `${basePath}/dist/templates/azure/modules/bastion/variables.tf.liquid`,
      '/infrastructure/modules/bastion',
      true,
    );
    this.createFile(
      'ssh.tf',
      `${basePath}/dist/templates/azure/modules/bastion/ssh.tf.liquid`,
      '/infrastructure/modules/bastion',
      true,
    );
    this.createFile(
      'outputs.tf',
      `${basePath}/dist/templates/azure/modules/bastion/outputs.tf.liquid`,
      '/infrastructure/modules/bastion',
      true,
    );
  }

  async createKeyVault(basePath: string): Promise<void> {
    this.createFile(
      'main.tf',
      `${basePath}/dist/templates/azure/modules/key_vault/main.tf.liquid`,
      '/infrastructure/modules/key_vault',
      true,
    );
    this.createFile(
      'variables.tf',
      `${basePath}/dist/templates/azure/modules/key_vault/variables.tf.liquid`,
      '/infrastructure/modules/key_vault',
      true,
    );
    this.createFile(
      'outputs.tf',
      `${basePath}/dist/templates/azure/modules/key_vault/outputs.tf.liquid`,
      '/infrastructure/modules/key_vault',
      true,
    );
  }

  async createSecurityGroups(basePath: string): Promise<void> {
    this.createFile(
      'main.tf',
      `${basePath}/dist/templates/azure/modules/security_groups/main.tf.liquid`,
      '/infrastructure/modules/security_groups',
      true,
    );
    this.createFile(
      'variables.tf',
      `${basePath}/dist/templates/azure/modules/security_groups/variables.tf.liquid`,
      '/infrastructure/modules/security_groups',
      true,
    );
    this.createFile(
      'outputs.tf',
      `${basePath}/dist/templates/azure/modules/security_groups/outputs.tf.liquid`,
      '/infrastructure/modules/security_groups',
      true,
    );
  }

  async createSqlServer(basePath: string): Promise<void> {
    this.createFile(
      'main.tf',
      `${basePath}/dist/templates/azure/modules/sql_server/main.tf.liquid`,
      '/infrastructure/modules/sql_server',
      true,
    );
    this.createFile(
      'variables.tf',
      `${basePath}/dist/templates/azure/modules/sql_server/variables.tf.liquid`,
      '/infrastructure/modules/sql_server',
      true,
    );
    this.createFile(
      'outputs.tf',
      `${basePath}/dist/templates/azure/modules/sql_server/outputs.tf.liquid`,
      '/infrastructure/modules/sql_server',
      true,
    );
  }

  async createResourceGroup(path?: string): Promise<void> {
    this.createFile(
      'main.tf',
      `${path}/dist/templates/azure/modules/resource-group/main.tf.liquid`,
      '/infrastructure/modules/resource-group',
      true,
    );
    this.createFile(
      'variables.tf',
      `${path}/dist/templates/azure/modules/resource-group/variables.tf.liquid`,
      '/infrastructure/modules/resource-group',
      true,
    );
  }

  async createAKS(path?: string): Promise<void> {
    this.createFile(
      'main.tf',
      `${path}/dist/templates/azure/modules/kubernetes/aks/main.tf.liquid`,
      '/infrastructure/modules/kubernetes/aks',
      true,
    );
    this.createFile(
      'variables.tf',
      `${path}/dist/templates/azure/modules/kubernetes/aks/variables.tf.liquid`,
      '/infrastructure/modules/kubernetes/aks',
      true,
    );
    this.createFile(
      'main.tf',
      `${path}/dist/templates/azure/modules/kubernetes/common/main.tf.liquid`,
      '/infrastructure/modules/kubernetes/common',
      true,
    );
    this.createFile(
      'variables.tf',
      `${path}/dist/templates/azure/modules/kubernetes/common/variables.tf.liquid`,
      '/infrastructure/modules/kubernetes/common',
      true,
    );
  }

  async createSQLDatabase(path?: string): Promise<void> {
    this.createFile(
      'main.tf',
      `${path}/dist/templates/azure/modules/sql-database/main.tf.liquid`,
      '/infrastructure/modules/sql-database',
      true,
    );
    this.createFile(
      'variables.tf',
      `${path}/dist/templates/azure/modules/sql-database/variables.tf.liquid`,
      '/infrastructure/modules/sql-database',
      true,
    );
  }

  async createDNSZone(basePath: string): Promise<void> {
    this.createFile(
      'main.tf',
      `${basePath}/dist/templates/azure/modules/dns-zone/main.tf.liquid`,
      '/infrastructure/modules/dns-zone',
      true,
    );
    this.createFile(
      'variables.tf',
      `${basePath}/dist/templates/azure/modules/dns-zone/variables.tf.liquid`,
      '/infrastructure/modules/dns-zone',
      true,
    );
  }

  async createIngressController(basePath: string): Promise<void> {
    this.createFile(
      'main.tf',
      `${basePath}/dist/templates/azure/modules/ingress-controller/main.tf.liquid`,
      '/infrastructure/modules/ingress-controller',
      true,
    );
    this.createFile(
      'variables.tf',
      `${basePath}/dist/templates/azure/modules/ingress-controller/variables.tf.liquid`,
      '/infrastructure/modules/ingress-controller',
      true,
    );
  }

  async createEnvironment(basePath: string): Promise<void> {
    this.createFile(
      'main.tf',
      `${basePath}/dist/templates/azure/modules/environment/main.tf.liquid`,
      '/infrastructure/modules/environment',
      true,
    );
    this.createFile(
      'variables.tf',
      `${basePath}/dist/templates/azure/modules/environment/variables.tf.liquid`,
      '/infrastructure/modules/environment',
      true,
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
      subscriptionId: profile.subscriptionId,
    };
  }

  async runTerraformInit(
    projectPath: string,
    backend: string,
    _projectName: string,
  ): Promise<void> {
    const progressBar = ProgressBar.createProgressBar();
    try {
      AppLogger.info(`Initializing Terraform...`, true);
      progressBar.start(100, 0, {
        message: 'Initializing Terraform backend for Azure...',
      });

      const terraform = spawn(
        'terraform',
        ['init', `-backend-config=${backend}`],
        {
          cwd: projectPath,
          stdio: 'pipe',
        },
      );

      let _output = '';
      let errorOutput = '';

      terraform.stdout.on('data', (data) => {
        const dataStr = data.toString();
        _output += dataStr;
        AppLogger.debug(dataStr);

        // Update progress based on keywords
        const progressUpdates = [
          {
            keyword: 'Initializing modules',
            progress: 25,
            message: 'Initializing modules...',
          },
          {
            keyword: 'Initializing provider plugins',
            progress: 50,
            message: 'Initializing provider plugins...',
          },
          {
            keyword: 'Configuring backend',
            progress: 75,
            message: 'Configuring backend...',
          },
          {
            keyword: 'Terraform has been successfully initialized!',
            progress: 100,
            message: 'Initialization complete',
          },
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
            AppLogger.info('Terraform initialization completed successfully');
            resolve();
          } else {
            AppLogger.error(
              `Terraform initialization failed with code ${code}`,
              true,
            );
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

  async runTerraformApply(
    projectPath: string,
    module?: string,
    moduleName?: string,
    varFile?: string,
  ): Promise<void> {
    AppLogger.debug(`Running terraform apply in path: ${projectPath}`);
    const projectConfig = SystemConfig.getInstance().getConfig();
    return new Promise((resolve, reject) => {
      try {
        AppLogger.info(`Creating module: ${module}`, true);

        const args = ['apply', '-no-color', '-auto-approve'];
        if (
          (module && module && projectConfig.command === 'new') ||
          (module && projectConfig.command === 'resume')
        ) {
          args.push(`-target=${module}`);
        }
        if (projectConfig.command === 'module') {
          args.push(`-target=module.${module}`);
        }

        if (varFile) {
          args.push(`-var-file=${varFile}`);
        }

        const terraformProcess = spawn('terraform', args, {
          cwd: projectPath,
          env: process.env,
          stdio: ['inherit', 'pipe', 'pipe'],
        });

        const totalSteps = 100;
        const progressBar = ProgressBar.createProgressBar();
        progressBar.start(totalSteps, 0, {
          message: 'Terraform apply in progress...',
        });

        terraformProcess.stdout.on('data', (data) => {
          const output = data.toString();
          AppLogger.info(`stdout: ${output}`);
          const creationCompleteRegex =
            /Creation complete after \d+s \[id=.*\]/g;
          let _match;
          while ((_match = creationCompleteRegex.exec(output)) !== null) {
            progressBar.increment(totalSteps / totalSteps); // Adjust as per your progress tracking
          }
        });

        let stderrOutput = '';
        terraformProcess.stderr.on('data', (data) => {
          const errorOutput = data.toString();
          stderrOutput += errorOutput;
          AppLogger.debug(`stderr: ${errorOutput}`);
        });

        terraformProcess.on('close', (code) => {
          if (code === 0) {
            progressBar.update(100, { message: 'Terraform apply completed.' });
            progressBar.stop();
            AppLogger.debug('Terraform apply completed successfully.', true);
            resolve();
          } else {
            progressBar.stop();
            AppLogger.error(
              `Terraform apply process exited with code ${code}`,
              true,
            );
            if (stderrOutput) {
              AppLogger.error(stderrOutput, true);
            }
            reject(
              new Error(`Terraform apply process exited with code ${code}`),
            );
          }
        });

        terraformProcess.on('error', (err) => {
          progressBar.stop();
          AppLogger.error(`Failed to run Terraform process: ${err}`, true);
          reject(err);
        });
      } catch (error) {
        AppLogger.error(`Failed to apply Terraform process: ${error}`, true);
        reject(error);
      }
    });
  }

  async runTerraformDestroy(
    projectPath: string,
    module?: string,
    varFile?: string,
  ): Promise<void> {
    const progressBar = ProgressBar.createProgressBar();

    try {
      const args = ['destroy', '-no-color', '-auto-approve'];
      if (module) args.push(`-target=${module}`);
      if (varFile) args.push(`-var-file=${varFile}`);

      AppLogger.info(`Running Terraform destroy in ${projectPath}`, true);

      const terraformProcess = spawn('terraform', args, {
        cwd: projectPath,
        env: process.env,
        stdio: ['inherit', 'pipe', 'pipe'],
      });

      progressBar.start(100, 0, {
        message: 'Destroying Terraform resources in Azure...',
      });

      let deletedResources = 0;
      let totalExpectedDeletes = 10; // Default fallback

      terraformProcess.stdout.on('data', (data) => {
        const output = data.toString();
        AppLogger.info(`stdout: ${output}`);

        const totalMatch = output.match(/Plan: (\d+) to destroy/);
        if (totalMatch && totalMatch[1]) {
          totalExpectedDeletes = parseInt(totalMatch[1], 10);
        }

        const destructionRegex = /Destruction complete after \d+s/g;
        const matches = output.match(destructionRegex) || [];
        deletedResources += matches.length;

        const progress = Math.min(
          Math.floor((deletedResources / totalExpectedDeletes) * 100),
          100,
        );

        progressBar.update(progress);
      });

      terraformProcess.stderr.on('data', (data) => {
        progressBar.stop();
        AppLogger.error(`stderr: ${data.toString()}`);
      });

      await new Promise<void>((resolve, reject) => {
        terraformProcess.on('close', (code) => {
          if (code === 0) {
            progressBar.update(100, {
              message: 'Terraform destroy completed.',
            });
            progressBar.stop();
            AppLogger.info('Terraform destroy completed successfully', true);
            resolve();
          } else {
            progressBar.stop();
            const msg = `Terraform destroy failed with exit code ${code}`;
            AppLogger.error(msg);
            reject(new Error(msg));
          }
        });

        terraformProcess.on('error', (err) => {
          progressBar.stop();
          AppLogger.error(`Failed to run Terraform destroy: ${err}`);
          reject(err);
        });
      });
    } catch (error) {
      progressBar.stop();
      AppLogger.error(`Error during Terraform destroy: ${error}`, true);
      throw error;
    }
  }

  async runTerraformDestroyTemplate(
    infrastructureFilePath: string,
    varFile?: string,
    status?: any,
  ): Promise<void> {
    try {
      if (azure_destroy_modules && azure_destroy_modules.length > 0) {
        for (const module of azure_destroy_modules) {
          if (
            status.modules[module] === 'fail' ||
            status.modules[module] === 'success'
          ) {
            const args = [
              'destroy',
              '-no-color',
              '-auto-approve',
              `-target=${module}`,
            ];
            if (varFile) {
              args.push(`-var-file=${varFile}`);
            }

            AppLogger.info(`Destroying module: ${module}`, true);

            const terraformProcess = spawn('terraform', args, {
              cwd: infrastructureFilePath,
              env: process.env,
              stdio: ['inherit', 'pipe', 'pipe'],
            });

            const totalSteps = 100;
            const progressBar = ProgressBar.createProgressBar();
            progressBar.start(totalSteps, 0, {
              message: `Destroying module: ${module}...`,
            });

            terraformProcess.stdout.on('data', (data) => {
              const output = data.toString();
              AppLogger.info(`stdout: ${output}`);

              // Increment the progress bar when a destruction completes
              const destructionRegex = /Destruction complete after \d+s/g;
              let _match;
              while ((_match = destructionRegex.exec(output)) !== null) {
                progressBar.increment(totalSteps / totalSteps); // Increment step
              }
            });

            terraformProcess.stderr.on('data', (data) => {
              progressBar.stop();
              AppLogger.error(`stderr: ${data.toString()}`);
            });

            await new Promise<void>((resolve, reject) => {
              terraformProcess.on('close', (code) => {
                if (code === 0) {
                  progressBar.update(100, {
                    message: `Module ${module} destroyed.`,
                  });
                  progressBar.stop();
                  resolve();
                } else {
                  progressBar.stop();
                  AppLogger.error(
                    `Terraform destroy failed for module ${module} with code ${code}`,
                  );
                  reject(
                    new Error(
                      `Terraform destroy failed for module ${module} with code ${code}`,
                    ),
                  );
                }
              });

              terraformProcess.on('error', (err) => {
                progressBar.stop();
                AppLogger.error(
                  `Failed to run Terraform destroy for ${module}: ${err}`,
                );
                reject(err);
              });
            });
          }
        }

        AppLogger.info('All modules destroyed successfully.', true);
      }
    } catch (error) {
      AppLogger.error(`Error during Terraform destroy: ${error}`, true);
      throw error;
    }

    const azureBackendStatus = await AzureTerraformBackend.delete(
      this,
      this.config.project_name,
      this.config.azure_location,
      this.config.azure_client_id,
      this.config.azure_client_secret,
      this.config.azure_tenant_id,
      this.config.azure_subscription_id,
    );
    if (azureBackendStatus) {
      await this.deleteFolder(this.config.project_name);
    }
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
              (c: any) => c.name === cluster.name,
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
              (c: any) => c.name === context.name,
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
              (u: any) => u.name === user.name,
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
        encoding: 'utf8',
      });
      AppLogger.debug(result);
    } catch (error) {
      AppLogger.error(`Error running Ansible playbook: ${error}`, true);
    }
  }
}
