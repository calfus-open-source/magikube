import { join } from 'path';
import BaseProject from '../base-project.js';
import path from 'path';

export default class repositoryProject extends BaseProject {
  async createrepository(repoPath: any, name: any): Promise<void> {
    this.projectPath = join(repoPath, name);

    if (this.config.source_code_repository === 'github') {
      let folderPath;
      if (this.config.command === 'create') {
        folderPath = path.resolve(process.cwd(), '..');
      } else {
        folderPath = process.cwd();
      }
      this.createFile(
        'main.tf',
        `${folderPath}/dist/templates/code-repository/github/main.tf.liquid`,
        'infrastructure/modules/code-repository',
        true,
      );
      this.createFile(
        'variables.tf',
        `${folderPath}/dist/templates/code-repository/github/variables.tf.liquid`,
        'infrastructure/modules/code-repository',
        true,
      );
    }
  }
}
