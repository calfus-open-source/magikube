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
        let awsStatus = true;

        if (!this.config.dryrun) {
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

        if (awsStatus) {
            super.destroyProject(name, path);
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
    async runTerraformInit(projectPath: string):Promise<void> {
        console.log('Running terraform init...', projectPath);
        try {
            execSync('terraform init', {
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
    async runTerraformApply(projectPath: string, module?: string): Promise<void> {
        console.log('Running terraform apply...', projectPath);
        try {
            console.log('Running terraform apply...');
            const command = module 
                ? `terraform apply -target=${module} -auto-approve` 
                : 'terraform apply -auto-approve';
            execSync(command, {
                cwd: projectPath,
                stdio: 'inherit'
            });
            console.log('Terraform apply completed successfully.');
        } catch (error) {
            console.error('Failed to apply terraform process:', error);
        }
    }
    
    async runTerraform(projectPath: string, module?: string): Promise<void> {
        try {
            await this.runTerraformInit(projectPath);
            await this.runTerraformApply(projectPath, module);
        } catch (error) {
            console.error('Terraform process failed:', error);
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
        try{
            console.log('Running ansible playbook...', projectPath);
            execSync('ansible-playbook ../playbooks/create-k8s-cluster.yml', {
                cwd: projectPath+'/templates/aws/ansible/environments',
                stdio: 'inherit'
            });
            console.log('Kubernetes cluster completed successfully.');    

        } catch (error) {
            console.error('Function not implemented.', error);
        }
    }

    async runAnsiblePlaybook2(projectPath: string) {
        try{
            console.log('Running ansible playbook...', projectPath+'/templates/aws/environments');
            execSync('ansible-playbook ../playbooks/configure-k8s-cluster.yml', {
                cwd: projectPath+'/templates/aws/environments',
                stdio: 'inherit'
            });
            console.log('Kubernetes cluster configuration completed successfully.');
        } catch (error) {
            console.error('Function not implemented.', error);
        }
    }

    async createReactApp(projectPath: string, projectConfig: any) {
        try {
            const appName = projectConfig['app_name'];
            const appPath = path.join(projectPath, appName);
            const createReactAppCommand = projectConfig['use_typescript'] === 'Yes' ? 
                `npx create-react-app ${appName} --template typescript` : `npx create-react-app ${appName}`;
            console.log('Creating React app...', appName);
            
            execSync(createReactAppCommand, {
                cwd: projectPath,
                stdio: 'inherit'
            });

            if(projectConfig['use_eslint'] === 'Yes') {
                execSync(`cd ${appName} && npx eslint --init`, {
                    stdio: 'inherit'
                });
            }
            if(projectConfig['use_tailwind'] === 'Yes') {
                execSync(`cd ${appName} && npm install tailwindcss@latest postcss@latest autoprefixer@latest && npx tailwindcss init -p`, {
                    stdio: 'inherit'
                });
            }
            execSync(`cd ${appName} && npm run build`, {
                stdio: 'inherit'
            });
            // this.createDockerfile(appPath);
        } catch (error) {
            console.error('Failed to create React app:', error);
        }
    }

    async createNodeExpressApp(projectPath: string, projectConfig: any) {
        try {
            const appName = projectConfig['app_name'];
            console.log('Creating Node Express app...', appName);
            const expressCommand = projectConfig['use_typescript'] === 'Yes' ? 
                `npx express-generator-typescript ${appName} --no-view` : `npx express-generator ${appName} --no-view`;
            execSync(expressCommand, {
                cwd: projectPath,
                stdio: 'inherit'
            });

            execSync(`cd ${appName} && npm run build`, {
                stdio: 'inherit'
            });
            console.log('Node Express app created successfully.');
        } catch (error) {
            console.error('Failed to create Node Express app:', error);
        }
    }

    // async createDockerfile(appPath: string) {
    //     const dockerfileContent = `
    //     # Use the official Node.js 20 image as the base image
    //     FROM node:20

    //     # Set the working directory in the container to /app
    //     WORKDIR /app
    
    //     # Copy the package.json and package-lock.json files to the working directory
    //     COPY package*.json ./
    
    //     # Install the dependencies
    //     RUN npm install
    
    //     # Copy the rest of the application code to the working directory
    //     COPY . .
    
    //     # Build the React application
    //     RUN npm run build
    
    //     # Use the official Nginx image to serve the static files
    //     FROM nginx:1.19
    
    //     # Copy the build output to the /usr/share/nginx/html directory
    //     COPY --from=0 /app/build /usr/share/nginx/html
    
    //     # Expose port 80 to allow traffic to the application
    //     EXPOSE 80
    
    //     # Start the Nginx server
    //     CMD ["nginx", "-g", "daemon off;"]
    //     `;
    
    //     fs.writeFileSync(path.join(appPath, 'Dockerfile'), dockerfileContent.trim());
    //     console.log('Dockerfile created successfully.');
    // }
}