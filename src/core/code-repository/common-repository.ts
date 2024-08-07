import BaseProject from '../base-project.js';
import { join } from 'path';

export default class repositoryProject extends BaseProject {
  async createrepository(path: any, name: any): Promise<void> {
    this.projectPath = join(path, name);
    
    if (this.config.source_code_repository === "codecommit") {
       this.createFile(
         "main.tf",
         "../templates/code-repository/aws/main.tf.liquid",
         "infrastructure/modules/code-repository"
       );
       this.createFile(
         "variables.tf",
         "../templates/code-repository/aws/variables.tf.liquid",
         "infrastructure/modules/code-repository"
       );
     } else if (this.config.source_code_repository === "github") {
         this.createFile(
             "main.tf",
             "../templates/code-repository/github/main.tf.liquid",
             "infrastructure/modules/code-repository",
         );
         this.createFile(
             "variables.tf",
             "../templates/code-repository/github/variables.tf.liquid",
             "infrastructure/modules/code-repository",
         );
     }
  }
}