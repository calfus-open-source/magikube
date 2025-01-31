import AWSProject from "./aws-project.js";
import BaseCommand from "../../commands/base.js";
import gitOpsProject from "../gitops/common-gitops.js";
import repositoryProject from "../code-repository/common-repository.js";
import argoCdProject from "../argocd/setup-argocd.js";

export default class EKSNodeGrpClusterProject extends AWSProject {
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
    const path = process.cwd();
    const gitOpsInstance = new gitOpsProject(command as BaseCommand, this.config);
    const repositoryInstance = new repositoryProject(command as BaseCommand, this.config);
    const argocdInstance = new argoCdProject(command as BaseCommand, this.config);

    this.createFile("main.tf", `${process.cwd()}/dist/templates/aws/eks-nodegroup/main.tf.liquid`, "/infrastructure", true);
    this.createFile(
      "terraform.tfvars",
      `${process.cwd()}/dist/templates/aws/eks-nodegroup/terraform.tfvars.liquid` , "/infrastructure", true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/aws/eks-nodegroup/variables.tf.liquid` , "/infrastructure", true
    );
    this.createFile(
      `${this.config.environment}-config.tfvars`,
      `${process.cwd()}/dist/templates/aws/eks-nodegroup/backend-config.tfvars.liquid` , "/infrastructure", true
    );
    this.createProviderFile(path)
    this.createCommon(path);
    this.createEKSng();
    gitOpsInstance.createGitOps(this.path, this.name);
    repositoryInstance.createrepository(this.path, this.name);
    argocdInstance.argoCdProject(this.path, this.name);
  }

  async createEKSng(): Promise<void> {
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/aws/modules/eks-nodegroup/main.tf.liquid`,
      "/infrastructure/modules/eks-nodegroup",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/aws/modules/eks-nodegroup/variables.tf.liquid`,
      "/infrastructure/modules/eks-nodegroup",
      true
    );
  }
}
