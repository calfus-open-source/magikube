import BaseCommand from "../../commands/base.js";
import gitOpsProject from "../gitops/common-gitops.js";
import AWSProject from "../aws/aws-project.js";
import repositoryProject from "../code-repository/common-repository.js";
import argoCdProject from "../argocd/setup-argocd.js";
import fs from "fs-extra";

export default class GKEProject extends AWSProject {
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
    const gitOpsInstance = new gitOpsProject(
      command as BaseCommand,
      this.config
    );
    const repositoryInstance = new repositoryProject(
      command as BaseCommand,
      this.config
    );
    const argocdInstance = new argoCdProject(
      command as BaseCommand,
      this.config
    );
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/gcp/GKE/main.tf.liquid`,
      `/infrastructure`,
      true
    );
    this.createFile(
      "terraform.tfvars",
      `${process.cwd()}/dist/templates/gcp/GKE/terraform.tfvars.liquid`,
      `/infrastructure`,
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/gcp/GKE/variables.tf.liquid`,
      "/infrastructure",
      true
    );
    this.createFile(
      `${this.config.environment}-config.tfvars`,
      `${process.cwd()}/dist/templates/gcp/GKE/backend-config.tfvars.liquid`,
      "/infrastructure",
      true
    );
    // mmodules file will create once modules will fix for GCP
    // this.createCommon();
    
    gitOpsInstance.createGitOps(this.path, this.name);
    repositoryInstance.createrepository(this.path, this.name);
    argocdInstance.argoCdProject(this.path, this.name);
  }

 
}
