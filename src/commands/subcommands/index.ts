import { Args, Flags } from "@oclif/core";
import BaseCommand from "../base.js";
import { AppLogger } from "../../logger/appLogger.js";
import { updateStatusFile } from "../../core/utils/statusUpdater-utils.js";
import { readProjectConfig } from "../../core/utils/magikubeConfigreader.js";
import path from "path";
import { execSync } from "child_process";

export default class NewModule extends BaseCommand {
  static description = "Installs a specified module in an existing magikube project";

  static args = {
    module: Args.string({
      description: "The type of module to install (e.g., vpc, eks, acm)",
      required: true,
    }),
    moduleName: Args.string({
      description: "A unique name for the module being installed",
      required: true,
    }),
  };

  static flags = {
    project: Flags.string({
      char: "p",
      description: "The name of the project in which to install the module",
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(NewModule);
    const projectName = flags.project;
    const moduleType = args.module;
    const moduleName = args.moduleName;
    AppLogger.configureLogger(projectName);
    AppLogger.info("Logger Started ...");
    AppLogger.info(`Starting installation of module '${moduleType}' named '${moduleName}' in project '${projectName}'`, true);

    try {
      // Read project configuration
      const projectConfig = readProjectConfig(projectName, process.cwd());
      const environmentConfig = `${projectConfig.environment}-config.tfvars`;

      // Path to the project's infrastructure directory
      const infrastructurePath = path.join(process.cwd(), projectName, "infrastructure");

      // Run terraform init command
      AppLogger.info("Running terraform init...", true);
      execSync(`terraform init -backend-config="${environmentConfig}"`, {
        cwd: infrastructurePath,
        stdio: 'inherit',  // Directly inherit the input/output streams
      });
      AppLogger.info("Terraform init completed.");

      // Run terraform apply command for the specified module
      AppLogger.info(`Starting terraform apply for module '${moduleType}'...`, true);
      execSync(`terraform apply -target=${moduleType} -var-file="${environmentConfig}" -auto-approve`, {
        cwd: infrastructurePath,
        stdio: 'inherit',  // Directly inherit the input/output streams
      });
      AppLogger.info(`Terraform apply completed for module '${moduleType}'.`);

      AppLogger.info(`Module '${moduleType}' installation completed successfully in project '${projectName}'`, true);
    } catch (error) {
      AppLogger.error(`Error installing module '${moduleType}' in project '${projectName}': ${error}`, true);
      process.exit(1);
    }
  }
}
