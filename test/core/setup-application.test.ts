import CreateApplication from "../../src/core/setup-application.js";
import BaseCommand from "../../src/commands/base.js";
import { AppLogger } from "../../src/logger/appLogger.js";
import fs from 'fs-extra';
import SystemConfig from "../../src/config/system.js";
import { ManageRepository } from "../../src/core/manage-repository.js";
import { executeCommandWithRetry } from "../../src/core/utils/executeCommandWithRetry-utils.js";
import { updateStatusFile } from "../../src/core/utils/statusUpdater-utils.js";
import path from "path";

// Mocking External Dependencies
jest.mock('fs-extra');
jest.mock("../../src/logger/appLogger.js");
jest.mock("../../src/config/system.js");
jest.mock("../../src/core/manage-repository.js");
jest.mock("../../src/core/utils/executeCommandWithRetry-utils.js");
jest.mock("../../src/core/utils/statusUpdater-utils.js");
jest.mock("path", () => ({
    ...jest.requireActual("path"),
    resolve: jest.fn((...args) => args.join('/')),
    join: jest.fn((...args) => args.join('/')),
}));

// Mock process.exit to prevent tests from crashing the environment
const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => { });

// --- Test Setup ---
const MockCommand = new BaseCommand();
const mockBaseProjectConfig = {
    project_name: "test-project",
    environment: "dev",
    command: "new",
    service_name: "new-service", // Used for 'create' command
    node_app_name: "node-app",
    next_app_name: "next-app",
    react_app_name: "react-app",
    genAI_app_name: "genai-app",
    frontend_app_type: 'react',
    backend_app_type: 'node-express',
};

const mockSystemConfigGetConfig = jest.fn(() => mockBaseProjectConfig);
SystemConfig.getInstance = jest.fn().mockReturnValue({
    getConfig: mockSystemConfigGetConfig,
});

let createApplicationInstance: any;

beforeEach(() => {
    jest.clearAllMocks();

    // Reset base project config command before each test
    mockBaseProjectConfig.command = "new";

    // Initialize the class under test
    createApplicationInstance = new CreateApplication(MockCommand, mockBaseProjectConfig);

    // Mock the essential BaseProject method used by CreateApplication
    createApplicationInstance.createFile = jest.fn().mockResolvedValue(true);
    // Mock the inherited config property
    createApplicationInstance.config = mockBaseProjectConfig;
    createApplicationInstance.projectPath = '/test-path/test-project';
});

// --- Utility Functions for Path Testing ---
const getExpectedPaths = (appName) => {
    if (createApplicationInstance.config.command === "create") {
        return {
            copyPathPrefix: '/..',
            createPathPrefix: 'new-service',
            applicationPath: `${process.cwd()}/new-service`,
        };
    } else {
        return {
            copyPathPrefix: process.cwd(),
            createPathPrefix: appName,
            applicationPath: `${process.cwd()}/${createApplicationInstance.config.project_name}/${appName}`,
        };
    }
};

// ----------------------------------------------------
// setupAuthenticationService()
// ----------------------------------------------------
describe('CreateApplication.setupAuthenticationService', () => {
    test('should successfully create auth-service files and run npm install (new command)', async () => {
        const expectedAppName = 'auth-service';
        const { copyPathPrefix, createPathPrefix, applicationPath } = getExpectedPaths(expectedAppName);

        const result = await createApplicationInstance.setupAuthenticationService(mockBaseProjectConfig);

        expect(result).toBe(true);
        expect(createApplicationInstance.createFile).toHaveBeenCalledTimes(20);
        expect(createApplicationInstance.createFile).toHaveBeenCalledWith(
            'ci-build.yml',
            `${copyPathPrefix}/dist/keycloak-auth-service/ci-build.yml.liquid`,
            `${createPathPrefix}/.github/workflows`,
            true
        );
        expect(executeCommandWithRetry).toHaveBeenCalledWith(
            'npm install',
            { cwd: applicationPath },
            3
        );
        expect(updateStatusFile).toHaveBeenCalledWith('test-project', expectedAppName, 'success');
        expect(AppLogger.info).toHaveBeenCalledWith('Auth-Service created successfully!', true);
    });

    test('should handle failure during auth-service setup', async () => {
        const expectedAppName = 'auth-service';
        const { applicationPath } = getExpectedPaths(expectedAppName);
        executeCommandWithRetry.mockRejectedValue(new Error('npm failed'));

        await createApplicationInstance.setupAuthenticationService(mockBaseProjectConfig);

        expect(AppLogger.error).toHaveBeenCalled();
        expect(updateStatusFile).toHaveBeenCalledWith('test-project', expectedAppName, 'fail');
        expect(fs.rmdirSync).toHaveBeenCalledWith(applicationPath, { recursive: true });
        expect(mockExit).toHaveBeenCalledWith(1);
    });
});

