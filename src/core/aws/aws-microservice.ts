import path, { join } from "path";
import AWSProject from "./aws-project.js";
import repositoryProject from "../code-repository/common-repository.js";
import BaseCommand from "../../commands/base.js";

export default class CreateMicroserviceProject extends AWSProject {
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
    const parentPath = path.resolve(process.cwd(), "..");
    const distPath = path.join(parentPath,"dist/templates/aws/predefined/submodule/github-module");
    await this.createProviderFile(parentPath);
    const repositoryInstance = new repositoryProject(command as BaseCommand, this.config);
    this.createFile(
      "main.tf",
      `${distPath}/main.tf.liquid`,
      "/infrastructure",
      true
    );
    this.createFile(
      "variables.tf",
      `${distPath}/variables.tf.liquid`,
      "/infrastructure",
      true
    );
    this.createFile(
      "terraform.tfvars",
      `${distPath}/terraform.tfvars.liquid`, 
      "/infrastructure",
      true
    );
    this.createFile(
      `${this.config.environment}-config.tfvars`,
      `${distPath}/backend-config.tfvars.liquid`,
      "/infrastructure",
      true
    );
    repositoryInstance.createrepository(this.path, this.name);
  }
}
