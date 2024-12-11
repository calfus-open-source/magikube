import path, { join } from "path";
import AWSProject from "./aws-project.js";
import SystemConfig from "../../config/system.js";

export default class CommonSubModuleProject extends AWSProject {
  private path: string | undefined;
  private name: string | undefined;

  async createProject(name: string, path: string): Promise<void> {
    const projectConfig = SystemConfig.getInstance().getConfig();
    console.log(projectConfig, "_______projectConfig");
    this.path = path;
    this.name = name;
    super.createProject(name, path);
    this.createMainFile(projectConfig.moduleType);  // Pass moduleType to createMainFile
  }

  async createMainFile(moduleType: string | string[]): Promise<void> {
    const lastModule = moduleType[moduleType.length - 1];
    console.log()
    // Create common files
   this.createFile("main.tf", `${process.cwd()}/dist/templates/aws/predefined/submodule/${lastModule}-module/main.tf.liquid`, "/infrastructure", true);
    this.createFile("terraform.tfvars",`${process.cwd()}/dist/templates/aws/predefined/submodule/${lastModule}-module/terraform.tfvars.liquid`,"/infrastructure",true);
    this.createFile("variables.tf",`${process.cwd()}/dist/templates/aws/predefined/submodule/${lastModule}-module/variables.tf.liquid`,"/infrastructure",true);

        if (lastModule === "vpc") {
          console.log("**************")
          this.createFile( `${this.config.environment}-config.tfvars`,`${process.cwd()}/dist/templates/aws/predefined/submodule/backend-config.tfvars.liquid`,"/infrastructure",true);
          this.createVpc();
        }else if (lastModule === "eks") {
          this.createEKS();
        } else if (lastModule === "rds") {
          console.log("----------------");
          this.createRds();
        } else if (lastModule === "acm") {
          this.createACM();
        }
  }
};

