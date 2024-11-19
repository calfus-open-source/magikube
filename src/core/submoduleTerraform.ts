import SystemConfig from '../config/system.js';
import BaseCommand from '../commands/base.js';
import AWSProject from './aws/aws-project.js';
import EKSVPCTemplateProject from './aws/aws-eks-vpc.js';
import { AppLogger } from '../logger/appLogger.js';
import SubModuleTemplateProject from './aws/aws-submodules.js';
import { join } from 'path';
import fs from 'fs'
export default abstract class SubModuleTemplate {    
    static async getProject(command: BaseCommand,moduleType:string, commandName:string): Promise<AWSProject | null> {
        const projectConfigFile = join(process.cwd(), ".magikube");
        const project_config=  JSON.parse(fs.readFileSync(projectConfigFile).toString()); 
        if (project_config.cloud_provider === 'aws') {
            return new SubModuleTemplateProject(command, project_config, moduleType, commandName);
        }      
        command.error(`Cloud provider '${project_config.cloud_provider}' not supported`);
    }
}