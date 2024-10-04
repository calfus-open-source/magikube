import pkg from "follow-redirects";
import { AppLogger } from "../../logger/appLogger.js";
import ora from "ora";

const { http } = pkg;

// Function to check if service is up 
export function checkServiceStatus(url: string): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const req = http.get(url, (res: any) => {
      resolve(res.statusCode === 200);
    });
    req.on("error", () => {
      resolve(false);
    });
  });
}

// Function to wait until the Keycloak service is up
export async function waitForServiceToUP(
  serviceURL: string,
  AppName: any
): Promise<boolean> {
  const retries = 25;
  const delay = 30000;

  const spinner = ora(`Checking ${AppName} service status...`).start();

  for (let i = 0; i < retries; i++) {
    const isUp = await checkServiceStatus(serviceURL);

        if (isUp) {
        spinner.succeed(`${AppName} service is up and running!`);
        return true;
        }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }


  spinner.fail(`Failed to detect that ${AppName} service is up. Exiting...`);
  AppLogger.error(
    `Failed to detect that ${AppName} service is up. Exiting...`,
    true
  );
  return false;
}