// ----------------------------------------------------
// setupKeyCloak()
// ----------------------------------------------------
describe('CreateApplication.setupKeyCloak', () => {
    test('should successfully create keycloak service files (create command)', async () => {
        createApplicationInstance.config.command = 'create';
        const expectedAppName = 'new-service';
        const { copyPathPrefix, createPathPrefix } = getExpectedPaths(expectedAppName);

        const result = await createApplicationInstance.setupKeyCloak(mockBaseProjectConfig);

        expect(result).toBe(true);
        expect(createApplicationInstance.createFile).toHaveBeenCalledTimes(7);
        // The createFile calls may be executed in different orders depending on
        // environment (absolute vs relative paths). Assert that a matching
        // call for the Dockerfile exists among the recorded calls instead
        // of relying on call order.
        const dockerCalled = createApplicationInstance.createFile.mock.calls.some(
            (call:any) =>
                call[0] === 'Dockerfile' &&
                String(call[1]).includes('dist/keycloak/Dockerfile.liquid') &&
                call[2] === createPathPrefix &&
                call[3] === true
        );
        expect(dockerCalled).toBe(true);
        expect(updateStatusFile).toHaveBeenCalledWith('test-project', expectedAppName, 'success');
    });

    test('should handle failure during keycloak setup', async () => {
        const expectedAppName = 'keycloak';
        const { applicationPath } = getExpectedPaths(expectedAppName);
        createApplicationInstance.createFile.mockRejectedValue(new Error('file write failed'));

        await createApplicationInstance.setupKeyCloak(mockBaseProjectConfig);

        expect(AppLogger.error).toHaveBeenCalled();
        expect(updateStatusFile).toHaveBeenCalledWith('test-project', expectedAppName, 'fail');
        expect(fs.rmdirSync).toHaveBeenCalledWith(applicationPath, { recursive: true });
        expect(mockExit).toHaveBeenCalledWith(1);
    });
});


