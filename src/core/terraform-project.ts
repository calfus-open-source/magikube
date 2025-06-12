import SystemConfig from '../config/system.js';
import BaseCommand from '../commands/base.js';
import EKSFargateProject from './aws/aws-eks-fargate.js';
import AWSK8SProject from './aws/aws-k8s.js';
import AWSProject from './aws/aws-project.js';
import EKSNodeGroupProject from './aws/aws-eks-nodegroup.js';
import EKSNodeGrpClusterProject from './aws/aws-eks-nodegroup.js';
import AzureProject from './azure/azure-project.js';
import AKSProject from './azure/azure-aks-project.js';
import BaseProject from './base-project.js';
import { CloudProject } from './interfaces/cloud-project.js';

export default abstract class TerraformProject {    
    static async getProject(command: BaseCommand): Promise<(BaseProject & CloudProject) | null> {
        const config = SystemConfig.getInstance().getConfig();
        if (config.cloud_provider === 'aws') {
            if (config.cluster_type === 'eks-fargate') 
                return new EKSFargateProject(command, config) as BaseProject & CloudProject;

            if (config.cluster_type === 'k8s') 
                return new AWSK8SProject(command, config) as BaseProject & CloudProject;

            if (config.cluster_type === 'eks-nodegroup')
                return new EKSNodeGrpClusterProject(command, config) as BaseProject & CloudProject;
            
            command.error(`Cloud provider '${config.cloud_provider}' and cluster type '${config.cluster_type}' not supported`);
        } else if (config.cloud_provider === 'azure') {
            if (config.cluster_type === 'aks') 
                return new AKSProject(command, config) as BaseProject & CloudProject;

            if (config.cluster_type === 'k8s') 
                return new AzureProject(command, config) as BaseProject & CloudProject;
            
            command.error(`Cloud provider '${config.cloud_provider}' and cluster type '${config.cluster_type}' not supported`);
        }   
        
        command.error(`Cloud provider '${config.cloud_provider}' not supported`);
    }       

}