import path, { join } from "path";
import AWSProject from "./aws-project.js";
import SystemConfig from "../../config/system.js";
import { readStatusFile } from "../utils/statusUpdater-utils.js";

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

  async createMainFile(
    moduleType: string | string[],
    projectConfig: any
  ): Promise<void> {
    let lastModule = moduleType[moduleType.length - 1];
    console.log(lastModule, "<<<<<<<latestModule");

    // Store the original lastModule for later use
    const originalLastModule = lastModule;

    // Check if lastModule is 'eks-fargate' or 'eks-nodegroup' and set it to 'eks' for general cases
    if (lastModule === "eks-fargate" || lastModule === "eks-nodegroup") {
      lastModule = "eks";
    }
    console.log(lastModule, "<<<<lastModule");

    const parentPath = path.resolve(process.cwd(), "..");
    const distPath = path.resolve(
      parentPath,
      "dist/templates/aws/predefined/submodule"
    );
    const status = await readStatusFile(this.config, this.config.command);

    await this.createProviderFile(parentPath);
    if (status.modules[`module.${lastModule}`] === "pending") {
      console.log(lastModule, "<<<<<lastmodule1");
      console.log(
        `${distPath}/${originalLastModule}-module/main.tf.liquid`,
        "<<<<<<pathhhhh"
      ); // Use originalLastModule here
      this.createFile(
        "main.tf",
        `${distPath}/${originalLastModule}-module/main.tf.liquid`, // Use originalLastModule here
        "/infrastructure",
        true
      );
      this.createFile(
        "variables.tf",
        `${distPath}/${originalLastModule}-module/variables.tf.liquid`, // Use originalLastModule here
        "/infrastructure",
        true
      );
    }
    console.log(lastModule, "<<<<<lastmodule2");
    this.createFile(
      "terraform.tfvars",
      `${distPath}/${originalLastModule}-module/terraform.tfvars.liquid`, // Use originalLastModule here
      "/infrastructure",
      true
    );

    // Use the originalLastModule for specific conditions
    if (
      originalLastModule === "vpc" &&
      status.modules[`module.${lastModule}`] === "pending"
    ) {
      this.createFile(
        `${this.config.environment}-config.tfvars`,
        `${distPath}/backend-config.tfvars.liquid`,
        "/infrastructure",
        true
      );
      this.createVpc(parentPath);
    } else if (
      originalLastModule === "eks-fargate" && // Use originalLastModule here
      status.modules[`module.eks`] === "pending"
    ) {
      this.createEKS(parentPath);
    } else if (
      originalLastModule === "eks-nodegroup" && // Use originalLastModule here
      status.modules[`module.eks`] === "pending"
    ) {
      this.createEKSng(parentPath);
    } else if (originalLastModule === "rds") {
      // Use originalLastModule here
      this.createRdsmodule(parentPath);
    } else if (originalLastModule === "acm") {
      // Use originalLastModule here
      this.createFile(
        `${this.config.environment}-config.tfvars`,
        `${distPath}/backend-config.tfvars.liquid`,
        "/infrastructure",
        true
      );
      this.createACM(parentPath);
    }
  }
  async createRdsmodule(path: string): Promise<void> {
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
  async createEKSng(path: string): Promise<void> {
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
}