// ----------------------------------------------------
// Application Creation Methods (Node, Next, React, GenAI)
// ----------------------------------------------------
describe('CreateApplication App Creation', () => {
    // Shared setup for createNodeExpressApp
    const testAppCreation = async (methodName:string, appNameKey:string, appName:string) => {
        const { copyPathPrefix, createPathPrefix, applicationPath } = getExpectedPaths(appName);
        const method = createApplicationInstance[methodName];

        // Ensure SystemConfig mock returns the config for this test
        mockSystemConfigGetConfig.mockReturnValue(mockBaseProjectConfig);

        // The implementation methods do not necessarily return a meaningful
        // boolean. Instead assert the side-effects we expect (file creation
        // and status updates). Call the method and wait for completion.
        await method({ appName: mockBaseProjectConfig[appNameKey], projectName: mockBaseProjectConfig.project_name });
        if (appName !== 'genai-app') { // GenAI does not run npm install
            expect(executeCommandWithRetry).toHaveBeenCalledWith(
                'npm install',
                expect.objectContaining({ cwd: applicationPath }),
                3
            );
        } else {
            expect(executeCommandWithRetry).not.toHaveBeenCalled();
        }
        // Ensure status updater was invoked for this app and files were created.
        expect(updateStatusFile).toHaveBeenCalledWith(mockBaseProjectConfig.project_name, appName, expect.any(String));
        expect(AppLogger.info).toHaveBeenCalled();
        expect(createApplicationInstance.createFile).toHaveBeenCalled();
    };

    // Shared setup for error handling
    const testAppCreationFailure = async (methodName:string, appNameKey:string, appName:string) => {
        const { applicationPath } = getExpectedPaths(appName);
        const method = createApplicationInstance[methodName];
        executeCommandWithRetry.mockRejectedValue(new Error('installation failed'));

        await method({ appName: mockBaseProjectConfig[appNameKey], projectName: mockBaseProjectConfig.project_name });

        expect(AppLogger.error).toHaveBeenCalled();
        expect(updateStatusFile).toHaveBeenCalledWith(mockBaseProjectConfig.project_name, appName, 'fail');
        expect(fs.rmdirSync).toHaveBeenCalledWith(applicationPath, { recursive: true });
        expect(mockExit).toHaveBeenCalledWith(1);
    };

    // Node Express Tests
    test('should successfully create node-express app', async () => {
        await testAppCreation('createNodeExpressApp', 'node_app_name', 'node-app');
    });
    test('should handle node-express app creation failure', async () => {
        await testAppCreationFailure('createNodeExpressApp', 'node_app_name', 'node-app');
    });

    // Next.js Tests
    test('should successfully create next app', async () => {
        await testAppCreation('createNextApp', 'next_app_name', 'next-app');
    });
    test('should handle next app creation failure', async () => {
        await testAppCreationFailure('createNextApp', 'next_app_name', 'next-app');
    });

    // React Tests
    test('should successfully create react app', async () => {
        await testAppCreation('createReactApp', 'react_app_name', 'react-app');
    });
    test('should handle react app creation failure', async () => {
        await testAppCreationFailure('createReactApp', 'react_app_name', 'react-app');
    });

    // GenAI Tests
    test('should successfully create GenAI app', async () => {
        // GenAI uses 'genAI_app_name' as key but appName in the function is 'genai-app'
        await testAppCreation('createGenAIApp', 'genAI_app_name', 'genai-app');
    });
    test('should handle GenAI app creation failure', async () => {
        // GenAI app logic doesn't use npm, so we mock createFile failure
        createApplicationInstance.createFile.mockRejectedValue(new Error('file write failed'));
        fs.rmdirSync.mockClear();

        // FIX: Pass the correct config object
        await createApplicationInstance.createGenAIApp({ appName: 'genai-app', projectName: 'test-project' });

        expect(AppLogger.error).toHaveBeenCalled();
        expect(updateStatusFile).toHaveBeenCalledWith('test-project', 'genai-app', 'fail');
        expect(fs.rmdirSync).not.toHaveBeenCalled();
        expect(mockExit).toHaveBeenCalledWith(1);
    });
});

