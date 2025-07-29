import BaseProject from "../base-project.js";
import { CloudProject } from "../interfaces/cloud-project.js";
import AWSTerraformBackend from "./aws-tf-backend.js";
import AWSPolicies from "./aws-iam.js";
import { spawn, execSync } from "child_process";
import fs from "fs";
import * as jsyaml from "js-yaml";
import * as os from "os";
import { AppLogger } from "../../logger/appLogger.js";
import { ProgressBar } from "../../logger/progressLogger.js";
import CreateApplication from "../setup-application.js";
import BaseCommand from "../../commands/base.js";
import { executeCommandWithRetry } from "../utils/executeCommandWithRetry-utils.js";
import { updateStatusFile } from "../utils/statusUpdater-utils.js";
import { join } from "path";
import SystemConfig from "../../config/system.js";

let sshProcess: any;

export default class AWSProject extends BaseProject implements CloudProject {
  async createProject(
    name: string,
    path: string,
    commandName?: string
  ): Promise<void> {
    if (this.config.command === "new") {
      await super.createProject(name, path);
    }

    if (
      (!this.config.moduleType && this.config.command !== "create") ||
      (this.config.moduleType && this.config.moduleType.length > 1)
    ) {
      await AWSPolicies.create(
        this,
        this.config.aws_region,
        this.config.aws_access_key_id,
        this.config.aws_secret_access_key,
        this.config.project_name
      );
    }

    await AWSTerraformBackend.create(
      this,
      this.config.project_id,
      this.config.aws_region,
      this.config.aws_access_key_id,
      this.config.aws_secret_access_key
    );
  }

