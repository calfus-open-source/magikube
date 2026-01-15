import pkg from "follow-redirects";
import { AppLogger } from "../../logger/appLogger.js";
import ora from "ora";
import { executeCommandWithRetry } from "./executeCommandWithRetry-utils.js";
import fs from "fs";
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
  const retries = 20;
  const delay = 20000;

  const spinner = ora(`Checking ${AppName} service status...`).start();

  for (let i = 0; i < retries; i++) {
    const isUp = await checkServiceStatus(serviceURL);

    if (isUp) {
      spinner.succeed(`${AppName} service is UP`);
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  spinner.fail(`${AppName.charAt(0).toUpperCase() + AppName.slice(1)} service is DOWN`);
  AppLogger.error(
    `${AppName.charAt(0).toUpperCase() + AppName.slice(1)} service is not up. Please check the service.`,
    true
  );
  return false;
}

export async function serviceHealthCheck(args: any, responses: any, projectConfig: any) {
  const keycloakConfigPath = `${process.cwd()}/${args.name}/keycloak/config.sh`;
  const keycloakUrl = `http://${responses.domain}/keycloak`;
  const frontendURL = `http://${responses.domain}`;
  const argocdURL = `http://argocd.${responses.domain}`;

  const isKeycloakUp = await waitForServiceToUP(keycloakUrl, "keycloak");
  if (isKeycloakUp && fs.existsSync(keycloakConfigPath)) {
    await executeCommandWithRetry(`chmod +x config.sh && /bin/sh ./config.sh`, { cwd: `${process.cwd()}/${args.name}/keycloak` }, 1);
  } else {
    AppLogger.error("config.sh file not found", true);
  }

  const frontendAppType = projectConfig.frontend_app_type;
  const isArgoCDUp = await waitForServiceToUP(argocdURL, "argocd");
  const isFrontendUp = await waitForServiceToUP(frontendURL, frontendAppType);

  // Log the results and provide clickable link
  if (isKeycloakUp && isArgoCDUp && isFrontendUp) {
    const clickableLink = `\u001b]8;;${frontendURL}\u001b\\\u001b[34;4m${frontendURL}\u001b[0m\u001b]8;;\u001b\\`;
    const username = "magikube_user@example.com";
    const password = "welcome";
    AppLogger.info(`Magikube application is up and running at ${clickableLink}`, true);
    AppLogger.info(`Login using\nUsername: ${username}\nPassword: ${password}`, true);
  } else {
    AppLogger.error("One or more services failed to start. Please check the service.", true);
  }

  return { isKeycloakUp, isArgoCDUp, isFrontendUp, frontendURL };
}