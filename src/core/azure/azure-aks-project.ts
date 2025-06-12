import BaseCommand from "../../commands/base.js";
import gitOpsProject from "../gitops/common-gitops.js";
import AzureProject from "./azure-project.js";
import repositoryProject from "../code-repository/common-repository.js";
import argoCdProject from "../argocd/setup-argocd.js";
import { CloudProject } from "../interfaces/cloud-project.js";

export default class AzureAKSProject extends AzureProject implements CloudProject {
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
    const argocdInstance = new argoCdProject(command as BaseCommand, this.config);
    const path = process.cwd();
    this.createFile("main.tf", `${path}/dist/templates/azure/aks/main.tf.liquid` , `/infrastructure`, true);
    this.createFile( "terraform.tfvars",`${path}/dist/templates/azure/aks/terraform.tfvars.liquid` ,`/infrastructure`, true);
    this.createFile( "variables.tf",`${path}/dist/templates/azure/aks/variables.tf.liquid`, "/infrastructure", true);
    this.createFile( `${this.config.environment}-config.tfvars`, `${path}/dist/templates/azure/aks/backend-config.tfvars.liquid` , "/infrastructure", true);
    this.createProviderFile(path)
    this.createCommon(path);
    this.createAKS(); 
    gitOpsInstance.createGitOps(this.path, this.name);
    repositoryInstance.createrepository(this.path, this.name);
    argocdInstance.argoCdProject(this.path, this.name);
  }

  async createAKS(): Promise<void> {
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/azure/modules/aks/main.tf.liquid`,
      "/infrastructure/modules/aks",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/azure/modules/aks/variables.tf.liquid`,
      "/infrastructure/modules/aks",
      true
    );
  }
} 