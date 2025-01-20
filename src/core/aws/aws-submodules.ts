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
    this.createMainFile(projectConfig.moduleType, projectConfig); // Pass moduleType to createMainFile
  }

  async createMainFile(moduleType: string | string[],projectConfig: any): Promise<void> {
    const lastModule = moduleType[moduleType.length - 1];
    const parentPath = path.resolve(process.cwd(), ".."); 
    const distPath = path.resolve( parentPath, "dist/templates/aws/predefined/submodule");

    // Create common files
    await this.createProviderFile(parentPath);
    this.createFile("main.tf",`${distPath}/${lastModule}-module/main.tf.liquid`, "/infrastructure", true);
    this.createFile( "terraform.tfvars",`${distPath}/${lastModule}-module/terraform.tfvars.liquid`,"/infrastructure",true);
    this.createFile( "variables.tf",`${distPath}/${lastModule}-module/variables.tf.liquid`,"/infrastructure",true);

    if (lastModule === "vpc") {
      this.createFile( `${this.config.environment}-config.tfvars`,`${distPath}/backend-config.tfvars.liquid`,"/infrastructure", true);
      this.createVpc(parentPath);
    } else if (lastModule === "eks-fargate") {
      this.createEKS(parentPath);
    } else if (lastModule === "eks-nodegroup") {
      this.createEKSng(parentPath);
    } else if (lastModule === "rds") {
      this.createRdsmodule(parentPath);
    } else if (lastModule === "acm") {this.createFile( `${this.config.environment}-config.tfvars`,`${distPath}/backend-config.tfvars.liquid`, "/infrastructure",true);
      this.createACM(parentPath);
    }
  }

  async createRdsmodule(path:string): Promise<void> {
    this.createFile(
      "main.tf",
      `${path}/dist/templates/aws/modules-single/rds/main.tf.liquid`,
      "/infrastructure/modules/rds",
      true
    );
    this.createFile(
      "variables.tf",
      `${path}/dist/templates/aws/modules-single/rds/variables.tf.liquid`,
      "/infrastructure/modules/rds",
      true
    );
  }
  async createEKSng(path:string): Promise<void> {
    this.createFile(
      "main.tf",
      `${path}/dist/templates/aws/modules/eks-nodegroup/main.tf.liquid`,
      "/infrastructure/modules/eks-nodegroup",
      true
    );
    this.createFile(
      "variables.tf",
      `${path}/dist/templates/aws/modules/eks-nodegroup/variables.tf.liquid`,
      "/infrastructure/modules/eks-nodegroup",
      true
    );
  }
};