  async destroyProject(name: string, path: string): Promise<void> {
    let awsStatus = false;
    if (this.config.cloud_provider === "aws") {
      awsStatus = true;
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

        if (awsStatus) {
          await super.destroyProject(name, path);
        }
      }

      const status = await AWSPolicies.delete(
        this,
        this.config.aws_region,
        this.config.aws_access_key_id,
        this.config.aws_secret_access_key
      );

      if (status) {
        awsStatus = await AWSTerraformBackend.delete(
          this,
          this.config.project_id,
          this.config.aws_region,
          this.config.aws_access_key_id,
          this.config.aws_secret_access_key
        );

        await this.deleteFolder(this.config.project_name);
      }
    }
  }

  async createCommon(path?: string): Promise<void> {
    this.createVpc(path);
    this.createACM(path);
    this.createRoute53();
    this.createECR();
    this.createIngressController();
    this.createRds(path);
    this.createEnvironment();
  }

  async createVpc(path?: string): Promise<void> {
    this.createFile(
      "main.tf",
      `${path}/dist/templates/aws/modules/vpc/main.tf.liquid`,
      "/infrastructure/modules/vpc",
      true
    );
    this.createFile(
      "variables.tf",
      `${path}/dist/templates/aws/modules/vpc/variables.tf.liquid`,
      "/infrastructure/modules/vpc",
      true
    );
  }

  async createEKS(path?: string): Promise<void> {
    this.createFile(
      "main.tf",
      `${path}/dist/templates/aws/modules/eks-fargate/main.tf.liquid`,
      "/infrastructure/modules/eks-fargate",
      true
    );
    this.createFile(
      "variables.tf",
      `${path}/dist/templates/aws/modules/eks-fargate/variables.tf.liquid`,
      "/infrastructure/modules/eks-fargate",
      true
    );
  }

  async createRds(path?: string): Promise<void> {
    this.createFile(
      "main.tf",
      `${path}/dist/templates/aws/modules/rds/main.tf.liquid`,
      "/infrastructure/modules/rds",
      true
    );
    this.createFile(
      "variables.tf",
      `${path}/dist/templates/aws/modules/rds/variables.tf.liquid`,
      "/infrastructure/modules/rds",
      true
    );
  }

  async createRoute53(): Promise<void> {
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/aws/modules/route53/main.tf.liquid`,
      "/infrastructure/modules/route53",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/aws/modules/route53/variables.tf.liquid`,
      "/infrastructure/modules/route53",
      true
    );
  }

  async createIngressController(): Promise<void> {
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/aws/modules/ingress-controller/main.tf.liquid`,
      "/infrastructure/modules/ingress-controller",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/aws/modules/ingress-controller/variables.tf.liquid`,
      "/infrastructure/modules/ingress-controller",
      true
    );
  }

  async createACM(path?: string): Promise<void> {
    this.createFile(
      "main.tf",
      `${path}/dist/templates/aws/modules/acm/main.tf.liquid`,
      "/infrastructure/modules/acm",
      true
    );
    this.createFile(
      "variables.tf",
      `${path}/dist/templates/aws/modules/acm/variables.tf.liquid`,
      "/infrastructure/modules/acm",
      true
    );
  }

  async createEnvironment(): Promise<void> {
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/aws/modules/environment/main.tf.liquid`,
      "/infrastructure/modules/environment",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/aws/modules/environment/variables.tf.liquid`,
      "/infrastructure/modules/environment",
      true
    );
    this.createFile(
      "argocd-app.yaml",
      `${process.cwd()}/dist/templates/aws/modules/environment/argocd-app.yaml.liquid`,
      "/infrastructure",
      true
    );
  }
  async createECR(): Promise<void> {
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/aws/modules/ecr/main.tf.liquid`,
      "/infrastructure/modules/ecr",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/aws/modules/ecr/variables.tf.liquid`,
      "/infrastructure/modules/ecr",
      true
    );
  }
  // Function to start the SSH process in the background
  async startSSHProcess() {
    const proxyName =
      this.config.project_name + "-" + this.config.environment + "-proxy";
    sshProcess = spawn("ssh", ["-D", "8002", "-N", `${proxyName}`], {
      detached: true,
      stdio: "ignore",
    });

    sshProcess.unref();
    AppLogger.debug("SSH process started in the background.");
  }

  async stopSSHProcess() {
    if (sshProcess) {
      sshProcess.kill();
      AppLogger.debug("SSH process stopped.");
    } else {
      AppLogger.debug("No SSH process is running.");
    }
  }

  async AWSProfileActivate(profileName: string) {
    process.env.AWS_PROFILE = profileName;
    AppLogger.info("AWS profile activated successfully.", true);
  }

  async runTerraformInit(
    projectPath: string,
    backend: string,
    projectName: string
  ): Promise<void> {
    AppLogger.info(`Running terraform init...`, true);
    const progressBar = ProgressBar.createProgressBar();
    progressBar.start(100, 0, { message: "Terraform Init in progress..." });

    return new Promise<void>((resolve, reject) => {
      try {
        const terraformProcess = spawn(
          "terraform",
          ["init", `-backend-config=${backend}`],
          {
            cwd: projectPath,
            env: process.env,
            stdio: ["ignore", "pipe", "pipe"],
          }
        );
        terraformProcess.stdout.on("data", (data) => {
          const output = data.toString();
          AppLogger.debug(output);

          const progressUpdates = [
            {
              keyword: "Initializing modules",
              progress: 12.5,
              message: "Initializing modules...",
            },
            {
              keyword: "Downloading registry",
              progress: 25,
              message: "Downloading modules...",
            },
            {
              keyword: "Initializing provider plugins",
              progress: 37.5,
              message: "Initializing provider plugins...",
            },
            {
              keyword: "Finding",
              progress: 50,
              message: "Finding provider versions...",
            },
            {
              keyword: "Installing",
              progress: 62.5,
              message: "Installing provider plugins...",
            },
            {
              keyword: "Configuring backend",
              progress: 75,
              message: "Configuring backend...",
            },
            {
              keyword: "Initializing backend",
              progress: 87.5,
              message: "Initializing backend...",
            },
            {
              keyword: "Terraform has been successfully initialized!",
              progress: 100,
              message: "Initialization complete",
            },
          ];

          for (const { keyword, progress, message } of progressUpdates) {
            if (output.includes(keyword)) {
              progressBar.update(progress, { message });
              break;
            }
          }
        });

        terraformProcess.stderr.on("data", (data) => {
          AppLogger.error(`Error: ${data}`);
          progressBar.stop(); // Close progress bar on error
          reject(new Error(data.toString())); // Reject promise on error
        });

        terraformProcess.on("close", async (code) => {
          progressBar.stop(); // Ensure the progress bar is always stopped
          if (code === 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            AppLogger.debug("Terraform init completed successfully.");
            updateStatusFile(projectName, "terraform-init", "success");
            resolve(); // Resolve promise on successful completion
          } else {
            AppLogger.error(
              `Failed to initialize terraform process. Exit code: ${code}`,
              true
            );
            updateStatusFile(projectName, "terraform-init", "fail");
            reject(new Error(`Terraform init failed with exit code ${code}`)); // Reject promise on error
            setImmediate(() => process.exit(1));
          }
        });
      } catch (error: any) {
        progressBar.stop(); // Close progress bar on error
        AppLogger.error(
          `Failed to initialize terraform process: ${error.message}`,
          true
        );
        reject(error); // Reject promise on error
      }
    });
  }

  async getMasterIp(projectPath: string): Promise<string> {
    try {
      const output = execSync("terraform output -json master_ip", {
        cwd: projectPath,
        env: process.env,
      });
      AppLogger.debug(output.toString());
      const masterIp = JSON.parse(output.toString());
      return masterIp;
    } catch (error) {
      AppLogger.error(`Failed to get master IP: ${error}`, true);
      return "";
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
    AppLogger.info(`Running terraform destroy... in ${projectPath}`);

    return new Promise((resolve, reject) => {
      try {
        const moduleInfo = module
          ? `Destroying module ${module}...`
          : "Destroying entire project...";
        AppLogger.info(moduleInfo, true);

        const args = ["destroy", "-no-color", "-auto-approve"];
        if (module) args.push(`-target=${module}`);
        if (varFile) args.push(`-var-file=${varFile}`);

        const terraformProcess = spawn("terraform", args, {
          cwd: projectPath,
          env: process.env,
          stdio: ["inherit", "pipe", "pipe"],
        });

        const totalSteps = 100;
        const progressBar = ProgressBar.createProgressBar();
        progressBar.start(totalSteps, 0, {
          message: "Terraform destroy in progress...",
        });

        terraformProcess.stdout.on("data", (data) => {
          const output = data.toString();
          AppLogger.info(`stdout: ${output}`);

          // Increment the progress bar when a destruction completes
          const destructionCompleteRegex = /Destruction complete after \d+s/g;
          let match;
          while ((match = destructionCompleteRegex.exec(output)) !== null) {
            progressBar.increment(totalSteps / totalSteps);
          }
        });

        terraformProcess.stderr.on("data", (data) => {
          const errorOutput = data.toString();
          progressBar.stop();
          AppLogger.error(`stderr: ${errorOutput}`);
          reject(new Error(`Terraform destroy error: ${errorOutput}`));
        });

        terraformProcess.on("close", (code) => {
          if (code === 0) {
            progressBar.update(100, {
              message: "Terraform destroy completed.",
            });
            progressBar.stop();
            AppLogger.debug("Terraform destroy completed successfully.", true);
            resolve();
          } else {
            progressBar.stop();
            AppLogger.error(
              `Terraform destroy process exited with code ${code}`,
              true
            );
            reject(
              new Error(`Terraform destroy process exited with code ${code}`)
            );
            setImmediate(() => process.exit(1));
          }
        });

        terraformProcess.on("error", (err) => {
          progressBar.stop();
          AppLogger.error(`Failed to run Terraform destroy: ${err}`, true);
          reject(err);
        });
      } catch (error) {
        AppLogger.error(`Failed to destroy terraform process: ${error}`, true);
        reject(error);
      }
    });
  }

  async runTerraformDestroyTemplate(
    projectPath: string,
    varFile?: string
  ): Promise<void> {
    AppLogger.info(`Running terraform destroy... in ${projectPath}`);
    let awsStatus = false;
    if (this.config.cloud_provider === "aws") {
      awsStatus = true;
    }
    try {
      let command = `terraform destroy  -auto-approve`;
      if (varFile) {
        command += ` -var-file=${varFile}`;
      }
      await executeCommandWithRetry(
        command,
        { cwd: projectPath, stdio: "inherit" },
        3
      );
      AppLogger.info("Terraform destroy completed successfully.", true);
    } catch (error) {
      AppLogger.error(`Failed to destroy terraform process: ${error}`, true);
      process.exit(1);
    }

    if (
      (!this.config.moduleType ||
        (this.config.moduleType && this.config.moduleType.length > 1)) &&
      this.config.command !== "create"
    ) {
      const status = await AWSPolicies.delete(
        this,
        this.config.aws_region,
        this.config.aws_access_key_id,
        this.config.aws_secret_access_key
      );
    }

    awsStatus = await AWSTerraformBackend.delete(
      this,
      this.config.project_id,
      this.config.aws_region,
      this.config.aws_access_key_id,
      this.config.aws_secret_access_key
    );

    await this.deleteFolder(this.projectPath);
  }

  async editKubeConfigFile(newClusterConfigPath: string): Promise<void> {
    // Path to the existing kubeconfig file
    const kubeconfigDir = join(os.homedir(), ".kube");
    const kubeconfigFilePath = join(kubeconfigDir, "config");

    // Ensure the .kube directory exists
    if (!fs.existsSync(kubeconfigDir)) {
      fs.mkdirSync(kubeconfigDir);
    }

    let kubeconfig: any;

    // Check if the kubeconfig file exists
    if (fs.existsSync(kubeconfigFilePath)) {
      // Read the existing kubeconfig file
      const existingKubeconfig = fs.readFileSync(kubeconfigFilePath, "utf8");
      // Parse the YAML content
      kubeconfig = jsyaml.load(existingKubeconfig);
    } else {
      // Initialize an empty kubeconfig structure if the file doesn't exist
      kubeconfig = {
        apiVersion: "v1",
        kind: "Config",
        clusters: [],
        users: [],
        contexts: [],
        "current-context": "",
      };
    }

    // Read the new cluster configuration from the file
    const newClusterConfigContent = fs.readFileSync(
      newClusterConfigPath,
      "utf8"
    );
    const newClusterConfig: any = jsyaml.load(newClusterConfigContent);
    AppLogger.debug(`New cluster config: ${newClusterConfig}`);
    // Extract cluster information from the existing kubeconfig
    const clusters = kubeconfig.clusters;
    const users = kubeconfig.users;
    const contexts = kubeconfig.contexts;

    // Define the new cluster configuration
    const newCluster = {
      cluster: {
        "certificate-authority-data":
          newClusterConfig.clusters[0].cluster["certificate-authority-data"] ||
          "",
        "proxy-url": "socks5://localhost:8002",
        server: newClusterConfig.clusters[0].cluster["server"] || "",
      },
      name: `${this.config.project_name}-${this.config.environment}-cluster`,
    };

    // Define the user information for the new cluster
    const newUser = {
      name: `${this.config.project_name}-${this.config.environment}-user`,
      user: {
        "client-certificate-data":
          newClusterConfig.users[0].user["client-certificate-data"],
        "client-key-data": newClusterConfig.users[0].user["client-key-data"],
      },
    };

    // Add the new cluster and user to the kubeconfig
    kubeconfig.clusters.push(newCluster);
    kubeconfig.users.push(newUser);

    // Set the current context to the new cluster
    const newContext = {
      context: {
        cluster: newCluster.name,
        user: newUser.name,
      },
      name: `${this.config.project_name}-${this.config.environment}-user@${this.config.project_name}-${this.config.environment}-cluster`,
    };

    // Add the new context to the kubeconfig
    kubeconfig.contexts.push(newContext);

    // Set the current-context to the new context
    kubeconfig["current-context"] = newContext.name;

    // Serialize the modified YAML content
    const newKubeconfigYaml = jsyaml.dump(kubeconfig);

    // Write the updated YAML content back to the kubeconfig file
    fs.writeFileSync(kubeconfigFilePath, newKubeconfigYaml, "utf8");

    AppLogger.debug("New cluster added to the kubeconfig file.");
  }

  async runAnsiblePlaybook(playbook: string, projectPath: string) {
    const maxRetries = 6;
    const timeoutDuration = 10 * 60 * 1000; // 10 minutes
    let attempt = 0;
    let success = false;

    while (attempt < maxRetries && !success) {
      attempt++;
      try {
        AppLogger.error(
          `Running ansible playbook ${playbook}... Attempt ${attempt}`,
          true
        );

        let lastLogTimestamp = Date.now();
        const interval = setInterval(() => {
          if (Date.now() - lastLogTimestamp > timeoutDuration) {
            AppLogger.error(
              `No logs detected for ${
                timeoutDuration / 60000
              } minutes. Retrying playbook...`,
              true
            );
            clearInterval(interval);
            throw new Error("Inactivity timeout reached");
          }
        }, 10000);

        const output = execSync(
          `ansible-playbook -v ../playbooks/${playbook}`,
          {
            cwd: `${projectPath}/templates/aws/ansible/environments`,
            env: process.env,
            stdio: "inherit",
          }
        );

        // Monitor logs
        output
          .toString()
          .split("\n")
          .forEach((line) => {
            if (line.trim()) {
              lastLogTimestamp = Date.now();
              process.stdout.write(line + "\n");
            }
          });

        clearInterval(interval);
        AppLogger.info(`Playbook ${playbook} completed successfully.`, true);
        success = true;
      } catch (error: any) {
        AppLogger.error(
          `An error occurred while running ${playbook}: ${error.message}`,
          true
        );
        if (attempt >= maxRetries) {
          AppLogger.error("Max retries reached. Exiting...", true);
          process.exit(1);
        }
        AppLogger.info(
          `Retrying playbook ${playbook}... (${attempt}/${maxRetries})`
        );
      }
    }
  }
}
