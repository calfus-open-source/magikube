import SystemConfig from '../config/system.js';
import BaseCommand from '../commands/base.js';
import AWSProject from './aws/aws-project.js';
import EKSVPCTemplateProject from './aws/aws-eks-vpc.js';
import { AppLogger } from '../logger/appLogger.js';

export default abstract class TemplateTerraformProject {    
    static async getProject(command: BaseCommand): Promise<AWSProject | null> {
        const config = SystemConfig.getInstance().getConfig();
        if (config.cloud_provider === 'aws') {
            if (config.template === "first") {
              return new EKSVPCTemplateProject(command, config);
            }
              if (config.template === "second") {
                AppLogger.info("Templates are coming soon.....", true)
              }

        }      
        command.error(`Cloud provider '${config.cloud_provider}' not supported`);
    }
}