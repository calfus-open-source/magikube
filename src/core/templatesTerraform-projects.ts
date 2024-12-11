import SystemConfig from "../config/system.js";
import BaseCommand from "../commands/base.js";
import AWSProject from "./aws/aws-project.js";
import AWSTemplateProject from "./aws/aws-template-project.js";
import { supportedTemplates } from "./constants/constants.js";
export default abstract class TemplateTerraformProject {
  static async getProject(command: BaseCommand): Promise<AWSProject | null> {
    const config = SystemConfig.getInstance().getConfig();

    if (config.cloud_provider === "aws") {
      if (supportedTemplates.includes(config.template)) {
        return new AWSTemplateProject(command, config);
      }
      command.error(`Template '${config.template}' not supported`);
    }
    command.error(`Cloud provider '${config.cloud_provider}' not supported`);
  }
}
