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
    this.createMainFile(projectConfig);
  }

  async createMainFile(projectConfig: any): Promise<void> {
    const moduleTypesArray = Object.keys(projectConfig.modules);
    let lastModuleType = moduleTypesArray[moduleTypesArray.length - 1];
    const originalLastModule = lastModuleType;

    // Normalize for logic purposes, but keep original for accessing files/status
    if (
      lastModuleType === "eks-fargate" ||
      lastModuleType === "eks-nodegroup"
    ) {
      lastModuleType = "eks";
    }

    const parentPath = path.resolve(process.cwd(), "..");
    const distPath = path.resolve(
      parentPath,
      "dist/templates/aws/predefined/submodule"
    );
    const status = await readStatusFile(this.config, this.config.command);

    await this.createProviderFile(parentPath);
    const moduleStatus = status.modules[originalLastModule];

    if (moduleStatus === "pending") {
      this.createFile(
        "main.tf",
        `${distPath}/${originalLastModule}-module/main.tf.liquid`,
        "/infrastructure",
        true
      );
      this.createFile(
        "variables.tf",
        `${distPath}/${originalLastModule}-module/variables.tf.liquid`,
        "/infrastructure",
        true
      );
    }

    this.createFile(
      "terraform.tfvars",
      `${distPath}/${originalLastModule}-module/terraform.tfvars.liquid`,
      "/infrastructure",
      true
    );

    if (originalLastModule === "vpc" && moduleStatus === "pending") {
      this.createFile(
        `${this.config.environment}-config.tfvars`,
        `${distPath}/backend-config.tfvars.liquid`,
        "/infrastructure",
        true
      );
      this.createVpc(parentPath);
    } else if (
      originalLastModule === "eks-fargate" &&
      moduleStatus === "pending"
    ) {
      this.createEKS(parentPath);
    } else if (
      originalLastModule === "eks-nodegroup" &&
      moduleStatus === "pending"
    ) {
      this.createEKSng(parentPath);
    } else if (originalLastModule === "rds" && moduleStatus === "pending") {
      this.createRdsmodule(parentPath);
    } else if (originalLastModule === "acm" && moduleStatus === "pending") {
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
