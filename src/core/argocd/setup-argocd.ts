import BaseProject from '../base-project.js';
import { join } from 'path';

export default class argoCdProject extends BaseProject {
  async argoCdProject(path: any, name: any): Promise<void> {
    this.projectPath = join(path, name);
    this.createFile(
      'main.tf',
      `${process.cwd()}/dist/templates/argocd/aws/main.tf.liquid`,
      'infrastructure/modules/argocd',
      true,
    );
    this.createFile(
      'variables.tf',
      `${process.cwd()}/dist/templates/argocd/aws/variables.tf.liquid`,
      'infrastructure/modules/argocd',
      true,
    );
    this.createFile(
      'argocd-values.yaml',
      `${process.cwd()}/dist/templates/argocd/aws/argocd-values.yaml.liquid`,
      'infrastructure/',
      true,
    );
  }
}
