import BaseProject from '../base-project.js';
import AWSTerraformBackend from "./aws-tf-backend.js";
import AWSPolicies from "./aws-iam.js";
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import * as path from 'path';
import * as jsyaml from 'js-yaml';
import * as os from 'os';
import { AppLogger } from '../../logger/appLogger.js';
import { ProgressBar } from '../../logger/progressLogger.js';
import CreateApplication from '../setup-application.js';
import BaseCommand from '../../commands/base.js';
import { executeCommandWithRetry } from '../common-functions/execCommands.js';

let sshProcess: any;

export default class AWSProject extends BaseProject {
    async createProject(name: string, path: string): Promise<void> {
        await super.createProject(name, path);
    
        if (!this.config.dryrun) {
            await AWSPolicies.create(
                this,
                this.config.aws_region,
                this.config.aws_access_key_id,
                this.config.aws_secret_access_key
                );
        
            await AWSTerraformBackend.create(
                this,
                this.config.project_id,
                this.config.aws_region,
                this.config.aws_access_key_id,
                this.config.aws_secret_access_key
            );
        }
    }

    async destroyProject(name: string, path: string): Promise<void> {
        let awsStatus = false;
        if (this.config.cloud_provider === 'aws') {
            awsStatus = true;
        }
        let command: BaseCommand | undefined;
        const createApplication = new CreateApplication(command as BaseCommand, this.config)
        if (!this.config.dryrun) {
            // Once the prompts are accepted at the start, these parameters will be accessible
            const  {git_user_name, github_access_token, github_owner, project_name} = this.config;
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
            
            if (awsStatus) {
                await super.destroyProject(name, path);
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
            }
        }
    }

    async createCommon(): Promise<void> {
        this.createVpc();
        this.createACM();
        this.createRoute53();
        this.createECR();
        this.createIngressController();
        this.createEnvironment();
    }

    async createVpc(): Promise<void> {
        this.createFile('main.tf', '../templates/aws/modules/vpc/main.tf.liquid', '/infrastructure/modules/vpc');
        this.createFile('variables.tf', '../templates/aws/modules/vpc/variables.tf.liquid', '/infrastructure/modules/vpc');
    }
    
    async createRoute53(): Promise<void> {
        this.createFile('main.tf', '../templates/aws/modules/route53/main.tf.liquid', '/infrastructure/modules/route53');
        this.createFile('variables.tf', '../templates/aws/modules/route53/variables.tf.liquid', '/infrastructure/modules/route53');
    }

    async createIngressController(): Promise<void> {
        this.createFile('main.tf', '../templates/aws/modules/ingress-controller/main.tf.liquid', '/infrastructure/modules/ingress-controller');
        this.createFile('variables.tf', '../templates/aws/modules/ingress-controller/variables.tf.liquid', '/infrastructure/modules/ingress-controller');
    }

    async createACM(): Promise<void> {
        this.createFile('main.tf', '../templates/aws/modules/acm/main.tf.liquid', '/infrastructure/modules/acm');
        this.createFile('variables.tf', '../templates/aws/modules/acm/variables.tf.liquid', '/infrastructure/modules/acm');
    }

    async createEnvironment(): Promise<void> {
        this.createFile('main.tf', '../templates/aws/modules/environment/main.tf.liquid', '/infrastructure/modules/environment');
        this.createFile('variables.tf', '../templates/aws/modules/environment/variables.tf.liquid', '/infrastructure/modules/environment');
        this.createFile('argocd-app.yaml', '../templates/aws/modules/environment/argocd-app.yaml.liquid', '/infrastructure');
    }
    async createECR(): Promise<void> {
        this.createFile('main.tf', '../templates/aws/modules/ecr/main.tf.liquid', '/infrastructure/modules/ecr');
        this.createFile('variables.tf', '../templates/aws/modules/ecr/variables.tf.liquid', '/infrastructure/modules/ecr');
    }
    // Function to start the SSH process in the background
    async startSSHProcess() {
        const proxyName = this.config.project_name + '-' + this.config.environment + '-proxy';
        sshProcess = spawn('ssh', ['-D', '8002', '-N', `${proxyName}`], {
            detached: true,
            stdio: 'ignore'
        });

        sshProcess.unref();
        AppLogger.debug('SSH process started in the background.');
    }

    async stopSSHProcess() {
        if (sshProcess) {
            sshProcess.kill();
            AppLogger.debug('SSH process stopped.');
        } else {
            AppLogger.debug('No SSH process is running.');
        }
    }

    async AWSProfileActivate(profileName: string) {
        process.env.AWS_PROFILE = profileName;
        AppLogger.info('AWS profile activated successfully.', true);
    }

