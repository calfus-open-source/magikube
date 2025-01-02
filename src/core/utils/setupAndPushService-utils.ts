import path from "path";
import BaseCommand from "../../commands/base.js";
import { ManageRepository } from "../manage-repository.js";
import CreateApplication from "../setup-application.js";
import fs from "fs";
import { readStatusFile } from "./statusUpdater-utils.js";
import { AppLogger } from "../../logger/appLogger.js";

export async function setupAndPushServices(projectConfig: any,configObject: any) {
  let command: BaseCommand | undefined;
  const createApp = new CreateApplication(command as BaseCommand, projectConfig);
  const status = await readStatusFile(projectConfig.project_name);
  try {
    // Setup Authentication Service if failed or pending
    if (status.services["auth-service"] !== "success") {
      try {
        const statusAuthenticationService = await createApp.setupAuthenticationService(projectConfig);
        if (statusAuthenticationService) {
          configObject.appName = "auth-service";
          configObject.appType = "auth-service";
          await ManageRepository.pushCode(configObject);
        }
      } catch (error) {
        AppLogger.error(`Error setting up Authentication Service: ${error}`);
      }
    }

    // Setup Keycloak Service if failed or pending
    if (status.services["keycloak"] !== "success") {
      try {
        const statusKeycloakService = await createApp.setupKeyCloak(projectConfig);
        if (statusKeycloakService) {
          configObject.appName = "keycloak";
          configObject.appType = "keycloak-service";
          await ManageRepository.pushCode(configObject);
        }
      } catch (error) {
        AppLogger.error(`Error setting up Keycloak Service: ${error}`);
      }
    }

    // Setup Node.js Backend App if failed or pending
    if (
      projectConfig["backend_app_type"] &&
      status.services["my-node-app"] !== "success"
    ) {
      try {
        configObject.appName = projectConfig["node_app_name"];
        configObject.appType = projectConfig["backend_app_type"];
        await createApp.handleAppCreation( projectConfig["backend_app_type"],configObject,projectConfig);
      } catch (error) { 
        AppLogger.error(`Error setting up Node.js Backend App: ${error}`);
      }
    }

    // Setup Frontend App if failed or pending
    if (projectConfig["frontend_app_type"]) {
      const frontendAppType = projectConfig["frontend_app_type"];
      if (status.services[frontendAppType] !== "success") {
        try {
          configObject.appType = frontendAppType;
          await createApp.handleAppCreation(frontendAppType,
            configObject,
            projectConfig
          );
        } catch (error) {
          AppLogger.error(`Error setting up Frontend App (${frontendAppType}): ${error}`);
        }
      }
    }

    // Setup GitOps if failed or pending
    if (status.services["gitops"] !== "success") {
      try {
        const setupGitopsServiceStatus = await createApp.setupGitops(
          projectConfig
        );
        if (setupGitopsServiceStatus) {
          configObject.appName = `${projectConfig.environment}`;
          configObject.appType = "gitops";
          await ManageRepository.pushCode(configObject);
        }
      } catch (error) {
        AppLogger.error(`Error setting up GitOps: ${error}`);
      }
    }
  } catch (error:any) {
    AppLogger.error(`An error occurred during the setup process:: ${error.message}`);
  }
}

