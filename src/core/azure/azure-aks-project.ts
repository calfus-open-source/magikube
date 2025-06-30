import BaseCommand from "../../commands/base.js";
import gitOpsProject from "../gitops/common-gitops.js";
import AzureProject from "./azure-project.js";
import repositoryProject from "../code-repository/common-repository.js";
import argoCdProjectAzure from "../argocd/setup-argocd-azure.js";
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
    const argocdInstance = new argoCdProjectAzure(command as BaseCommand, this.config);
    const path = process.cwd();
    this.createFile("main.tf", `${path}/dist/templates/azure/environments/dev/main.tf.liquid` , `/infrastructure`, true);
    this.createFile( "terraform.tfvars",`${path}/dist/templates/azure/environments/dev/terraform.tfvars.liquid` ,`/infrastructure`, true);
    this.createFile( "variables.tf",`${path}/dist/templates/azure/environments/dev/variables.tf.liquid`, "/infrastructure", true);
    this.createFile( `${this.config.environment}-config.tfvars`, `${path}/dist/templates/azure/environments/dev/backend-config.tfvars.liquid` , "/infrastructure", true);
    this.createProviderFile(path)
    this.createCommon(path);
    gitOpsInstance.createGitOps(this.path, this.name);
    repositoryInstance.createrepository(this.path, this.name);
    //argocdInstance.argoCdProject(this.path, this.name);
  }
} 