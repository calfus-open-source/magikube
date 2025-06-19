import BaseCommand from "../../commands/base.js";
import gitOpsProject from "../gitops/common-gitops.js";
import AWSProject from "./aws-project.js";
import repositoryProject from "../code-repository/common-repository.js";
import argoCdProjectAWS from "../argocd/setup-argocd-aws.js";
import fs from "fs-extra";

export default class EKSFargateProject extends AWSProject {
  private path: string | undefined;
  private name: string | undefined;

  async createProject(name: string, path: string): Promise<void> {
    this.path = path;
    this.name = name;
    super.createProject(name, path);
    this.createMainFile();
  }

  async createMainFile(): Promise<void> {
    let command: BaseCommand | undefined;
    const gitOpsInstance = new gitOpsProject(command as BaseCommand, this.config);
    const repositoryInstance = new repositoryProject(command as BaseCommand, this.config);
    const argocdInstance = new argoCdProjectAWS(command as BaseCommand, this.config);
    const path = process.cwd();
    this.createFile("main.tf", `${path}/dist/templates/aws/eks-fargate/main.tf.liquid` , `/infrastructure`, true);
    this.createFile( "terraform.tfvars",`${path}/dist/templates/aws/eks-fargate/terraform.tfvars.liquid` ,`/infrastructure`, true);
    this.createFile( "variables.tf",`${path}/dist/templates/aws/eks-fargate/variables.tf.liquid`, "/infrastructure", true);
    this.createFile( `${this.config.environment}-config.tfvars`, `${path}/dist/templates/aws/eks-fargate/backend-config.tfvars.liquid` , "/infrastructure", true);
    this.createProviderFile(path)
    this.createCommon(path);
    this.createEKS(); 
    gitOpsInstance.createGitOps(this.path, this.name);
    repositoryInstance.createrepository(this.path, this.name);
    argocdInstance.argoCdProject(this.path, this.name);
  }

  async createEKS(): Promise<void> {
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/aws/modules/eks-fargate/main.tf.liquid`,
      "/infrastructure/modules/eks-fargate",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/aws/modules/eks-fargate/variables.tf.liquid`,
      "/infrastructure/modules/eks-fargate",
      true
    );
  }
}
