import { executeCommandWithRetry } from "../common-functions/execCommands.js";
import fs from "fs";
import * as path from "path"; // Correct import
import { AppLogger } from "../../logger/appLogger.js";

export async function cloneAndCopyTemplates(): Promise<void> {
  try {
    const parentPath = path.resolve(process.cwd(), ".."); // Get the parent directory
    // Paths for the infrastructure and application repositories
    const dir_infra = `${parentPath}/infrastructure-templates`;
    const dir_templates = `${parentPath}/magikube-templates`;
    const distFolder = `${parentPath}/dist`; // Dist folder path

    if (!fs.existsSync(distFolder)) {
      await executeCommandWithRetry(
        `mkdir -p ${distFolder}/templates/aws`, // Create the required subfolders in dist
        { cwd: parentPath },
        1
      );
    }

    // Clone infrastructure templates repository if not already cloned
    if (!fs.existsSync(dir_infra)) {
      await executeCommandWithRetry(
        "git clone https://github.com/calfus-open-source/infrastructure-templates.git",
        { cwd: parentPath },
        1
      );
    }

    // Copy infrastructure templates to the 'dist' folder
    await executeCommandWithRetry(
      `rsync -av ${dir_infra}/aws/* ${distFolder}/templates/aws/ --prune-empty-dirs > /dev/null 2>&1`,
      { cwd: parentPath },
      1
    );
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

    AppLogger.info("Templates cloned and copied successfully.");
  } catch (error:any) {
    AppLogger.error(
      "An error occurred during the cloning and copying process:",
      error
    );
    throw error; // Re-throw the error for further handling if needed
  }
}
