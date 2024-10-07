import * as fs from "fs";
import path from "path";

// Initialize all services with a "pending" state
export function initializeModuleFile(projectName: string, modules: string[]) {
  const projectPath = path.join(process.cwd(), projectName);
  const statusFilePath = path.join(projectPath, "updatedmodules.json");

  // Check if the project directory exists; if not, create it
  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }

  let moduleData: { [key: string]: any } = {};

  if (fs.existsSync(statusFilePath)) {
    // If the file exists, load its current data
    moduleData = JSON.parse(fs.readFileSync(statusFilePath, "utf8"));
  }

  // Loop through all services and set their status to "pending" if not already defined
  modules.forEach((module) => {
    if (!(module in moduleData)) {
      moduleData[module] = "pending";
    }
  });

  // Write the updated status to the file (or create the file if it doesn't exist)
  fs.writeFileSync(statusFilePath, JSON.stringify(moduleData, null, 2), "utf8");
}

// Update the status of a specific service
export function updateModuleFile(
  projectName: any,
  module: string,
  status: "true" | "false"
) {
  // Use the same statusFilePath as in initializeStatusFile
  const statusFilePath = path.join(process.cwd(), projectName, "updatedmodules.json");
  let moduleData: { [key: string]: any } = {};

  if (fs.existsSync(statusFilePath)) {
    // Load the current status file
    moduleData = JSON.parse(fs.readFileSync(statusFilePath, "utf8"));
  }

  // Update the specific module status
  moduleData[module] = status;

  // Write the updated status to the file
  fs.writeFileSync(statusFilePath, JSON.stringify(moduleData, null, 2), "utf8");
}

// To reade the module.json file
export function readModuleFile(projectName:string){
  const statusFilePath = path.join( process.cwd(),projectName, "updatedmodules.json");
  if (!fs.existsSync(statusFilePath)) {
  return null;
  }
  const fileContent = fs.readFileSync(statusFilePath, "utf8");
  const statusData = JSON.parse(fileContent);
  return statusData;
};