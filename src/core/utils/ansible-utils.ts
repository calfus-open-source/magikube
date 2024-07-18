import {Args, Command, Flags} from '@oclif/core'
import BaseCommand from '../base-project.js'
import inquirer, { Answers } from 'inquirer';

import SystemConfig from '../../config/system.js';
import fs, { rmdirSync } from 'fs';
import os from 'os';
import path from 'path';
import { execSync, spawn } from 'child_process';
import jsyaml from 'js-yaml';
import { AppLogger } from '../../logger/appLogger.js';
let sshProcess: any;

export default class AnsibleUtils extends BaseCommand {

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

    async runAnsiblePlaybook(projectPath: string, playbookName: string) {
        const maxRetries = 3;
        let attempt = 0;
        let success = false;
    
        while (attempt < maxRetries && !success) {
            try {
                attempt++;
                AppLogger.debug(`Running ansible playbook... ${playbookName} in the ${projectPath} directory. Attempt ${attempt}`);
                execSync(`ansible-playbook ../playbooks/${playbookName}`, {
                    cwd: `${projectPath}/templates/aws/ansible/environments`,
                    stdio: 'inherit',
                    env: process.env
                });
                success = true;
            } catch (error) {
                AppLogger.error(`An error occurred while running the Ansible playbook: ${error}`);
                if (attempt >= maxRetries) {
                    AppLogger.debug('Max retries reached. Exiting...');
                    throw error;
                } else {
                    AppLogger.debug(`Retrying... (${attempt}/${maxRetries})`);
                }
            }
        }
    }    

}
