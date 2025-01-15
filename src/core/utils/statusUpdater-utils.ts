import * as fs from "fs";
import path from "path";
import { AppLogger } from "../../logger/appLogger.js";

export function initializeStatusFile(
  projectName: string,
  modules: string[],
  services?: string[]
) {
  const projectPath = path.join(process.cwd(), projectName);
  const statusFilePath = path.join(projectPath, "status.json");

  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }

  let statusData: { modules: { [key: string]: any }; services: { [key: string]: any } } = {
    modules: {},
    services: {},
  };

  if (fs.existsSync(statusFilePath)) {
    statusData = JSON.parse(fs.readFileSync(statusFilePath, "utf8"));
  }

  // Initialize modules with "pending" status if not already present
  modules.forEach((module) => {
    if (!statusData.modules[module]) {
      statusData.modules[module] = "pending";
    }
  });

  // Initialize services with "pending" status if not already present
 if(services){
   services.forEach((service) => {
     if (!statusData.services[service]) {
       statusData.services[service] = "pending";
     }
   });
 }

  fs.writeFileSync(statusFilePath, JSON.stringify(statusData, null, 2), "utf8");
}



export function updateStatusFile(
  projectName: string ,
  serviceOrModule: string,
  status: "success" | "fail"
) {
  // const statusFilePath = path.join(process.cwd(), projectName, "status.json");
   const statusFilePath = path.join(process.cwd(), projectName, "status.json"); 
  let statusData: {
    modules: { [key: string]: string };
    services: { [key: string]: string };
  } = {
    modules: {},
    services: {},
  };

  // Check if the status file exists and read its content
  if (fs.existsSync(statusFilePath)) {
    statusData = JSON.parse(fs.readFileSync(statusFilePath, "utf8"));
  }

  // Check if the service or module exists in the respective object
  if (statusData.modules && statusData.modules[serviceOrModule] !== undefined) {
    statusData.modules[serviceOrModule] = status;
  } else if (statusData.services && statusData.services[serviceOrModule] !== undefined) {
    statusData.services[serviceOrModule] = status;
  } else {
    AppLogger.error(`Service or module "${serviceOrModule}" not found in the status file.`, true);
    return; // Exit if the service or module does not exist
  }

  // Write the updated status back to the status.json file
  fs.writeFileSync(statusFilePath, JSON.stringify(statusData, null, 2), "utf8");
}


// To reade the status.json file
export function readStatusFile(projectConfig:any){
  const statusFilePath = path.join(process.cwd(), projectConfig.command === "module" ? "" : projectConfig.project_name, "status.json");
  if (!fs.existsSync(statusFilePath)) {
  return null;
  }
  const fileContent = fs.readFileSync(statusFilePath, "utf8");
  const statusData = JSON.parse(fileContent);
  return statusData;
};
