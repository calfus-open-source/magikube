import BaseProject from "../base-project.js";
import { join } from 'path';

export default class argoCdProject extends BaseProject {
  async argoCdProject(path: any, name: any): Promise<void> {
    this.projectPath = join(path, name);
       this.createFile(
         "main.tf",
         "../templates/argocd/aws/main.tf.liquid",
         "./modules/argocd"
       );
       this.createFile(
         "variables.tf",
         "../templates/argocd/aws/variables.tf.liquid",
         "./modules/argocd"
       );
      this.createFile(
        "argocd-values.yaml",
        "../templates/argocd/aws/argocd-values.yaml.liquid",
        "./"
      );
    }
}