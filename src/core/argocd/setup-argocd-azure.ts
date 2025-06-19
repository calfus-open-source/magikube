import BaseProject from "../base-project.js";
import { join } from 'path';

export default class argoCdProjectAzure extends BaseProject {
  async argoCdProject(path: any, name: any): Promise<void> {
    this.projectPath = join(path, name);
       this.createFile(
         "main.tf",
         `${process.cwd()}/dist/templates/argocd/azure/main.tf.liquid`,
         "infrastructure/modules/argocd",
         true
       );
       this.createFile(
         "variables.tf",
         `${process.cwd()}/dist/templates/argocd/azure/variables.tf.liquid`,
         "infrastructure/modules/argocd",
         true
       );
      this.createFile(
        "argocd-values.yaml",
        `${process.cwd()}/dist/templates/argocd/azure/argocd-values.yaml.liquid`,
        "infrastructure/",
        true
      );
    }
}