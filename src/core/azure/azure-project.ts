import BaseProject from "../base-project.js";
import AzureTerraformBackend from "./azure-tf-backend.js";
import { spawn, execSync } from "child_process";
import fs from "fs";
import * as jsyaml from "js-yaml";
import * as os from "os";
import { AppLogger } from "../../logger/appLogger.js";
import { ProgressBar } from "../../logger/progressLogger.js";
import CreateApplication from "../setup-application.js";
import BaseCommand from "../../commands/base.js";
import { executeCommandWithRetry } from "../utils/executeCommandWithRetry-utils.js";
import {
  readStatusFile,
  updateStatusFile,
} from "../utils/statusUpdater-utils.js";
import { join } from "path";
import SystemConfig from "../../config/system.js";
import { CloudProject } from "../interfaces/cloud-project.js";
import { azure_destroy_modules } from "../constants/constants.js";

let sshProcess: any;

export default class AzureProject extends BaseProject implements CloudProject {
  async createProject(
    name: string,
    path: string,
    commandName?: string
  ): Promise<void> {
    if (this.config.command === "new") {
      await super.createProject(name, path);
    }

    await AzureTerraformBackend.create(
      this,
      this.config.project_name,
      this.config.azure_location,
      this.config.azure_client_id,
      this.config.azure_client_secret,
      this.config.azure_tenant_id,
      this.config.azure_subscription_id
    );
  }

  async destroyProject(name: string, path: string): Promise<void> {
    let azureStatus = false;
    if (this.config.cloud_provider === "azure") {
      azureStatus = true;
    }
    let command: BaseCommand | undefined;
    const createApplication = new CreateApplication(
      command as BaseCommand,
      this.config
    );
    if (!this.config.dryrun) {
      // Once the prompts are accepted at the start, these parameters will be accessible
      if (this.config.command === "new" || this.config.command === "resume") {
        const {
          git_user_name,
          github_access_token,
          github_owner,
          project_name,
        } = this.config;
        let frontend_app_name;
        let backend_app_name;
        if (this.config.frontend_app_type == "react") {
          frontend_app_name = this.config.react_app_name;
        }
        if (this.config.frontend_app_type == "next") {
          frontend_app_name = this.config.next_app_name;
        }
        if (this.config.backend_app_type == "node-express") {
          backend_app_name = this.config.node_app_name;
        }
        await createApplication.destroyApp(
          git_user_name,
          github_access_token,
          github_owner,
          frontend_app_name,
          backend_app_name,
          project_name
        );

        if (azureStatus) {
          await super.destroyProject(name, path);
        }
      }
    }
  }

  async createCommon(path?: string): Promise<void> {
    this.createVNet(path);
    this.createACR();
    this.createAKS(path);
    this.createApplicationGateway();
    this.createBastion();
    this.createKeyVault();
    this.createSecurityGroups();
    this.createSqlServer();
    // this.createAIFoundry();
    // this.createVpnGateway();
    // this.createResourceGroup(path);
    // this.createDNSZone();
    // this.createIngressController();
    // this.createSQLDatabase(path);
    // this.createEnvironment();
  }

