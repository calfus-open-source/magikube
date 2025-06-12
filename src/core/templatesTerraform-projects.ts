import SystemConfig from "../config/system.js";
import BaseCommand from "../commands/base.js";
import AWSProject from "./aws/aws-project.js";
import AWSTemplateProject from "./aws/aws-template-project.js";
import AzureTemplateProject from "./azure/azure-template-project.js";
import BaseProject from "./base-project.js";
import { CloudProject } from "./interfaces/cloud-project.js";
import { supportedTemplates } from "./constants/constants.js";

export default abstract class TemplateTerraformProject {
  static async getProject(command: BaseCommand): Promise<(BaseProject & CloudProject) | null> {
    const config = SystemConfig.getInstance().getConfig();

    if (config.cloud_provider === "aws") {
      if (supportedTemplates.includes(config.template)) {
        return new AWSTemplateProject(command, config) as BaseProject & CloudProject;
      }
      command.error(`Template '${config.template}' not supported`);
    } else if (config.cloud_provider === "azure") {
      if (supportedTemplates.includes(config.template)) {
        return new AzureTemplateProject(command, config) as BaseProject & CloudProject;
      }
      command.error(`Template '${config.template}' not supported`);
    }
    command.error(`Cloud provider '${config.cloud_provider}' not supported`);
  }
}