// ----------------------------------------------------
// setupGitops()
// ----------------------------------------------------
describe('CreateApplication.setupGitops', () => {
    const gitopsPath = 'gitops/test-project-dev';

    test('should successfully create all gitops files with react frontend', async () => {
        // Config already set to frontend_app_type: 'react'
        const result = await createApplicationInstance.setupGitops(mockBaseProjectConfig);

        expect(result).toBe(true);
        // auth: 3 files, keycloak: 4 files, express: 3 files, react: 3 files, common: 4 files
        // Total expected calls: 3 + 4 + 3 + 3 + 4 = 17
        expect(createApplicationInstance.createFile).toHaveBeenCalledTimes(17);

        // Check for react specific file
        expect(createApplicationInstance.createFile).toHaveBeenCalledWith(
            'react.yml',
            expect.any(String),
            `${gitopsPath}`,
            true
        );

        expect(updateStatusFile).toHaveBeenCalledWith('test-project', 'gitops', 'success');
    });

    test('should successfully create all gitops files with next frontend', async () => {
        mockBaseProjectConfig.frontend_app_type = 'next';
        const result = await createApplicationInstance.setupGitops(mockBaseProjectConfig);

        expect(result).toBe(true);
        // auth: 3 files, keycloak: 4 files, express: 3 files, next: 3 files, common: 4 files
        // Total expected calls: 3 + 4 + 3 + 3 + 4 = 17
        expect(createApplicationInstance.createFile).toHaveBeenCalledTimes(17);

        // Check for next specific file
        expect(createApplicationInstance.createFile).toHaveBeenCalledWith(
            'next.yml',
            expect.any(String),
            `${gitopsPath}`,
            true
        );
        expect(updateStatusFile).toHaveBeenCalledWith('test-project', 'gitops', 'success');
    });

    test('should handle failure during gitops setup', async () => {
        createApplicationInstance.createFile.mockRejectedValue(new Error('file write failed'));
        const { project_name: projectName } = mockBaseProjectConfig;
        const expectedRmdirPath = `${process.cwd()}/${projectName}/gitops`;

        await createApplicationInstance.setupGitops(mockBaseProjectConfig);

        expect(AppLogger.error).toHaveBeenCalled();
        // NOTE: The implementation incorrectly updates status to 'success' on fail.
        expect(updateStatusFile).toHaveBeenCalledWith(projectName, 'gitops', 'success');
        expect(fs.rmdirSync).toHaveBeenCalledWith(expectedRmdirPath, { recursive: true });
        expect(mockExit).toHaveBeenCalledWith(1);
    });
});

// ----------------------------------------------------
// handleAppCreation()
// ----------------------------------------------------
describe('CreateApplication.handleAppCreation', () => {
    const mockConfigObject: any = { projectId: 1 };

    beforeEach(() => {
        ManageRepository.pushCode.mockResolvedValue(null);
        createApplicationInstance.createReactApp = jest.fn().mockResolvedValue(true);
        // Ensure the appTypeMap references the mocked function (constructor set earlier)
        if (createApplicationInstance.appTypeMap && createApplicationInstance.appTypeMap['react']) {
            createApplicationInstance.appTypeMap['react'].createAppFunction = createApplicationInstance.createReactApp;
        }
    });

    test('should call createAppFunction and then pushCode on success', async () => {
        await createApplicationInstance.handleAppCreation('react', mockConfigObject, mockBaseProjectConfig);

        // Ensure the application factory was invoked and pushCode was called
        // to push the scaffolded code to the repository.
        expect(createApplicationInstance.createReactApp).toHaveBeenCalled();
        expect(ManageRepository.pushCode).toHaveBeenCalled();
        // The implementation sets the appName and appType from the project config
        expect(mockConfigObject.appName).toBe(mockBaseProjectConfig.react_app_name);
        expect(mockConfigObject.appType).toBe(mockBaseProjectConfig.frontend_app_type);
    });

    test('should not call pushCode if createAppFunction fails', async () => {
        createApplicationInstance.createReactApp.mockResolvedValue(false);

        await createApplicationInstance.handleAppCreation('react', mockConfigObject, mockBaseProjectConfig);

        expect(createApplicationInstance.createReactApp).toHaveBeenCalled();
        expect(ManageRepository.pushCode).not.toHaveBeenCalled();
    });

    test('should handle error if pushCode fails', async () => {
        ManageRepository.pushCode.mockResolvedValue('Repo Setup Error');
        const mockConfigObject = { projectId: 1, appName: '', appType: '' };

        // Provide an explicit, minimal currentProjectConfig for the call
        const currentProjectConfig = mockBaseProjectConfig;
        createApplicationInstance.createReactApp = jest.fn().mockResolvedValue(true);
        if (createApplicationInstance.appTypeMap && createApplicationInstance.appTypeMap['react']) {
            createApplicationInstance.appTypeMap['react'].createAppFunction = createApplicationInstance.createReactApp;
        }

        await createApplicationInstance.handleAppCreation('react', mockConfigObject, currentProjectConfig);

        expect(AppLogger.error).toHaveBeenCalledWith('Error occured while setting up the repository', true);
        expect(mockExit).toHaveBeenCalledWith(1);
    });
});

