import AWSProject from "./aws-project.js";

export default class EKSNodeGroupProject extends AWSProject {
  async createProject(name: string, path: string): Promise<void> {
    super.createProject(name, path);
    this.createMainFile();
  }

  async createMainFile(): Promise<void> {
    this.createFile("main.tf", "../templates/aws/eks-nodegroup/main.tf.liquid");
    this.createFile(
      "terraform.tfvars",
      "../templates/aws/eks-nodegroup/terraform.tfvars.liquid"
    );
    this.createFile(
      "variables.tf",
      "../templates/aws/eks-nodegroup/variables.tf.liquid"
    );
    this.createFile(
      `${this.config.environment}-config.tfvars`,
      "../templates/aws/eks-nodegroup/backend-config.tfvars.liquid"
    );
    this.createCommon();
    this.createEKSng();
  }

  async createEKSng(): Promise<void> {
    this.createFile(
      "main.tf",
      "../templates/aws/modules/eks-nodegroup/main.tf.liquid",
      "./modules/eks-nodegroup"
    );
    this.createFile(
      "variables.tf",
      "../templates/aws/modules/eks-nodegroup/variables.tf.liquid",
      "./modules/eks-nodegroup"
    );
  }
}
