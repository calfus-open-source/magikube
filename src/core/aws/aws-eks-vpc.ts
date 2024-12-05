import AWSProject from "./aws-project.js";

export default class EKSVPCTemplateProject extends AWSProject {
  private path:string | undefined
  private name:string | undefined

  async createProject(name: string, path: string): Promise<void> {
    this.path = path
    this.name = name
    super.createProject(name, path);
    this.createMainFile();
  }

  async createMainFile(): Promise<void> { 
    this.createFile("main.tf", `${process.cwd()}/dist/templates/aws/predefined/eks/main.tf.liquid` , `/infrastructure`, true);
    this.createFile( "terraform.tfvars", `${process.cwd()}/dist/templates/aws/predefined/eks/terraform.tfvars.liquid` ,"/infrastructure", true);
    this.createFile("variables.tf",`${process.cwd()}/dist/templates/aws/predefined/eks/variables.tf.liquid` , "/infrastructure", true);
    this.createFile(`${this.config.environment}-config.tfvars`,`${process.cwd()}/dist/templates/aws/predefined/eks/backend-config.tfvars.liquid` , "/infrastructure",true);
    this.createVpc();
    this.createEKS();
  }

  async createEKS(): Promise<void> {
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/aws/modules/eks-fargate/main.tf.liquid`,
      "/infrastructure/modules/eks-fargate",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/aws/modules/eks-fargate/variables.tf.liquid`,
      "/infrastructure/modules/eks-fargate",
      true
    );
  }
}
