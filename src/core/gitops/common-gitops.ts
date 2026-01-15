import BaseProject from '../base-project.js';
import { join } from 'path';

export default class gitOpsProject extends BaseProject {
  async createGitOps(path: any, name: any): Promise<void> {
    this.projectPath = join(path, name);

    if (this.config.source_code_repository === 'codecommit') {
      this.createFile(
        'main.tf',
        `${process.cwd()}/dist/templates/gitops/aws/main.tf.liquid`,
        'infrastructure/modules/gitops',
        true,
      );
      this.createFile(
        'variables.tf',
        `${process.cwd()}/dist/templates/gitops/aws/variables.tf.liquid`,
        'infrastructure/modules/gitops',
        true,
      );
    } else if (this.config.source_code_repository === 'github') {
      this.createFile(
        'main.tf',
        `${process.cwd()}/dist/templates/gitops/github/main.tf.liquid`,
        'infrastructure/modules/gitops',
        true,
      );
      this.createFile(
        'variables.tf',
        `${process.cwd()}/dist/templates/gitops/github/variables.tf.liquid`,
        'infrastructure/modules/gitops',
        true,
      );
    }
  }
}
