import BaseProject from '../base-project.js';
import { join } from 'path';

export default class gitOpsProject extends BaseProject {
  async createGitOps(path: any, name: any): Promise<void> {
    this.projectPath = join(path, name);
    
    if (this.config.source_code_repository === "codecommit") {
       this.createFile(
         "main.tf",
         `${this.templatePath}/gitops/aws/main.tf.liquid`,
         "./modules/gitops"
       );
       this.createFile(
         "variables.tf",
         `${this.templatePath}/gitops/aws/variables.tf.liquid`,
         "./modules/gitops"
       );
     } else if (this.config.source_code_repository === "github") {
         this.createFile(
             "main.tf",
             `${this.templatePath}/gitops/github/main.tf.liquid`,
             "./modules/gitops",
         );
         this.createFile(
             "variables.tf",
             `${this.templatePath}/gitops/github/variables.tf.liquid`,
             "./modules/gitops",
         );
     }
  }
}