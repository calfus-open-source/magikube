import BaseCommand from "../../commands/base.js";
import { ManageRepository } from "../manage-repository.js";
import CreateApplication from "../setup-application.js";


export async function setupAndPushServices(status:any, projectConfig:any, configObject:any) {
    let command: BaseCommand | undefined;
    const createApp = new CreateApplication( command as BaseCommand, projectConfig );

    // Setup Authentication Service if failed or pending
    if (status.services["auth-service"] === "fail" || status.services["auth-service"] === "pending") {
        const statusAuthenticationService = await createApp.setupAuthenticationService(projectConfig);
        if (statusAuthenticationService) {
            configObject.appName = "auth-service";
            configObject.appType = "auth-service";
            await ManageRepository.pushCode(configObject);
        }
    }

    // Setup Keycloak Service if failed or pending
    if (status.services["keycloak"] === "fail" || status.services["keycloak"] === "pending") {
        const statusKeycloakService = await createApp.setupKeyCloak(projectConfig);
        if (statusKeycloakService) {
            configObject.appName = "keycloak";
            configObject.appType = "keycloak-service";
            await ManageRepository.pushCode(configObject);
        }
    }

    // Setup Node.js Backend App if failed or pending
    if (status.services["my-node-app"] === "fail" || status.services["my-node-app"] === "pending") {
        if (projectConfig["backend_app_type"]) {
            configObject.appName = projectConfig["node_app_name"];
            configObject.appType = projectConfig["backend_app_type"];
            await createApp.handleAppCreation(projectConfig["backend_app_type"], configObject, projectConfig);
        }
    }

    // Setup Frontend App if failed or pending
    if (projectConfig["frontend_app_type"]) {
        const frontendAppType = projectConfig["frontend_app_type"];
        if (status.services[frontendAppType] === "fail" || status.services[frontendAppType] === "pending") {
            configObject.appType = frontendAppType;
            await createApp.handleAppCreation(frontendAppType, configObject, projectConfig);
        }
    }

       if (status.services["gitops"] === "fail" || status.services["gitops"] === "pending"){
        const setupGitopsServiceStatus = await createApp.setupGitops(projectConfig);
          if (setupGitopsServiceStatus) {
            configObject.appName = `${projectConfig.environment}`;
            configObject.appType = "gitops";
            await ManageRepository.pushCode(configObject);
          }
       }
}