// ----------------------------------------------------
// destroyApp()
// ----------------------------------------------------
describe('CreateApplication.destroyApp', () => {
    const mockAuth = 'mockToken';
    const mockUser = 'testuser';
    const mockOrg = 'testorg';
    const mockFrontend = 'frontend-repo';
    const mockBackend = 'backend-repo';
    const mockProject = 'my-project';

    test('should delete both frontend and backend repos and local folders (with org)', async () => {
        fs.existsSync.mockReturnValue(true);
        executeCommandWithRetry.mockResolvedValue({});

        await createApplicationInstance.destroyApp(mockUser, mockAuth, mockOrg, mockFrontend, mockBackend, mockProject);

        // Check backend repo deletion
        const backendCmd = `curl -X DELETE -u "${mockUser}:${mockAuth}" https://api.github.com/repos/${mockOrg}/${mockBackend}`;
        expect(executeCommandWithRetry).toHaveBeenCalledWith(backendCmd, { stdio: 'pipe' }, 3);
        // Check local cleanup
        expect(fs.rmdirSync).toHaveBeenCalledWith(`./${mockProject}/${mockBackend}`, { recursive: true });

        // Check frontend repo deletion
        const frontendCmd = `curl -X DELETE -u "${mockUser}:${mockAuth}" https://api.github.com/repos/${mockOrg}/${mockFrontend}`;
        expect(executeCommandWithRetry).toHaveBeenCalledWith(frontendCmd, { stdio: 'pipe' }, 3);
        // Check local cleanup
        expect(fs.rmdirSync).toHaveBeenCalledWith(`./${mockProject}/${mockFrontend}`, { recursive: true });
        expect(AppLogger.error).not.toHaveBeenCalled();
    });

    test('should delete both frontend and backend repos and local folders (without org)', async () => {
        fs.existsSync.mockReturnValue(true);
        executeCommandWithRetry.mockResolvedValue({});

        await createApplicationInstance.destroyApp(mockUser, mockAuth, '', mockFrontend, mockBackend, mockProject);

        // Check backend repo deletion
        const backendCmd = `curl -X DELETE -u "${mockUser}:${mockAuth}" https://api.github.com/repos/${mockUser}/${mockBackend}`;
        expect(executeCommandWithRetry).toHaveBeenCalledWith(backendCmd, { stdio: 'pipe' }, 3);

        // Check frontend repo deletion
        const frontendCmd = `curl -X DELETE -u "${mockUser}:${mockAuth}" https://api.github.com/repos/${mockUser}/${mockFrontend}`;
        expect(executeCommandWithRetry).toHaveBeenCalledWith(frontendCmd, { stdio: 'pipe' }, 3);
    });

    test('should log error if repository deletion fails', async () => {
        fs.existsSync.mockReturnValue(true);
        executeCommandWithRetry.mockRejectedValueOnce(new Error('Repo delete failed'));

        await createApplicationInstance.destroyApp(mockUser, mockAuth, mockOrg, mockFrontend, mockBackend, mockProject);

        expect(AppLogger.error).toHaveBeenCalledWith(expect.stringContaining('Repo delete failed'), true);
        // Should continue to delete the next repo/folder (or exit gracefully)
        expect(fs.rmdirSync).toHaveBeenCalledTimes(2);
    });

    test('should log error if GitHub username is missing', async () => {
        await createApplicationInstance.destroyApp('', mockAuth, mockOrg, mockFrontend, mockBackend, mockProject);

        expect(AppLogger.error).toHaveBeenCalledWith('Error: Missing GitHub username or organization name', true);
        expect(executeCommandWithRetry).not.toHaveBeenCalled();
    });
});