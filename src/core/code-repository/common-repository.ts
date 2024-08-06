import BaseProject from '../base-project.js';
import { join } from 'path';

export default class repositoryProject extends BaseProject {
  async createrepository(path: any, name: any): Promise<void> {
    this.projectPath = join(path, name);
    
    if (this.config.source_code_repository === "codecommit") {
       this.createFile(
         "main.tf",
         `${this.templatePath}/code-repository/aws/main.tf.liquid`,
         "./modules/code-repository"
       );
       this.createFile(
         "variables.tf",
         `${this.templatePath}/code-repository/aws/variables.tf.liquid`,
         "./modules/code-repository"
       );
     } else if (this.config.source_code_repository === "github") {
         this.createFile(
             "main.tf",
             `${this.templatePath}/code-repository/github/main.tf.liquid`,
             "./modules/code-repository",
         );
         this.createFile(
             "variables.tf",
             `${this.templatePath}/code-repository/github/variables.tf.liquid`,
             "./modules/code-repository",
         );
     }
  }
}