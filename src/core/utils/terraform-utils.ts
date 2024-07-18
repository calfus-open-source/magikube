import {Args, Command, Flags} from '@oclif/core'
import BaseCommand from '../../core/base-project.js'
import inquirer, { Answers } from 'inquirer';

import SystemConfig from '../../config/system.js';
import fs, { rmdirSync } from 'fs';
import os from 'os';
import path from 'path';
import { execSync, spawn } from 'child_process';
import jsyaml from 'js-yaml';
import { AppLogger } from '../../logger/appLogger.js';
let sshProcess: any;

export default class TerraformUtils {

    async getMasterIp(projectPath: string): Promise<string> {
        try {
            const output = execSync('terraform output -json master_ip', {
                cwd: projectPath,
                env: process.env
            });
            AppLogger.debug(`Master instance private IP:${output.toString()}`);
            const masterIp = JSON.parse(output.toString());
            return masterIp;
        } catch (error) {
            AppLogger.error('Failed to get master IP!');
            throw error;
        }
    }

    // Function to run terraform init command
    async runTerraformInit(projectPath: string, backend: string):Promise<void> {
        AppLogger.debug(`Running terraform init in this path: ${projectPath}`);
        try {
            execSync(`terraform init -backend-config=${backend}`, {
                cwd: projectPath,
                stdio: 'inherit',
                env: process.env
            });
            AppLogger.debug('Terraform init completed successfully.');
        } catch (error) {
            AppLogger.error('Failed to initialize terraform process');
            throw error;
        }
    }

    // Function to run terraform apply command
    async runTerraformApply(projectPath: string, module?: string, varFile?: string): Promise<void> {
        try {
            AppLogger.debug(`Running terraform apply in this path: ${projectPath}`);
            let command = module 
                ? `terraform apply -target=${module} -auto-approve` 
                : 'terraform apply -auto-approve';
            if (varFile) {
                command += ` -var-file=${varFile}`;
            }    
            execSync(command, {
                cwd: projectPath,
                stdio: 'inherit',
                env: process.env
            });
            AppLogger.info('Terraform apply completed successfully.');
        } catch (error) {
            AppLogger.error(`Failed to apply terraform process: ${error}`);
            throw error;
        }
    }
    
    async runTerraform(projectPath: string, backend: string, module?: string, varFile?: string): Promise<void> {
        try {
            await this.runTerraformInit(projectPath, backend);
            await this.runTerraformApply(projectPath, module, varFile);
        } catch (error) {
            AppLogger.error(`Terraform process failed.`);
            throw error;
        }
    }

    async runTerraformDestroy(projectPath: string, module?: string, varFile?: string): Promise<void> {
        AppLogger.debug(`Running terraform destroy... ${projectPath}`);
        try {
            let command = module 
                ? `terraform destroy -target=${module} -auto-approve` 
                : 'terraform destroy -auto-approve';
            if (varFile) {
                command += ` -var-file=${varFile}`;
            }
            execSync(command, {
                cwd: projectPath,
                stdio: 'inherit',
                env: process.env
            });
            AppLogger.info('Terraform destroy completed successfully.');
        } catch (error) {
            AppLogger.error('Failed to destroy terraform process.');
            throw error;
        }
    }
}
 