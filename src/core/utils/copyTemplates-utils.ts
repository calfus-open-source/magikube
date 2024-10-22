import { executeCommandWithRetry } from "../common-functions/execCommands.js";
import fs from "fs";

export async function cloneAndCopyTemplates(): Promise<void> {
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

