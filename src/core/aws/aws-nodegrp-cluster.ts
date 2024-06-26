import AWSProject from "./aws-project.js";

export default class EKSNodeGrpClusterProject extends AWSProject {
  async createProject(name: string, path: string): Promise<void> {
    super.createProject(name, path);
    this.createMainFile();
  }

  async createMainFile(): Promise<void> {
    this.createFile("main.tf", "../templates/aws/eks-nodegrp-cluster/main.tf.liquid");
    this.createFile(
      "terraform.tfvars",
      "../templates/aws/eks-nodegrp-cluster/terraform.tfvars.liquid"
    );
    this.createFile(
      "variables.tf",
      "../templates/aws/eks-nodegrp-cluster/variables.tf.liquid"
    );

    this.createCommon();
    this.createEKSng();
  }

  async createEKSng(): Promise<void> {
    this.createFile(
      "main.tf",
      "../templates/aws/modules/eks-nodegrp-cluster/main.tf.liquid",
      "./modules/eks-nodegrp-cluster"
    );
    this.createFile(
      "variables.tf",
      "../templates/aws/modules/eks-nodegrp-cluster/variables.tf.liquid",
      "./modules/eks-nodegrp-cluster"
    );
  }
}
