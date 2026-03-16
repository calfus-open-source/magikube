import BaseCommand from '../../commands/base.js';
import { ManageRepository } from '../manage-repository.js';
import CreateApplication from '../setup-application.js';
import { readStatusFile } from './statusUpdater-utils.js';
import { AppLogger } from '../../logger/appLogger.js';
import { FullConfigObject, ProjectConfig } from '../interface.js';

interface StatusFile {
  services: Record<string, string>;
  modules: Record<string, string>;
}

export async function setupAndPushServices(
  projectConfig: ProjectConfig,
  configObject: FullConfigObject,
) {
  let command: BaseCommand | undefined;
  const createApp = new CreateApplication(
    command as BaseCommand,
    projectConfig,
  );
  const status = await readStatusFile(
    projectConfig,
    typeof projectConfig.command === 'string'
      ? projectConfig.command
      : undefined,
  );
  try {
    if (projectConfig.command === 'new' || projectConfig.command === 'resume') {
      await setupServices(projectConfig, configObject, createApp, status);
    } else if (projectConfig.command === 'create') {
      await createService(projectConfig, configObject, createApp);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    AppLogger.error(`An error occurred during the setup process:: ${message}`);
  }
}

async function setupServices(
  projectConfig: ProjectConfig,
  configObject: FullConfigObject,
  createApp: CreateApplication,
  status: StatusFile,
) {
  if (status.services['auth-service'] !== 'success') {
    await setupService(
      'auth-service',
      'auth-service',
      () => createApp.setupAuthenticationService(projectConfig),
      configObject,
    );
  }
  if (status.services['keycloak'] !== 'success') {
    await setupService(
      'keycloak',
      'keycloak-service',
      () => createApp.setupKeyCloak(projectConfig),
      configObject,
    );
  }
  if (status.services['my-genAI-app'] !== 'success') {
    await setupService(
      'my-genAI-app',
      'gen-ai-service',
      () => createApp.createGenAIApp(projectConfig),
      configObject,
    );
  }

  if (
    projectConfig['backend_app_type'] &&
    status.services['my-node-app'] !== 'success'
  ) {
    await handleServiceCreation(
      projectConfig['backend_app_type'] as string,
      projectConfig['node_app_name'] as string,
      projectConfig,
      configObject,
      createApp,
    );
  }

  if (projectConfig['frontend_app_type']) {
    const frontendAppType = projectConfig['frontend_app_type'] as string;
    if (status.services[frontendAppType] !== 'success') {
      await handleServiceCreation(
        frontendAppType,
        frontendAppType,
        projectConfig,
        configObject,
        createApp,
      );
    }
  }
  if (status.services['gitops'] !== 'success') {
    await setupService(
      'gitops',
      'gitops',
      () => createApp.setupGitops(projectConfig),
      configObject,
      `${projectConfig.environment}`,
    );
  }
}

async function createService(
  projectConfig: ProjectConfig,
  configObject: FullConfigObject,
  createApp: CreateApplication,
) {
  if (projectConfig.service_type === 'auth-service') {
    await setupService(
      'auth-service',
      'auth-service',
      () => createApp.setupAuthenticationService(projectConfig),
      configObject,
    );
  }

  if (projectConfig.service_type === 'keycloak') {
    await setupService(
      'keycloak',
      'keycloak',
      () => createApp.setupKeyCloak(projectConfig),
      configObject,
    );
  }

  if (
    projectConfig['genAI_app_name'] &&
    projectConfig.service_type === 'gen-ai-service'
  ) {
    await setupService(
      'my-genAI-app',
      'my-genAI-app',
      () => createApp.createGenAIApp(projectConfig),
      configObject,
    );
  }

  if (
    projectConfig['backend_app_type'] &&
    projectConfig.service_type === 'backend-service'
  ) {
    await handleServiceCreation(
      projectConfig['backend_app_type'] as string,
      projectConfig['node_app_name'] as string,
      projectConfig,
      configObject,
      createApp,
    );
  }

  if (
    projectConfig['frontend_app_type'] &&
    projectConfig.service_type === 'frontend-service'
  ) {
    const frontendAppType = projectConfig['frontend_app_type'] as string;
    await handleServiceCreation(
      frontendAppType,
      frontendAppType,
      projectConfig,
      configObject,
      createApp,
    );
  }
}

async function setupService(
  serviceName: string,
  appType: string,
  setupFunction: () => Promise<boolean>,
  configObject: FullConfigObject,
  appName?: string,
) {
  try {
    const status = await setupFunction();
    if (status) {
      configObject.common.appName = appName || serviceName;
      configObject.common.appType = appType;
      await ManageRepository.pushCode(configObject);
    }
  } catch (error) {
    AppLogger.error(`Error setting up ${serviceName}: ${error}`);
  }
}

async function handleServiceCreation(
  appType: string,
  appName: string,
  projectConfig: ProjectConfig,
  configObject: FullConfigObject,
  createApp: CreateApplication,
) {
  try {
    configObject.common.appName = appName;
    configObject.common.appType = appType;
    await createApp.handleAppCreation(appType, configObject, projectConfig);
  } catch (error) {
    AppLogger.error(`Error setting up ${appType} App: ${error}`);
  }
}