  async createVNet(path?: string): Promise<void> {
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
    this.createFile(
      "subnet.tf",
      `${path}/dist/templates/azure/modules/vnet/subnets.tf.liquid`,
      "/infrastructure/modules/vnet",
      true
    );
    this.createFile(
      "outputs.tf",
      `${path}/dist/templates/azure/modules/vnet/outputs.tf.liquid`,
      "/infrastructure/modules/vnet",
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
    this.createFile(
      "outputs.tf",
      `${process.cwd()}/dist/templates/azure/modules/acr/outputs.tf.liquid`,
      "/infrastructure/modules/acr",
      true
    );
  }

  // async createAIFoundry(): Promise<void> {
  //   this.createFile(
  //     "main.tf",
  //     `${process.cwd()}/dist/templates/azure/modules/ai_foundry/main.tf.liquid`,
  //     "/infrastructure/modules/ai_foundry",
  //     true
  //   );
  //   this.createFile(
  //     "variables.tf",
  //     `${process.cwd()}/dist/templates/azure/modules/ai_foundry/variables.tf.liquid`,
  //     "/infrastructure/modules/ai_foundry",
  //     true
  //   );
  //   this.createFile(
  //     "outputs.tf",
  //     `${process.cwd()}/dist/templates/azure/modules/ai_foundry/outputs.tf.liquid`,
  //     "/infrastructure/modules/ai_foundry",
  //     true
  //   );
  // }

  async createApplicationGateway(): Promise<void> {
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/azure/modules/application_gateway/main.tf.liquid`,
      "/infrastructure/modules/application_gateway",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/azure/modules/application_gateway/variables.tf.liquid`,
      "/infrastructure/modules/application_gateway",
      true
    );
    this.createFile(
      "outputs.tf",
      `${process.cwd()}/dist/templates/azure/modules/application_gateway/outputs.tf.liquid`,
      "/infrastructure/modules/application_gateway",
      true
    );
  }

