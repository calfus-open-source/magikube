import AWSProject from "./aws-project.js";
import AWSBackend from "./aws-backend.js";

export default class EKSFargateProject extends AWSProject {
  async createProject(name: string, path: string): Promise<void> {
    super.createProject(name, path);
    AWSBackend.create(
      this,
      `${this.config.project_id}-tfstate`,
      this.config.aws_region,
      this.config.aws_access_key_id,
      this.config.aws_secret_access_key
    );
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
  
    this.createVpc();
  }
}
