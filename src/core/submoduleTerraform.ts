import SystemConfig from '../config/system.js';
import BaseCommand from '../commands/base.js';
import AWSSubmoduleProject from './aws/aws-submodules.js';
import AzureSubmoduleProject from './azure/azure-submodules.js';
import BaseProject from './base-project.js';
import { CloudProject } from './interfaces/cloud-project.js';

export default abstract class SubmoduleTerraformProject {    
    static async getProject(command: BaseCommand, projectName: string): Promise<(BaseProject & CloudProject) | null> {
        const config = SystemConfig.getInstance().getConfig();
        if (config.cloud_provider === "aws") {
          return new AWSSubmoduleProject(command, config) as BaseProject & CloudProject;
        } else if (config.cloud_provider === "azure") {
          return new AzureSubmoduleProject(command, config, projectName, "generic") as BaseProject & CloudProject;
        }      
        command.error(
          `Cloud provider '${config.cloud_provider}' not supported`
        );
    }
}