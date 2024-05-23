import AWSProject from "./aws-project.js";

export default class EKSFargateProject extends AWSProject {
  async createProject(name: string, path: string): Promise<void> {
    super.createProject(name, path);
    this.createMainFile();
  }

  async createMainFile(): Promise<void> {
    this.createFile("main.tf", "../templates/aws/eks-fargate/main.tf.liquid");
    this.createFile(
      "terraform.tfvars",
      "../templates/aws/eks-fargate/terraform.tfvars.liquid"
    );
    this.createFile(
        "variables.tf",
        "../templates/aws/eks-fargate/variables.tf.liquid"
      );
  
    this.createEKS();
    this.createVpc();
  }

  async createEKS(): Promise<void> {
    this.createFile("main.tf", "../templates/aws/modules/eks-fargate/main.tf.liquid", "./modules/eks-fargate");
    this.createFile(
        "variables.tf",
        "../templates/aws/modules/eks-fargate/variables.tf.liquid", "./modules/eks-fargate"
      );
  
    }  
}
