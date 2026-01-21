import SystemConfig from '../config/system.js';
import BaseCommand from '../commands/base.js';
import AWSProject from './aws/aws-project.js';
import CreateMicroserviceProject from './aws/aws-microservice.js';

export default abstract class MicroserviceProject {
  static async getProject(
    command: BaseCommand,
    projectame?: string,
  ): Promise<AWSProject | null> {
    const projectConfig = SystemConfig.getInstance().getConfig();
    if (projectConfig.cloud_provider === 'aws') {
      return new CreateMicroserviceProject(command, projectConfig);
    }
    command.error(
      `Cloud provider '${projectConfig.cloud_provider}' not supported`,
    );
  }
}
