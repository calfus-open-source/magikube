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
    this.createMainFile(projectConfig.moduleType);
  }

  async createMainFile(moduleType: string): Promise<void> {
    // Create common files
    this.createFile("main.tf",`${process.cwd()}/dist/templates/aws/predefined/submodule/${moduleType}-module/main.tf.liquid`,"/infrastructure",true);
    this.createFile("terraform.tfvars",`${process.cwd()}/dist/templates/aws/predefined/submodule/${moduleType }-module/terraform.tfvars.liquid`,"/infrastructure",true);
    this.createFile("variables.tf",`${process.cwd()}/dist/templates/aws/predefined/submodule/${ moduleType}-module/variables.tf.liquid`,"/infrastructure",true);
    this.createFile( `${this.config.environment}-config.tfvars`,`${process.cwd()}/dist/templates/aws/predefined/submodule/backend-config.tfvars.liquid`,"/infrastructure",true);

    // Call module-specific methods based on moduleType
    if (moduleType.toLowerCase() === "vpc") {
      this.createVpc();
    } else if (moduleType.toLowerCase() === "eks") {
      this.createEKS();
    } else if (moduleType.toLowerCase() === "rds") {
      this.createRds();
    } else if (moduleType.toLowerCase() === "acm") {
      this.createACM();
    } else if (moduleType.toLowerCase() === "ecr") {
      this.createECR();
    } else {
      console.error(`Unknown module type: ${moduleType}`);
      process.exit(1);
    }
  }
}
