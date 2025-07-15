import BaseCommand from "../../commands/base.js";
import gitOpsProject from "../gitops/common-gitops.js";
import AzureProject from "./azure-project.js";
import repositoryProject from "../code-repository/common-repository.js";
import argoCdProjectAzure from "../argocd/setup-argocd-azure.js";
import { CloudProject } from "../interfaces/cloud-project.js";
import { AppLogger } from "../../logger/appLogger.js";
import fs from "fs";
import { join } from "path";

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
    this.createFile( "outputs.tf",`${path}/dist/templates/azure/environments/dev/outputs.tf.liquid`, "/infrastructure", true);
    this.createFile( `${this.config.environment}-config.tfvars`, `${path}/dist/templates/azure/environments/dev/backend-config.tfvars.liquid` , "/infrastructure", true);
    this.createProviderFileAzure(path)
    this.createCommon(path);
    gitOpsInstance.createGitOps(this.path, this.name);
    repositoryInstance.createrepository(this.path, this.name);
    argocdInstance.argoCdProject(this.path, this.name);
  }

  async createProviderFileAzure(path?: string): Promise<void> {
    const providerFilePath = join(
          this.projectPath,
          "infrastructure",
          "providers.tf"
        );
        if (!fs.existsSync(providerFilePath)) {
          // Proceed to create the file if it doesn't exist
          AppLogger.debug(`Creating 'providers.tf' at ${providerFilePath}`);
          await this.createFile(
            "providers.tf",
            `${path}/dist/templates/azure/environments/dev/provider.tf.liquid`,
            "/infrastructure",
            true
          );
          AppLogger.debug(`providers.tf create at : ${providerFilePath}`);
        }

  }
} 