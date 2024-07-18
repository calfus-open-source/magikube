import { Liquid } from 'liquidjs';
import fs from 'fs-extra';
import { dirname, join } from 'path';
import SystemConfig from '../config/system.js';
import BaseCommand from '../commands/base.js';
import TerraformProject from './terraform-project.js';
import TerraformUtils from './utils/terraform-utils.js';
import AnsibleUtils from './utils/ansible-utils.js';
import ServiceUtils from './utils/service-utils.js';
import { AppLogger } from '../logger/appLogger.js';

export default abstract class BaseProject {    
    protected config: any = {};
    public command: BaseCommand;
    protected engine = new Liquid();
    protected projectPath: string = '';
    protected terraformUtils: TerraformUtils;
    // protected ansibleUtils: AnsibleUtils;
    // protected serviceUtils: ServiceUtils;

    constructor(command: BaseCommand, config: any) {
        this.config = config;
        this.command = command;
        this.terraformUtils = new TerraformUtils();
        // this.ansibleUtils = new AnsibleUtils(this.command, this.config);
        // this.serviceUtils = new ServiceUtils(this.command, this.config);
    }

    async destroyProject(name: string, path: string): Promise<void> {
        //initialize terraform in the path
        this.projectPath = join(path, name);
        // Run terraform destroy
        AppLogger.debug(`Destroying project '${name}' in the path`, true);
        await this.terraformDestroy();
        await this.deleteFolder();
    }

    async terraformDestroy(): Promise<void> {
        // Run terraform destroy
        AppLogger.info(`Running terraform destroy in the path`, true);
        const terraform = await TerraformProject.getProject(this.command);
        // Check if it has multiple modules
        if (this.config.cluster_type === 'k8s') {
            // Initialize the terraform
            await this.terraformUtils.runTerraformInit(this.projectPath+'/k8s_config', `../${this.config.environment}-config.tfvars`);
            // await this.ansibleUtils.startSSHProcess();
            // // Destroy the ingress and other helm modules
            // await this.terraformUtils?.runTerraformDestroy(this.projectPath+'/k8s_config', 'module.ingress-controller', `../terraform.tfvars`);
            // this.ansibleUtils?.stopSSHProcess();
        }
        await this.terraformUtils?.runTerraformDestroy(this.projectPath);
    }

    async deleteFolder(): Promise<void> {
        if (fs.existsSync(this.projectPath)) {
            AppLogger.debug(`Removing folder '${this.projectPath}'`, true);
            fs.rmSync(this.projectPath, { recursive: true });
        } else {
            AppLogger.debug(`Folder '${this.projectPath}' does not exist in the path`, true);
        }
    }

    async createProject(name: string, path: string): Promise<void> {
        //initialize terraform in the path
        this.projectPath = join(path, name);
        await this.createFolder();

        const projectConfigFile = join(this.projectPath, '.magikube');
        AppLogger.debug(`Creating project '${name}' in the path`, true);
        fs.writeFileSync(projectConfigFile, JSON.stringify(this.config, null, 4));

        await this.createProviderFile();
    }

    async createFolder(): Promise<void> {
        //create a folder with the name in the path

        if (fs.existsSync(this.projectPath)) {
            AppLogger.debug(`Folder '${this.projectPath}' already exists in the path`);
            AppLogger.error(`Folder '${this.projectPath}' already exists in the path`);
        } else {
            AppLogger.debug(`Creating folder '${this.projectPath}' in the path`);
            fs.mkdirSync(this.projectPath);
        }
    }

    async createProviderFile(): Promise<void> {
        //create a providers.tf file in the path
        await this.createFile('providers.tf', '../templates/common/providers.tf.liquid');
    }

    async createFile(filename: string, templateFilename: string, folderName: string = '.'): Promise<void> {
        //create a file in the path

        AppLogger.debug(`Creating ${filename} file`);
        const templateFile = fs.readFileSync(join(new URL('.', import.meta.url).pathname, templateFilename), 'utf8');
        const output = await this.engine.parseAndRender(templateFile, { ...this.config } );
        const folderPath = join(this.projectPath, folderName);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
        fs.writeFileSync(join(folderPath, filename), output);
    }   

    async generateContent(templateFilename: string): Promise<any> {
        AppLogger.debug(`Creating content from ${templateFilename}`);
        const templateFile = fs.readFileSync(join(new URL('.', import.meta.url).pathname, templateFilename), 'utf8');
        return await this.engine.parseAndRender(templateFile, { ...this.config } );
    }   
    
    async copyFolderAndRender(source: string, destination: string): Promise<void> {
        const fullPath = join(new URL('.', import.meta.url).pathname, source);
        const destFullPath = join(this.projectPath, destination);
        
        if (!fs.existsSync(fullPath)) {
            AppLogger.error(`Source path ${fullPath} does not exist`);
            return;
        }
        
        const files = fs.readdirSync(fullPath, 'utf8');
    
        for (const file of files) {
            const srcPath = join(fullPath, file);
            const destPath = join(destFullPath, file);
            const stat = fs.statSync(srcPath);
        
            if (stat.isDirectory()) {
                if (!fs.existsSync(destPath)) {
                    fs.mkdirSync(destPath, { recursive: true });
                }
                await this.copyFolderAndRender(join(source, file), join(destination, file));
            } else if (file.endsWith('.liquid')) {
                const templateFile = fs.readFileSync(srcPath, 'utf8');
                const output = await this.engine.parseAndRender(templateFile, { ...this.config });
    
                const outputFilePath = destPath.replace('.liquid', '');
                if (!fs.existsSync(dirname(outputFilePath))) {
                    fs.mkdirSync(dirname(outputFilePath), { recursive: true });
                }
    
                fs.writeFileSync(outputFilePath, output);
            } else {
                if (!fs.existsSync(dirname(destPath))) {
                    fs.mkdirSync(dirname(destPath), { recursive: true });
                }
                fs.copyFileSync(srcPath, destPath);
            }
        }
    }
}