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
        this.createFolder();

        const projectConfigFile = join(this.projectPath, '.magikube');
        this.command.log(`Creating project '${name}' in the path`);
        fs.writeFileSync(projectConfigFile, JSON.stringify(this.config, null, 4));

        this.createProviderFile();
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
        this.command.log(`Copying folder ${fullPath} to ${destFullPath}`);
        
        if (!fs.existsSync(fullPath)) {
            this.command.error(`Source path ${fullPath} does not exist`);
            return;
        }
        
        const files = fs.readdirSync(fullPath, 'utf8');
        this.command.log(`Files in ${fullPath}: ${files.join(', ')}`);
    
        for (const file of files) {
            const srcPath = join(fullPath, file);
            const destPath = join(destFullPath, file);
            const stat = fs.statSync(srcPath);
        
            this.command.log(`Processing file ${file}`);
            this.command.log(`Source path: ${srcPath}`);
            this.command.log(`Destination path: ${destPath}`);
            this.command.log(`Stat: ${stat}`);
            this.command.log(`Is directory: ${stat.isDirectory()}`);
    
            if (stat.isDirectory()) {
                if (!fs.existsSync(destPath)) {
                    fs.mkdirSync(destPath, { recursive: true });
                    this.command.log(`Created directory ${destPath}`);
                }
                await this.copyFolderAndRender(join(source, file), join(destination, file));
            } else if (file.endsWith('.liquid')) {
                const templateFile = fs.readFileSync(srcPath, 'utf8');
                const output = await this.engine.parseAndRender(templateFile, { ...this.config });
    
                const outputFilePath = destPath.replace('.liquid', '');
                if (!fs.existsSync(dirname(outputFilePath))) {
                    fs.mkdirSync(dirname(outputFilePath), { recursive: true });
                    this.command.log(`Created directory ${dirname(outputFilePath)}`);
                }
    
                fs.writeFileSync(outputFilePath, output);
                this.command.log(`Rendered and copied ${srcPath} to ${outputFilePath}`);
            } else {
                if (!fs.existsSync(dirname(destPath))) {
                    fs.mkdirSync(dirname(destPath), { recursive: true });
                    this.command.log(`Created directory ${dirname(destPath)}`);
                }
                fs.copyFileSync(srcPath, destPath);
                this.command.log(`Copied ${srcPath} to ${destPath}`);
            }
        }
    }
}