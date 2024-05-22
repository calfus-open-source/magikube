import SystemConfig from '../config/system.js';
import BaseCommand from '../commands/base.js';
import EKSFargateProject from './aws/aws-eks-fargate.js';
import BaseProject from './base-project.js';
import AWSEC2Project from './aws/aws-ec2.js';

export default abstract class TerraformProject {    
    static async getProject(command: BaseCommand): Promise<BaseProject | null> {
        const config = SystemConfig.getInstance().getConfig();

        if (config.cloud_provider === 'aws') {
            if (config.cluster_type === 'eks-fargate') 
                return new EKSFargateProject(command, config);

            if (config.cluster_type === 'k8s') 
                return new AWSEC2Project(command, config);
            command.error(`Cloud provider '${config.cloud_provider}' and cluster type '${config.cluster_type}' not supported`);
        }   
        
        command.error(`Cloud provider '${config.cloud_provider}' not supported`);
    }       
}