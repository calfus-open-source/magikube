import BaseCommand from "../../commands/base.js";
import gitOpsProject from "../gitops/common-gitops.js";
import AWSProject from "./aws-project.js";
import repositoryProject from "../code-repository/common-repository.js";

export default class EKSFargateProject extends AWSProject {
  private path:string | undefined
  private name:string | undefined

  async createProject(name: string, path: string): Promise<void> {
    this.path = path
    this.name = name
    super.createProject(name, path);
    this.createMainFile();
  }

  async createMainFile(): Promise<void> {
    let command: BaseCommand | undefined;
    const gitOpsInstance = new gitOpsProject(command as BaseCommand, this.config);
    const repositoryInstance = new repositoryProject(command as BaseCommand, this.config);
    
    this.createFile("main.tf", "../templates/aws/eks-fargate/main.tf.liquid" , "/infrastructure");
    this.createFile(
      "terraform.tfvars",
      "../templates/aws/eks-fargate/terraform.tfvars.liquid" ,"/infrastructure"
    );
    this.createFile(
      "variables.tf",
      "../templates/aws/eks-fargate/variables.tf.liquid" , "/infrastructure"
    );
    this.createFile(
      `${this.config.environment}-config.tfvars`,
      "../templates/aws/eks-fargate/backend-config.tfvars.liquid" , "/infrastructure"
    );

    this.createCommon();
    this.createEKS();
    gitOpsInstance.createGitOps(this.path, this.name);
    repositoryInstance.createrepository(this.path, this.name);
  }

  async createEKS(): Promise<void> {
    this.createFile(
      "main.tf",
      "../templates/aws/modules/eks-fargate/main.tf.liquid",
      "/infrastructure/modules/eks-fargate"
    );
    this.createFile(
      "variables.tf",
      "../templates/aws/modules/eks-fargate/variables.tf.liquid",
      "/infrastructure/modules/eks-fargate"
    );
  }
}