    async runTerraformInit(projectPath: string, backend: string): Promise<void> {
        AppLogger.debug(`Running terraform init..., ${projectPath}`, true);
    
        const progressBar = ProgressBar.createProgressBar();
        progressBar.start(100, 0, { message: 'Terraform Init in progress...' });
    
        return new Promise<void>((resolve, reject) => {
            try {
                const terraformProcess = spawn('terraform', ['init', `-backend-config=${backend}`], {
                    cwd: projectPath,
                    env: process.env,
                    stdio: ['ignore', 'pipe', 'pipe']
                });

                terraformProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    AppLogger.debug(output);
                
                    const progressUpdates = [
                        { keyword: 'Initializing modules', progress: 12.5, message: 'Initializing modules...' },
                        { keyword: 'Downloading registry', progress: 25, message: 'Downloading modules...' },
                        { keyword: 'Initializing provider plugins', progress: 37.5, message: 'Initializing provider plugins...' },
                        { keyword: 'Finding', progress: 50, message: 'Finding provider versions...' },
                        { keyword: 'Installing', progress: 62.5, message: 'Installing provider plugins...' },
                        { keyword: 'Configuring backend', progress: 75, message: 'Configuring backend...' },
                        { keyword: 'Initializing backend', progress: 87.5, message: 'Initializing backend...' },
                        { keyword: 'Terraform has been successfully initialized!', progress: 100, message: 'Initialization complete' },
                    ];
                
                    for (const { keyword, progress, message } of progressUpdates) {
                        if (output.includes(keyword)) {
                            progressBar.update(progress, { message });
                            break;
                        }
                    }
                });
                
                terraformProcess.stderr.on('data', (data) => {
                    AppLogger.error(`Error: ${data}`);
                    progressBar.stop(); // Close progress bar on error
                    reject(new Error(data.toString())); // Reject promise on error
                });
    
                terraformProcess.on('close', async (code) => {
                    progressBar.stop(); // Ensure the progress bar is always stopped
                    if (code === 0) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        AppLogger.debug('Terraform init completed successfully.');
                        resolve(); // Resolve promise on successful completion
                    } else {
                        AppLogger.error(`Failed to initialize terraform process. Exit code: ${code}`, true);
                        reject(new Error(`Terraform init failed with exit code ${code}`)); // Reject promise on error
                        setImmediate(() => process.exit(1)); 
                    }
                });
    
            } catch (error) {
                progressBar.stop(); // Close progress bar on error
                AppLogger.error(`Failed to initialize terraform process: ${error}`, true);
                reject(error); // Reject promise on error     
            }
        });
    }

    async getMasterIp(projectPath: string): Promise<string> {
        try {
            const output = execSync('terraform output -json master_ip', {
                cwd: projectPath,
                env: process.env
            });
            AppLogger.debug(output.toString());
            const masterIp = JSON.parse(output.toString());
            return masterIp;
        } catch (error) {
            AppLogger.error(`Failed to get master IP: ${error}`, true);
            return '';
        }
    }

    async runTerraformApply(projectPath: string, module?: string, varFile?: string): Promise<void> {
        AppLogger.debug(`Running terraform apply in path: ${projectPath}`);
    
        return new Promise((resolve, reject) => {
            try {
                AppLogger.info(`Creating module: ${module}`, true);
    
                // Prepare the Terraform apply command with necessary arguments
                let args = ['apply', '-no-color', '-auto-approve'];
                if (module) {
                    args.push(`-target=${module}`);
                }
                if (varFile) {
                    args.push(`-var-file=${varFile}`);
                }
    
                const terraformProcess = spawn('terraform', args, {
                    cwd: projectPath,
                    env: process.env
                });
    
                // Set up progress bar
                const totalSteps = 100; // Adjust based on your estimation
                const progressBar = ProgressBar.createProgressBar();
                progressBar.start(totalSteps, 0, { message: 'Terraform apply in progress...' });
    
                terraformProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    AppLogger.info(`stdout: ${output}`);
    
                    // Regex to match "Creation complete" messages and update the progress bar
                    const creationCompleteRegex = /Creation complete after \d+s \[id=.*\]/g;
                    let match;
                    while ((match = creationCompleteRegex.exec(output)) !== null) {
                        progressBar.increment(totalSteps / totalSteps); // Adjust as per your progress tracking
                    }
                });
    
                terraformProcess.stderr.on('data', (data) => {
                    progressBar.stop();
                    AppLogger.error(`stderr: ${data.toString()}`);
                });
    
                terraformProcess.on('close', (code) => {
                    if (code === 0) {
                        progressBar.update(100, { message: 'Terraform apply completed.' });
                        progressBar.stop();
                        AppLogger.debug('Terraform apply completed successfully.', true);
                        resolve();
                    } else {
                        progressBar.stop();
                        AppLogger.error(`Terraform apply process exited with code ${code}`, true);
                        reject(new Error(`Terraform apply process exited with code ${code}`));
                        setImmediate(() => process.exit(1));
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
    
    async runTerraform(projectPath: string, backend: string, module?: string, varFile?: string): Promise<void> {

        try {
            await this.runTerraformInit(projectPath, backend);
            await this.runTerraformApply(projectPath, module, varFile);
        } catch (error) {
            AppLogger.error(`Terraform process failed: ${error}`, true);
        }
    }

    async runTerraformDestroy(projectPath: string, module?: string, varFile?: string): Promise<void> {
        AppLogger.info(`Running terraform destroy..., ${projectPath}`, true);
        try {
            AppLogger.info(`Destroying module ${module}...`, true);
            let command = module 
                ? `terraform destroy -target=${module} -auto-approve` 
                : 'terraform destroy -auto-approve';
            if (varFile) {
                command += ` -var-file=${varFile}`;
            }
            execSync(command, {
                cwd: `${projectPath}`,
                stdio: 'inherit',
                env: process.env
            });
            AppLogger.info('Terraform destroy completed successfully.', true);
        } catch (error) {
            AppLogger.error(`Failed to destroy terraform process:: ${error}`, true);
        }
    }

    async editKubeConfigFile(newClusterConfigPath: string): Promise<void> {
        // Path to the existing kubeconfig file
        const kubeconfigDir = path.join(os.homedir(), '.kube');
        const kubeconfigFilePath = path.join(kubeconfigDir, 'config');

        // Ensure the .kube directory exists
        if (!fs.existsSync(kubeconfigDir)) {
            fs.mkdirSync(kubeconfigDir);
        }

        let kubeconfig: any;

        // Check if the kubeconfig file exists
        if (fs.existsSync(kubeconfigFilePath)) {
            // Read the existing kubeconfig file
            const existingKubeconfig = fs.readFileSync(kubeconfigFilePath, 'utf8');
            // Parse the YAML content
            kubeconfig = jsyaml.load(existingKubeconfig);
        } else {
            // Initialize an empty kubeconfig structure if the file doesn't exist
            kubeconfig = {
                apiVersion: 'v1',
                kind: 'Config',
                clusters: [],
                users: [],
                contexts: [],
                'current-context': ''
            };
        }

        // Read the new cluster configuration from the file
        const newClusterConfigContent = fs.readFileSync(newClusterConfigPath, 'utf8');
        const newClusterConfig: any = jsyaml.load(newClusterConfigContent);
        AppLogger.debug(`New cluster config: ${newClusterConfig}`);
        // Extract cluster information from the existing kubeconfig
        const clusters = kubeconfig.clusters;
        const users = kubeconfig.users;
        const contexts = kubeconfig.contexts;

        // Define the new cluster configuration
        const newCluster = {
            cluster: {
                'certificate-authority-data': newClusterConfig.clusters[0].cluster['certificate-authority-data'] || '',
                'proxy-url': 'socks5://localhost:8002',
                'server': newClusterConfig.clusters[0].cluster['server'] || ''
            },
            name: `${this.config.project_name}-${this.config.environment}-cluster`
        };

        // Define the user information for the new cluster
        const newUser = {
            name: `${this.config.project_name}-${this.config.environment}-user`,
            user: {
                'client-certificate-data': newClusterConfig.users[0].user['client-certificate-data'],
                'client-key-data': newClusterConfig.users[0].user['client-key-data']
            }
        };


        // Add the new cluster and user to the kubeconfig
        kubeconfig.clusters.push(newCluster);
        kubeconfig.users.push(newUser);

        // Set the current context to the new cluster
        const newContext = {
            context: {
                cluster: newCluster.name,
                user: newUser.name
            },
            name: `${this.config.project_name}-${this.config.environment}-user@${this.config.project_name}-${this.config.environment}-cluster`
        };

        // Add the new context to the kubeconfig
        kubeconfig.contexts.push(newContext);

        // Set the current-context to the new context
        kubeconfig['current-context'] = newContext.name;

        // Serialize the modified YAML content
        const newKubeconfigYaml = jsyaml.dump(kubeconfig);

        // Write the updated YAML content back to the kubeconfig file
        fs.writeFileSync(kubeconfigFilePath, newKubeconfigYaml, 'utf8');

        AppLogger.debug('New cluster added to the kubeconfig file.');
    }

    async runAnsiblePlaybook1(projectPath: string) {
       executeCommandWithRetry('ansible-playbook ../playbooks/create-k8s-cluster.yml', {cwd:`${projectPath}/templates/aws/ansible/environments`});
    }   
     
    async runAnsiblePlaybook2(projectPath: string) {
        executeCommandWithRetry('ansible-playbook ../playbooks/configure-k8s-cluster.yml', {cwd:`${projectPath}/templates/aws/ansible/environments`});
    }
}
