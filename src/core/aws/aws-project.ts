import BaseProject from '../base-project.js';
import AWSTerraformBackend from "./aws-tf-backend.js";
import AWSPolicies from "./aws-iam.js";
import { spawn, execSync } from 'child_process';
import fs from 'fs';
import * as path from 'path';
import * as jsyaml from 'js-yaml';
import * as os from 'os';
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

        if (!this.config.dryrun) {
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
        this.createGitOps();
        this.createIngressController();
    }

    async createVpc(): Promise<void> {
        this.createFile('main.tf', '../templates/aws/modules/vpc/main.tf.liquid', './modules/vpc');
        this.createFile('variables.tf', '../templates/aws/modules/vpc/variables.tf.liquid', './modules/vpc');
    }
    
    async createRoute53(): Promise<void> {
        this.createFile('main.tf', '../templates/aws/modules/route53/main.tf.liquid', './modules/route53');
        this.createFile('variables.tf', '../templates/aws/modules/route53/variables.tf.liquid', './modules/route53');
    }

    async createIngressController(): Promise<void> {
        this.createFile('main.tf', '../templates/aws/modules/ingress-controller/main.tf.liquid', './modules/ingress-controller');
        this.createFile('variables.tf', '../templates/aws/modules/ingress-controller/variables.tf.liquid', './modules/ingress-controller');
    }

    async createACM(): Promise<void> {
        this.createFile('main.tf', '../templates/aws/modules/acm/main.tf.liquid', './modules/acm');
        this.createFile('variables.tf', '../templates/aws/modules/acm/variables.tf.liquid', './modules/acm');
    }

    async createGitOps(): Promise<void> {
        if (this.config.source_code_repository === "codecommit") {
          this.createFile(
            "main.tf",
            "../templates/aws/modules/gitops/main.tf.liquid",
            "./modules/gitops"
          );
          this.createFile(
            "variables.tf",
            "../templates/aws/modules/gitops/variables.tf.liquid",
            "./modules/gitops"
          );
        } else if (this.config.source_code_repository === "github") {
            this.createFile(
                "main.tf",
                "../templates/github/main.tf.liquid",
                "./modules/gitops"
            );
            this.createFile(
                "variables.tf",
                "../templates/github/variables.tf.liquid",
                "./modules/gitops"
            );
        }
    }

    // Function to start the SSH process in the background
    async startSSHProcess() {
        const proxyName = this.config.project_name + '-' + this.config.environment + '-proxy';
        sshProcess = spawn('ssh', ['-D', '8002', '-N', `${proxyName}`], {
            detached: true,
            stdio: 'ignore'
        });

        sshProcess.unref();
        console.log('SSH process started in the background.');
    }

    async stopSSHProcess() {
        if (sshProcess) {
            sshProcess.kill();
            console.log('SSH process stopped.');
        } else {
            console.log('No SSH process is running.');
        }
    }

    // Function to run terraform init command
    async runTerraformInit(projectPath: string, backend: string):Promise<void> {
        console.log('Running terraform init...', projectPath);
        try {
            execSync(`terraform init -backend-config=${backend}`, {
                cwd: projectPath,
                stdio: 'inherit'
            });
            console.log('Terraform init completed successfully.');
        } catch (error) {
            console.error('Failed to initialize terraform process:', error);
        }
    }

    async getMasterIp(projectPath: string): Promise<string> {
        try {
            const output = execSync('terraform output -json master_ip', {
                cwd: projectPath});
            this.command.log(output.toString());
            const masterIp = JSON.parse(output.toString());
            return masterIp;
        } catch (error) {
            console.error('Failed to get master IP:', error);
            return '';
        }
    }

    // Function to run terraform apply command
    async runTerraformApply(projectPath: string, module?: string, varFile?: string): Promise<void> {
        console.log('Running terraform apply...', projectPath);
        try {
            console.log('Running terraform apply...');
            let command = module 
                ? `terraform apply -target=${module} -auto-approve` 
                : 'terraform apply -auto-approve';
            if (varFile) {
                command += ` -var-file=${varFile}`;
            }    
            execSync(command, {
                cwd: projectPath,
                stdio: 'inherit'
            });
            console.log('Terraform apply completed successfully.');
        } catch (error) {
            console.error('Failed to apply terraform process:', error);
        }
    }
    
    async runTerraform(projectPath: string, backend: string, module?: string, varFile?: string): Promise<void> {
        try {
            await this.runTerraformInit(projectPath, backend);
            await this.runTerraformApply(projectPath, module, varFile);
        } catch (error) {
            console.error('Terraform process failed:', error);
        }
    }

    async runTerraformDestroy(projectPath: string, module?: string, varFile?: string): Promise<void> {
        console.log('Running terraform destroy...', projectPath);
        try {
            let command = module 
                ? `terraform destroy -target=${module} -auto-approve` 
                : 'terraform destroy -auto-approve';
            if (varFile) {
                command += ` -var-file=${varFile}`;
            }
            execSync(command, {
                cwd: projectPath,
                stdio: 'inherit'
            });
            console.log('Terraform destroy completed successfully.');
        } catch (error) {
            console.error('Failed to destroy terraform process:', error);
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
        this.command.log("New cluster config:",newClusterConfig);
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

        console.log('New cluster added to the kubeconfig file.');
    }

    async runAnsiblePlaybook1(projectPath: string) {
        const maxRetries = 3;
        let attempt = 0;
        let success = false;
    
        while (attempt < maxRetries && !success) {
            try {
                attempt++;
                console.log(`Running ansible playbook... Attempt ${attempt}`, projectPath);
                execSync('ansible-playbook ../playbooks/create-k8s-cluster.yml', {
                    cwd: `${projectPath}/templates/aws/ansible/environments`,
                    stdio: 'inherit'
                });
                console.log('Kubernetes cluster created successfully.');
                success = true;
            } catch (error) {
                console.error('An error occurred while running the Ansible playbook.', error);
                if (attempt >= maxRetries) {
                    console.error('Max retries reached. Exiting...');
                    throw error;
                } else {
                    console.log(`Retrying... (${attempt}/${maxRetries})`);
                }
            }
        }
    }    
    async runAnsiblePlaybook2(projectPath: string) {
        const maxRetries = 3;
        let attempt = 0;
        let success = false;
    
        while (attempt < maxRetries && !success) {
            try {
                attempt++;
                console.log(`Running ansible playbook... Attempt ${attempt}`, projectPath);
                execSync('ansible-playbook ../playbooks/configure-k8s-cluster.yml', {
                    cwd: `${projectPath}/templates/aws/ansible/environments`,
                    stdio: 'inherit'
                });
                console.log('Kubernetes cluster configuration completed successfully.');
                success = true;
            } catch (error) {
                console.error('An error occurred while running the Ansible playbook.', error);
                if (attempt >= maxRetries) {
                    console.error('Max retries reached. Exiting...');
                    throw error;
                } else {
                    console.log(`Retrying... (${attempt}/${maxRetries})`);
                }
            }
        }
    }
}