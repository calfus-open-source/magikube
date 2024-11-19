import AWSProject from "./aws-project.js";

export default class SubModuleTemplateProject extends AWSProject {
  private path: string | undefined;
  private name: string | undefined;
  private moduleType: string; // Store the moduleType as a class property
  private commandName: string;
  

  constructor(command: any, config: any, moduleType: string, commandName:string) {
    super(command, config); // Call the parent class constructor
    this.moduleType = moduleType; 
    this.commandName = commandName; 
  }

  async createProject(name: string, path: string): Promise<void> {
    this.path = path;
    this.name = name;
    console.log("*******************")
    super.createProject(name, path, this.commandName);
    console.log("###################")
    this.createMainFile();
  }

  async createMainFile(): Promise<void> {
    // Create common files
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/aws/predefined/submodule/${this.moduleType}-module/main.tf.liquid`,
      "/infrastructure",
      true
    );
    this.createFile(
      "terraform.tfvars",
      `${process.cwd()}/dist/templates/aws/predefined/submodule/${this.moduleType}-module/terraform.tfvars.liquid`,
      "/infrastructure",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/aws/predefined/submodule/${this.moduleType}-module/variables.tf.liquid`,
      "/infrastructure",
      true
    );
    this.createFile(
      `${this.config.environment}-config.tfvars`,
      `${process.cwd()}/dist/templates/aws/predefined/submodule/backend-config.tfvars.liquid`,
      "/infrastructure",
      true
    );

    // Call module-specific methods based on moduleType
    console.log(this.moduleType,"<<<<<<<this.moduleType")
    if (this.moduleType.toLowerCase() === "vpc") {
      this.createVpc();
    } else if (this.moduleType.toLowerCase() === "eks") {
      this.createEKS();
    } else if (this.moduleType.toLowerCase() === "rds") {
      this.createRds();
    } else if (this.moduleType.toLowerCase() === "acm"){
      this.createACM();
    } else if (this.moduleType.toLowerCase() === "ecr"){
      this.createECR();
    }
    else {
      console.error(`Unknown module type: ${this.moduleType}`);
      process.exit(1);
    }
  }

  
}