  async createBastion(): Promise<void> {
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/azure/modules/bastion/main.tf.liquid`,
      "/infrastructure/modules/bastion",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/azure/modules/bastion/variables.tf.liquid`,
      "/infrastructure/modules/bastion",
      true
    );
    this.createFile(
      "ssh.tf",
      `${process.cwd()}/dist/templates/azure/modules/bastion/ssh.tf.liquid`,
      "/infrastructure/modules/bastion",
      true
    );
    this.createFile(
      "outputs.tf",
      `${process.cwd()}/dist/templates/azure/modules/bastion/outputs.tf.liquid`,
      "/infrastructure/modules/bastion",
      true
    );
  }

  async createKeyVault(): Promise<void> {
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/azure/modules/key_vault/main.tf.liquid`,
      "/infrastructure/modules/key_vault",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/azure/modules/key_vault/variables.tf.liquid`,
      "/infrastructure/modules/key_vault",
      true
    );
    this.createFile(
      "outputs.tf",
      `${process.cwd()}/dist/templates/azure/modules/key_vault/outputs.tf.liquid`,
      "/infrastructure/modules/key_vault",
      true
    );
  }

  async createSecurityGroups(): Promise<void> {
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/azure/modules/security_groups/main.tf.liquid`,
      "/infrastructure/modules/security_groups",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/azure/modules/security_groups/variables.tf.liquid`,
      "/infrastructure/modules/security_groups",
      true
    );
    this.createFile(
      "outputs.tf",
      `${process.cwd()}/dist/templates/azure/modules/security_groups/outputs.tf.liquid`,
      "/infrastructure/modules/security_groups",
      true
    );
  }

  async createSqlServer(): Promise<void> {
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/azure/modules/sql_server/main.tf.liquid`,
      "/infrastructure/modules/sql_server",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/azure/modules/sql_server/variables.tf.liquid`,
      "/infrastructure/modules/sql_server",
      true
    );
    this.createFile(
      "outputs.tf",
      `${process.cwd()}/dist/templates/azure/modules/sql_server/outputs.tf.liquid`,
      "/infrastructure/modules/sql_server",
      true
    );
  }

  // async createVpnGateway(): Promise<void> {
  //   this.createFile(
  //     "main.tf",
  //     `${process.cwd()}/dist/templates/azure/modules/vpn_gateway/main.tf.liquid`,
  //     "/infrastructure/modules/vpn_gateway",
  //     true
  //   );
  //   this.createFile(
  //     "variables.tf",
  //     `${process.cwd()}/dist/templates/azure/modules/vpn_gateway/variables.tf.liquid`,
  //     "/infrastructure/modules/vpn_gateway",
  //     true
  //   );
  //   this.createFile(
  //     "outputs.tf",
  //     `${process.cwd()}/dist/templates/azure/modules/vpn_gateway/outputs.tf.liquid`,
  //     "/infrastructure/modules/vpn_gateway",
  //     true
  //   );
  // }

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

  async createAKS(path?: string): Promise<void> {
    this.createFile(
      "main.tf",
      `${path}/dist/templates/azure/modules/kubernetes/aks/main.tf.liquid`,
      "/infrastructure/modules/kubernetes/aks",
      true
    );
    this.createFile(
      "variables.tf",
      `${path}/dist/templates/azure/modules/kubernetes/aks/variables.tf.liquid`,
      "/infrastructure/modules/kubernetes/aks",
      true
    );
    this.createFile(
      "main.tf",
      `${path}/dist/templates/azure/modules/kubernetes/common/main.tf.liquid`,
      "/infrastructure/modules/kubernetes/common",
      true
    );
    this.createFile(
      "variables.tf",
      `${path}/dist/templates/azure/modules/kubernetes/common/variables.tf.liquid`,
      "/infrastructure/modules/kubernetes/common",
      true
    );
  }

  async createSQLDatabase(path?: string): Promise<void> {
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

  async startSSHProcess() {
    // Azure specific SSH process if needed
    AppLogger.debug("Starting SSH process for Azure");
  }

  async stopSSHProcess() {
    // Azure specific SSH process cleanup if needed
    AppLogger.debug("Stopping SSH process for Azure");
  }

  async getCreds(profileName: string) {
    const AzureProfile = (await import("./azure-profile.js")).default;
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
    projectName: string
  ): Promise<void> {
    const progressBar = ProgressBar.createProgressBar();
    try {
      AppLogger.info(`Initializing Terraform...`, true);
      progressBar.start(100, 0, {
        message: "Initializing Terraform backend for Azure...",
      });

      const terraform = spawn(
        "terraform",
        ["init", `-backend-config=${backend}`],
        {
          cwd: projectPath,
          stdio: "pipe",
        }
      );

      let output = "";
      let errorOutput = "";

      terraform.stdout.on("data", (data) => {
        const dataStr = data.toString();
        output += dataStr;
        AppLogger.debug(dataStr);

        // Update progress based on keywords
        const progressUpdates = [
          {
            keyword: "Initializing modules",
            progress: 25,
            message: "Initializing modules...",
          },
          {
            keyword: "Initializing provider plugins",
            progress: 50,
            message: "Initializing provider plugins...",
          },
          {
            keyword: "Configuring backend",
            progress: 75,
            message: "Configuring backend...",
          },
          {
            keyword: "Terraform has been successfully initialized!",
            progress: 100,
            message: "Initialization complete",
          },
        ];

        for (const { keyword, progress, message } of progressUpdates) {
          if (dataStr.includes(keyword)) {
            progressBar.update(progress, { message });
            break;
          }
        }
      });

      terraform.stderr.on("data", (data) => {
        const dataStr = data.toString();
        errorOutput += dataStr;
        AppLogger.debug(dataStr);
      });

      await new Promise<void>((resolve, reject) => {
        terraform.on("close", (code) => {
          progressBar.stop();
          if (code === 0) {
            AppLogger.info(
              "Terraform initialization completed successfully",
              true
            );
            resolve();
          } else {
            AppLogger.error(
              `Terraform initialization failed with code ${code}`,
              true
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
    varFile?: string
  ): Promise<void> {
    AppLogger.debug(`Running terraform apply in path: ${projectPath}`);
    const projectConfig = SystemConfig.getInstance().getConfig();
    return new Promise((resolve, reject) => {
      try {
        AppLogger.info(`Creating module: ${module}`, true);

        let args = ["apply", "-no-color", "-auto-approve"];
        if (
          (module && module && projectConfig.command === "new") ||
          (module && projectConfig.command === "resume")
        ) {
          args.push(`-target=${module}`);
        }
        if (projectConfig.command === "module") {
          args.push(`-target=module.${module}`);
        }

        if (varFile) {
          args.push(`-var-file=${varFile}`);
        }

        const terraformProcess = spawn("terraform", args, {
          cwd: projectPath,
          env: process.env,
          stdio: ["inherit", "pipe", "pipe"],
        });

        const totalSteps = 100;
        const progressBar = ProgressBar.createProgressBar();
        progressBar.start(totalSteps, 0, {
          message: "Terraform apply in progress...",
        });

        terraformProcess.stdout.on("data", (data) => {
          const output = data.toString();
          AppLogger.info(`stdout: ${output}`);
          const creationCompleteRegex =
            /Creation complete after \d+s \[id=.*\]/g;
          let match;
          while ((match = creationCompleteRegex.exec(output)) !== null) {
            progressBar.increment(totalSteps / totalSteps); // Adjust as per your progress tracking
          }
        });

        terraformProcess.stderr.on("data", (data) => {
          const errorOutput = data.toString();
          progressBar.stop();
          AppLogger.error(`stderr: ${errorOutput}`);
          // Reject the promise on stderr output
          reject(new Error(`Terraform apply error: ${errorOutput}`));
        });

        terraformProcess.on("close", (code) => {
          if (code === 0) {
            progressBar.update(100, { message: "Terraform apply completed." });
            progressBar.stop();
            AppLogger.debug("Terraform apply completed successfully.", true);
            resolve();
          } else {
            progressBar.stop();
            AppLogger.error(
              `Terraform apply process exited with code ${code}`,
              true
            );
            reject(
              new Error(`Terraform apply process exited with code ${code}`)
            );
            setImmediate(() => process.exit(1));
          }
        });

        terraformProcess.on("error", (err) => {
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
    varFile?: string
  ): Promise<void> {
    const progressBar = ProgressBar.createProgressBar();
    try {
      let command = "terraform destroy -auto-approve";

      if (module) {
        command += ` -target=${module}`;
      }

      if (varFile) {
        command += ` -var-file=${varFile}`;
      }

      AppLogger.info(`Running Terraform destroy in ${projectPath}`, true);
      progressBar.start(100, 0, {
        message: "Destroying Terraform resources in Azure...",
      });

      await executeCommandWithRetry(
        command,
        { cwd: projectPath, stdio: "inherit" },
        3
      );

      progressBar.update(100, { message: "Terraform destroy completed." });
      progressBar.stop();
      AppLogger.info("Terraform destroy completed successfully", true);
    } catch (error) {
      progressBar.stop();
      AppLogger.error(`Error during Terraform destroy: ${error}`, true);
      throw error;
    }
  }

  // async runTerraformDestroyTemplate(
  //   infrastructureFilePath: string,
  //   varFile?: string
  // ): Promise<void> {
  //   AppLogger.info(
  //     `Running terraform destroy... in ${infrastructureFilePath}`
  //   );
  //   let awsStatus = false;
  //   if (this.config.cloud_provider === "aws") {
  //     awsStatus = true;
  //   }
  //   try {
  //     let command = `terraform destroy  -auto-approve`;
  //     if (varFile) {
  //       command += ` -var-file=${varFile}`;
  //     }
  //     await executeCommandWithRetry(
  //       command,
  //       { cwd: infrastructureFilePath, stdio: "inherit" },
  //       3
  //     );
  //     AppLogger.info("Terraform destroy completed successfully.", true);
  //   } catch (error) {
  //     AppLogger.error(`Failed to destroy terraform process: ${error}`, true);
  //     process.exit(1);
  //   }
  //   const deleted = await AzureTerraformBackend.delete(
  //     this,
  //     this.config.project_name,
  //     this.config.azure_location,
  //     this.config.azure_client_id,
  //     this.config.azure_client_secret,
  //     this.config.azure_tenant_id,
  //     this.config.azure_subscription_id
  //   );
  //   if (deleted) {
  //     await this.deleteFolder(this.config.project_name);
  //   }
  // }

  async runTerraformDestroyTemplate(
    infrastructureFilePath: string,
    varFile?: string,
    status?: any
  ): Promise<void> {
    try {
      if (azure_destroy_modules && azure_destroy_modules.length > 0) {
        for (const module of azure_destroy_modules) {
          if (
            status.modules[module] === "fail" ||
            status.modules[module] === "success"
          ) {
            const args = [
              "destroy",
              "-no-color",
              "-auto-approve",
              `-target=${module}`,
            ];
            if (varFile) {
              args.push(`-var-file=${varFile}`);
            }

            AppLogger.info(`Destroying module: ${module}`, true);

            const terraformProcess = spawn("terraform", args, {
              cwd: infrastructureFilePath,
              env: process.env,
              stdio: ["inherit", "pipe", "pipe"],
            });

            const progressBar = ProgressBar.createProgressBar();
            progressBar.start(100, 0, {
              message: `Destroying module: ${module}...`,
            });

            let deletedResources = 0;
            let totalExpectedDeletes = 10; // Default fallback, can be tuned dynamically if needed

            terraformProcess.stdout.on("data", (data) => {
              const output = data.toString();
              AppLogger.info(`stdout: ${output}`);

              // Optional: dynamically adjust expected total based on actual output (advanced tuning)
              const totalMatch = output.match(/Plan: (\d+) to destroy/);
              if (totalMatch && totalMatch[1]) {
                totalExpectedDeletes = parseInt(totalMatch[1], 10);
              }

              const destructionRegex = /Destruction complete after \d+s/g;
              const matches = output.match(destructionRegex) || [];

              deletedResources += matches.length;

              const progress = Math.min(
                Math.floor((deletedResources / totalExpectedDeletes) * 100),
                100
              );

              progressBar.update(progress);
            });

            terraformProcess.stderr.on("data", (data) => {
              progressBar.stop();
              AppLogger.error(`stderr: ${data.toString()}`);
            });

            await new Promise<void>((resolve, reject) => {
              terraformProcess.on("close", (code) => {
                if (code === 0) {
                  progressBar.update(100, {
                    message: `Module ${module} destroyed.`,
                  });
                  progressBar.stop();
                  resolve();
                } else {
                  progressBar.stop();
                  AppLogger.error(
                    `Terraform destroy failed for module ${module} with code ${code}`
                  );
                  reject(
                    new Error(
                      `Terraform destroy failed for module ${module} with code ${code}`
                    )
                  );
                }
              });

              terraformProcess.on("error", (err) => {
                progressBar.stop();
                AppLogger.error(
                  `Failed to run Terraform destroy for ${module}: ${err}`
                );
                reject(err);
              });
            });
          }
        }

        AppLogger.info("All modules destroyed successfully.", true);
      }
    } catch (error) {
      AppLogger.error(`Error during Terraform destroy: ${error}`, true);
      throw error;
    }

    const deleted = await AzureTerraformBackend.delete(
      this,
      this.config.project_name,
      this.config.azure_location,
      this.config.azure_client_id,
      this.config.azure_client_secret,
      this.config.azure_tenant_id,
      this.config.azure_subscription_id
    );
    if (deleted) {
      await this.deleteFolder(this.config.project_name);
    }
  }

  async editKubeConfigFile(newClusterConfigPath: string): Promise<void> {
    try {
      const homeDir = os.homedir();
      const kubeConfigPath = join(homeDir, ".kube", "config");

      if (fs.existsSync(newClusterConfigPath)) {
        const newConfig = fs.readFileSync(newClusterConfigPath, "utf8");
        const newConfigObj = jsyaml.load(newConfig) as any;

        let existingConfigObj: any = { clusters: [], contexts: [], users: [] };

        if (fs.existsSync(kubeConfigPath)) {
          const existingConfig = fs.readFileSync(kubeConfigPath, "utf8");
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

        existingConfigObj["current-context"] = newConfigObj["current-context"];

        const mergedConfig = jsyaml.dump(existingConfigObj);
        fs.writeFileSync(kubeConfigPath, mergedConfig);

        AppLogger.info("Azure AKS kubeconfig merged successfully", true);
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
        encoding: "utf8",
      });
      AppLogger.debug(result);
    } catch (error) {
      AppLogger.error(`Error running Ansible playbook: ${error}`, true);
    }
  }
}
