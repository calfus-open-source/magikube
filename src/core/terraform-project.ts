import SystemConfig from '../config/system.js';
import BaseCommand from '../commands/base.js';
import EKSFargateProject from './aws-eks-fargate.js';
import BaseProject from './base-project.js';

export default abstract class TerraformProject {    

    static async generateProject(command: BaseCommand, systemConfig: SystemConfig, responses: any): Promise<BaseProject | null> {
        if (responses.cloud_provider === 'aws' && responses.cluster_type === 'eks-fargate') {
            return new EKSFargateProject(command, systemConfig, responses);
        }   

        return null;
    }       
}