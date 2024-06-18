import { Liquid } from 'liquidjs';
import fs from 'fs-extra';
import { dirname, join } from 'path';
import SystemConfig from '../config/system.js';
import BaseCommand from '../commands/base.js';

export default abstract class BaseProject {    
    protected config: any = {};
    public command: BaseCommand;
    protected engine = new Liquid();
    protected projectPath: string = '';
    
    constructor(command: BaseCommand, config: any) {
        this.config = config;
        this.command = command;
    }

    async destroyProject(name: string, path: string): Promise<void> {
        //initialize terraform in the path
        this.projectPath = join(path, name);
        this.deleteFolder();
    }

    async deleteFolder(): Promise<void> {
        if (fs.existsSync(this.projectPath)) {
            this.command.log(`Removing folder '${this.projectPath}'`);
            fs.rmSync(this.projectPath, { recursive: true });
        } else {
            this.command.log(`Folder '${this.projectPath}' does not exist in the path`);
        }
    }

    async createProject(name: string, path: string): Promise<void> {
        //initialize terraform in the path
        this.projectPath = join(path, name);
        await this.createFolder();

        const projectConfigFile = join(this.projectPath, '.magikube');
        this.command.log(`Creating project '${name}' in the path`);
        fs.writeFileSync(projectConfigFile, JSON.stringify(this.config, null, 4));

        await this.createProviderFile();
    }

    async createFolder(): Promise<void> {
        //create a folder with the name in the path

        if (fs.existsSync(this.projectPath)) {
            this.command.log(`Folder '${this.projectPath}' already exists in the path`);
            this.command.error(`Folder '${this.projectPath}' already exists in the path`);
        } else {
            this.command.log(`Creating folder '${this.projectPath}' in the path`);
            fs.mkdirSync(this.projectPath);
        }
    }

    async createProviderFile(): Promise<void> {
        //create a providers.tf file in the path
        this.createFile('providers.tf', '../templates/common/providers.tf.liquid');
    }

    async createFile(filename: string, templateFilename: string, folderName: string = '.'): Promise<void> {
        //create a file in the path

        this.command.log(`Creating ${filename} file`);
        const templateFile = fs.readFileSync(join(new URL('.', import.meta.url).pathname, templateFilename), 'utf8');
        const output = await this.engine.parseAndRender(templateFile, { ...this.config } );
        const folderPath = join(this.projectPath, folderName);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
        fs.writeFileSync(join(folderPath, filename), output);
    }   

    async generateContent(templateFilename: string): Promise<any> {
        this.command.log(`Creating content from ${templateFilename}`);
        const templateFile = fs.readFileSync(join(new URL('.', import.meta.url).pathname, templateFilename), 'utf8');
        return await this.engine.parseAndRender(templateFile, { ...this.config } );
    }   
    
    async copyFolderAndRender(source: string, destination: string): Promise<void> {
        const fullPath = join(new URL('.', import.meta.url).pathname, source);
        const destFullPath = join(this.projectPath, destination);
        
        if (!fs.existsSync(fullPath)) {
            this.command.error(`Source path ${fullPath} does not exist`);
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