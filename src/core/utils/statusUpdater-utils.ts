import * as fs from "fs";
import path from "path";

// Initialize all services with a "pending" state
export function initializeStatusFile(projectName: string, services: string[]) {
  const projectPath = path.join(process.cwd(), projectName);
  const statusFilePath = path.join(projectPath, "status.json");

  if (!fs.existsSync(projectPath)) {
    fs.mkdirSync(projectPath, { recursive: true });
  }

  let statusData: { [key: string]: any } = {};

  if (fs.existsSync(statusFilePath)) {
    statusData = JSON.parse(fs.readFileSync(statusFilePath, "utf8"));
  }

  services.forEach((service) => {
    if (!(service in statusData)) {
      statusData[service] = "pending";
    }
  });
  fs.writeFileSync(statusFilePath, JSON.stringify(statusData, null, 2), "utf8");
}

// Update the status of a specific service
export function updateStatusFile(
  projectName: any,
  service: string,
  status: "success" | "fail"
) {
  const statusFilePath = path.join(process.cwd(), projectName, "status.json");
  let statusData: { [key: string]: any } = {};

  if (fs.existsSync(statusFilePath)) {
    statusData = JSON.parse(fs.readFileSync(statusFilePath, "utf8"));
  }

  statusData[service] = status;

  fs.writeFileSync(statusFilePath, JSON.stringify(statusData, null, 2), "utf8");
}

// To reade the status.json file
export function readStatusFile(projectName:string){
  const statusFilePath = path.join( process.cwd(),projectName, "status.json");
  if (!fs.existsSync(statusFilePath)) {
  return null;
  }
  const fileContent = fs.readFileSync(statusFilePath, "utf8");
  const statusData = JSON.parse(fileContent);
  return statusData;
};