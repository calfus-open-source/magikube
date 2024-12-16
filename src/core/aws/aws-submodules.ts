import path, { join } from "path";
import AWSProject from "./aws-project.js";
import SystemConfig from "../../config/system.js";
 
export default class CommonSubModuleProject extends AWSProject {
  private path: string | undefined;
  private name: string | undefined;
  async createProject(name: string, path: string): Promise<void> {
    const projectConfig = SystemConfig.getInstance().getConfig();
    this.path = path;
    this.name = name;
    super.createProject(name, path);
    this.createMainFile(projectConfig.moduleType, projectConfig);  // Pass moduleType to createMainFile
  }

  async createMainFile(moduleType: string | string[], projectConfig:any): Promise<void> {
    const lastModule = moduleType[moduleType.length - 1];
    // Create common files
   this.createFile("main.tf", `${process.cwd()}/dist/templates/aws/predefined/submodule/${lastModule}-module/main.tf.liquid`, "/infrastructure", true);
    this.createFile("terraform.tfvars",`${process.cwd()}/dist/templates/aws/predefined/submodule/${lastModule}-module/terraform.tfvars.liquid`,"/infrastructure",true);
    this.createFile("variables.tf",`${process.cwd()}/dist/templates/aws/predefined/submodule/${lastModule}-module/variables.tf.liquid`,"/infrastructure",true);     
        if (lastModule === "vpc") {
          this.createFile( `${this.config.environment}-config.tfvars`,`${process.cwd()}/dist/templates/aws/predefined/submodule/backend-config.tfvars.liquid`,"/infrastructure",true);
          this.createVpc();
        }else if (lastModule === "eks-fargate") {
          this.createEKS();
        }
        else if (lastModule === "eks-nodegroup") {
          this.createEKSng();
        } else if (lastModule === "rds") {
          this.createRdsmodule();
        } else if (lastModule === "acm") {
          this.createFile( `${this.config.environment}-config.tfvars`,`${process.cwd()}/dist/templates/aws/predefined/submodule/backend-config.tfvars.liquid`,"/infrastructure",true);
          this.createACM();
        }
  }
  async createRdsmodule(): Promise<void> {
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/aws/modules-single/rds/main.tf.liquid`,
      "/infrastructure/modules/rds",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/aws/modules-single/rds/variables.tf.liquid`,
      "/infrastructure/modules/rds",
      true
    );
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
};