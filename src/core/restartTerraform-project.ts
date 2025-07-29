import SystemConfig from "../config/system.js";
import BaseCommand from "../commands/base.js";
import EKSFargateProject from "./aws/aws-eks-fargate.js";
import AWSK8SProject from "./aws/aws-k8s.js";
import AWSProject from "./aws/aws-project.js";
import EKSNodeGroupProject from "./aws/aws-eks-nodegroup.js";
import { dotMagikubeConfig } from "./utils/projectConfigReader-utils.js";
import AzureAKSProject from "./azure/azure-aks-project.js";
import AzureProject from "./azure/azure-project.js";
import BaseProject from "./base-project.js";
//import { CloudProject } from "./interfaces/cloud-project.js";
export default abstract class RestartTerraformProject {
  static async getProject(
    command: BaseCommand,
    projectName: string
  ):Promise<(BaseProject) | null> {
    const project_config = dotMagikubeConfig(projectName, process.cwd());
    if (project_config.cloud_provider === "aws") {
      if (project_config.cluster_type === "eks-fargate")
        return new EKSFargateProject(command, project_config);

      if (project_config.cluster_type === "k8s")
        return new AWSK8SProject(command, project_config);

      if (project_config.cluster_type === "eks-nodegroup")
        return new EKSNodeGroupProject(command, project_config);

      command.error(
        `Cloud provider '${project_config.cloud_provider}' and cluster type '${project_config.cluster_type}' not supported`
      );
    } else if (project_config.cloud_provider === "azure") {
      if (project_config.cluster_type === "aks")
        return new AzureAKSProject(command, project_config);

      if (project_config.cluster_type === "k8s")
        return new AzureProject(command, project_config);
      command.error(
        `Cloud provider '${project_config.cloud_provider}' and cluster type '${project_config.cluster_type}' not supported`
      );
    }

    command.error(
      `Cloud provider '${project_config.cloud_provider}' not supported`
    );
  }
}
