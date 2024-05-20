import { Liquid } from 'liquidjs';
import * as fs from 'fs';
import { join } from 'path';
import SystemConfig from '../config/system.js';
import BaseCommand from '../commands/base.js';

export default abstract class BaseProject {    
    protected systemConfig: SystemConfig;
    protected responses: any;
    public command: BaseCommand;
    protected engine = new Liquid();
    protected projectPath: string = '';
    
    constructor(command: BaseCommand, systemConfig: SystemConfig, responses: any) {
        this.systemConfig = systemConfig;
        this.responses = responses;
        this.command = command;
    }

    async createProject(name: string, path: string): Promise<void> {
        //initialize terraform in the path
        this.projectPath = join(path, name);
        this.createFolder();
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
        const output = await this.engine.parseAndRender(templateFile, { ...this.responses, ...this.systemConfig.getConfig() } );
        const folderPath = join(this.projectPath, folderName);
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }
        fs.writeFileSync(join(folderPath, filename), output);
    }   
}