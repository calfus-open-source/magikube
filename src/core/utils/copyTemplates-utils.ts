import { executeCommandWithRetry } from "./executeCommandWithRetry-utils.js";
import fs from "fs";
import * as path from "path"; // Correct import
import { AppLogger } from "../../logger/appLogger.js";

export async function cloneAndCopyTemplates(commandName: string | undefined, cloud_provider:string): Promise<void> {
  try {
    const parentPath = commandName === "module" || commandName === "create"  ? path.resolve(process.cwd(), "..") : path.resolve(process.cwd());
    const dir_infra = `${parentPath}/infrastructure-templates`;
    const dir_templates = `${parentPath}/magikube-templates`;
    const distFolder = `${parentPath}/dist`; // Dist folder path

    // Clone infrastructure templates repository if not already cloned
    if (!fs.existsSync(dir_infra)) {
      await executeCommandWithRetry(
        "git clone https://github.com/calfus-open-source/infrastructure-templates.git",
        { cwd: parentPath },
        1
      );
    }
    // Copy infrastructure templates to the 'dist' folder
    if (cloud_provider === "aws"){
      await executeCommandWithRetry(
        `rsync -av ${dir_infra}/aws/* ${distFolder}/templates/aws/ --prune-empty-dirs > /dev/null 2>&1`,
        { cwd: parentPath },
        1
      );
    }

    if (cloud_provider === "azure"){
      await executeCommandWithRetry(
        `rsync -av ${dir_infra}/azure/* ${distFolder}/templates/azure/ --prune-empty-dirs > /dev/null 2>&1`,
        { cwd: parentPath },
        1
      );
    }

    await executeCommandWithRetry(
      `rsync -av ${dir_infra}/common-modules/* ${distFolder}/templates/ --prune-empty-dirs > /dev/null 2>&1`,
      { cwd: parentPath },
      1
    );
    // Clean up the infrastructure templates directory
    await executeCommandWithRetry(
      `rm -rf ${dir_infra}`,
      { cwd: parentPath },
      1
    );
    // Clone application templates repository if not already cloned
    if (!fs.existsSync(dir_templates)) {
      await executeCommandWithRetry(
        "git clone https://github.com/calfus-open-source/magikube-templates.git",
        { cwd: parentPath },
        1
      );
    }

    // Copy application templates to the 'dist' folder
    await executeCommandWithRetry(
      `rsync -av ${parentPath}/magikube-templates/* ${distFolder}/ --prune-empty-dirs > /dev/null 2>&1`,
      { cwd: parentPath },
      1
    );

    // Clean up the application templates directory
    await executeCommandWithRetry(
      `rm -rf ${dir_templates}`,
      { cwd: parentPath },
      1
    );
    AppLogger.info("Templates cloned and copied successfully.", true);
  } catch (error:any) {
    AppLogger.error("An error occurred during the cloning and copying process:", error);
    throw error; // Re-throw the error for further handling if needed
  }
}
