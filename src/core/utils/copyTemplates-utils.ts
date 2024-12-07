import { executeCommandWithRetry } from "../common-functions/execCommands.js";
import fs from "fs";

export async function cloneAndCopyTemplates(): Promise<void> {

  // Cloning infrastructure templates and adding them to dist
  const dir_infra = `${process.cwd()}/infrastructure-templates`;
  const path_infra = process.cwd();
  if (!fs.existsSync(dir_infra)) {
    await executeCommandWithRetry("git clone -b sp https://github.com/calfus-open-source/infrastructure-templates.git",{ cwd: path_infra },1);
  }

  await executeCommandWithRetry("mkdir -p dist/templates/aws/ && rsync -av infrastructure-templates/aws/* dist/templates/aws/ --prune-empty-dirs > /dev/null 2>&1", { cwd: path_infra },1);
  await executeCommandWithRetry("rsync -av infrastructure-templates/common-modules/* dist/templates/ --prune-empty-dirs > /dev/null 2>&1", { cwd: path_infra },1);
  await executeCommandWithRetry(`rm -rf ${dir_infra}`, { cwd: path_infra }, 1);

  // Cloning Application templates and adding them to dist
  const dir = `${process.cwd()}/magikube-templates`;
  const path = process.cwd();

  // Clone the repository if it doesn't exist
  if (!fs.existsSync(dir)) {
    await executeCommandWithRetry("git clone https://github.com/calfus-open-source/magikube-templates.git", { cwd: path }, 1);
  }

  // Copy templates to the 'dist' folder
  await executeCommandWithRetry("rsync -av magikube-templates/* dist/ --prune-empty-dirs > /dev/null 2>&1", { cwd: path }, 1);

  // Clean up the templates directory
  await executeCommandWithRetry(`rm -rf ${dir}`, { cwd: path }, 1);
}

