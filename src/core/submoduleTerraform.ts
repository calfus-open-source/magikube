import SystemConfig from '../config/system.js';
import BaseCommand from '../commands/base.js';
import AWSProject from './aws/aws-project.js';

import CommonSubModuleProject from './aws/aws-submodules.js';
export default abstract class SubModuleTemplateProject {    
    static async getProject(command: BaseCommand, projectName:string): Promise<AWSProject | null> {
         const projectConfig = SystemConfig.getInstance().getConfig();
        if (projectConfig.cloud_provider === "aws") {
          return new CommonSubModuleProject(command, projectConfig);
        }      
        command.error(
          `Cloud provider '${projectConfig.cloud_provider}' not supported`
        );
    }
}