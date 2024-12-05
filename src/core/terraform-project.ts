import SystemConfig from '../config/system.js';
import BaseCommand from '../commands/base.js';
import EKSFargateProject from './aws/aws-eks-fargate.js';
import AWSK8SProject from './aws/aws-k8s.js';
import AWSProject from './aws/aws-project.js';
import EKSNodeGroupProject from './aws/aws-eks-nodegroup.js';

export default abstract class TerraformProject {    
    static async getProject(command: BaseCommand): Promise<AWSProject | null> {
        const config = SystemConfig.getInstance().getConfig();
        if (config.cloud_provider === 'aws') {
            if (config.cluster_type === 'eks-fargate') 
                return new EKSFargateProject(command, config);

            if (config.cluster_type === 'k8s') 
                return new AWSK8SProject(command, config);

            if (config.cluster_type === 'eks-nodegroup')
                return new EKSNodeGroupProject(command, config);
            
            command.error(`Cloud provider '${config.cloud_provider}' and cluster type '${config.cluster_type}' not supported`);
        }   
        
        command.error(`Cloud provider '${config.cloud_provider}' not supported`);
    }       

}