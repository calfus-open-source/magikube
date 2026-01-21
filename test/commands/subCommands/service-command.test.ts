jest.setTimeout(30000);
jest.mock("fs");
jest.mock("path");
jest.mock("inquirer", () => ({
    prompt: jest.fn(() => Promise.resolve({
        service_name: "test-service",
        service_type: "backend-service",
        backend_app_type: "node-express",
    })),
}));
jest.mock("../../../src/logger/appLogger.js", () => ({
    AppLogger: {
        configureLogger: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
    },
}));
const mockMergeConfigs = jest.fn();
const mockGetConfig = jest.fn(() => ({
    github_access_token: "test-token",
    git_user_name: "testuser",
    github_owner: "testorg",
    source_code_repository: "github.com/testorg/test-repo",
    aws_region: "us-east-1",
    aws_access_key_id: "AKIA123456789",
    aws_secret_access_key: "secret-key",
    environment: "dev",
    cloud_provider: "aws",
    aws_profile: "default",
    project_name: "test-project",
    service_names: ["existing-service"],
    services: ["react", "node-express"],
}));

jest.mock("../../../src/config/system.js", () => ({
    __esModule: true,
    default: {
        getInstance: jest.fn(() => ({
            mergeConfigs: mockMergeConfigs,
            getConfig: mockGetConfig,
        })),
    },
}));
jest.mock("../../../src/core/utils/statusUpdater-utils.js", () => ({
    initializeStatusFile: jest.fn(),
    readStatusFile: jest.fn(() => Promise.resolve({
        services: { "terraform-apply": "success" },
    })),
    updateStatusFile: jest.fn(),
}));
jest.mock("../../../src/core/microserviceTerraform.js", () => ({
    __esModule: true,
    default: {
        getProject: jest.fn(() => Promise.resolve({
            createProject: jest.fn(() => Promise.resolve()),
            AWSProfileActivate: jest.fn(() => Promise.resolve()),
            runTerraformInit: jest.fn(() => Promise.resolve()),
            runTerraformApply: jest.fn(() => Promise.resolve()),
        })),
    },
}));
jest.mock("../../../src/core/utils/copyTemplates-utils.js", () => ({
    cloneAndCopyTemplates: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("../../../src/core/utils/handlePrompts-utils.js", () => ({
    handlePrompts: jest.fn(() =>
        Promise.resolve({
            service_name: "test-service",
            service_type: "backend-service",
            backend_app_type: "node-express",
            github_access_token: "test-token",
            git_user_name: "testuser",
            github_owner: "testorg",
            source_code_repository: "github.com/testorg/test-repo",
            aws_region: "us-east-1",
            aws_access_key_id: "AKIA123456789",
            aws_secret_access_key: "secret-key",
            environment: "dev",
            cloud_provider: "aws",
            aws_profile: "default",
        })
    ),
}));
jest.mock("../../../src/core/utils/updateDotMagikube-utils.js", () => ({
    updateProjectConfigArrays: jest.fn(),
}));
jest.mock("../../../src/core/utils/projectConfigReader-utils.js", () => ({
    dotMagikubeConfig: jest.fn(() => ({
        project_name: "test-project",
        service_names: ["existing-service"],
        services: ["react", "node-express"],
        github_access_token: "test-token",
        git_user_name: "testuser",
        github_owner: "testorg",
        source_code_repository: "github.com/testorg/test-repo",
        aws_region: "us-east-1",
        aws_access_key_id: "AKIA123456789",
        aws_secret_access_key: "secret-key",
        environment: "dev",
        cloud_provider: "aws",
        aws_profile: "default",
    })),
}));
jest.mock("../../../src/core/utils/setupAndPushService-utils.js", () => ({
    setupAndPushServices: jest.fn(() => Promise.resolve()),
}));
jest.mock("../../../src/core/constants/constants.js", () => ({
    services: ["auth-service", "node-app"],
    singleModules: ["vpc", "eks-fargate", "eks-nodegroup"],
}));
jest.mock("../../../src/core/constants/systemDefaults.js", () => ({
    REACT_APP_CONFIG: { frontend_app_type: "react" },
    NEXT_APP_CONFIG: { frontend_app_type: "next" },
    NODE_APP_CONFIG: { backend_app_type: "node-express" },
    GEN_AI_CONFIG: { service_type: "gen-ai-service" },
}));

import Microservice from "../../../src/commands/subCommands/service-command/index.js";
import { AppLogger } from "../../../src/logger/appLogger.js";
import fs from "fs";
import path from "path";
import { handlePrompts } from "../../../src/core/utils/handlePrompts-utils.js";
import { cloneAndCopyTemplates } from "../../../src/core/utils/copyTemplates-utils.js";
import SystemConfig from "../../../src/config/system.js";
import {
    initializeStatusFile,
    updateStatusFile,
    readStatusFile,
} from "../../../src/core/utils/statusUpdater-utils.js";
import MicroserviceProject from "../../../src/core/microserviceTerraform.js";
import { dotMagikubeConfig } from "../../../src/core/utils/projectConfigReader-utils.js";
import { setupAndPushServices } from "../../../src/core/utils/setupAndPushService-utils.js";
import { updateProjectConfigArrays } from "../../../src/core/utils/updateDotMagikube-utils.js";

describe("Microservice Command", () => {
    let originalExit: any;
    let command: any;
    const mockfs = fs as jest.Mocked<typeof fs>;
    const mockPath = path as jest.Mocked<typeof path>;

    beforeEach(() => {
        originalExit = process.exit;
        process.exit = jest.fn() as any;
        jest.clearAllMocks();

        mockfs.existsSync = jest.fn(() => true);
        mockfs.writeFileSync = jest.fn();
        mockPath.join = jest.fn((...args) => args.join('/'));
        mockPath.basename = jest.fn(() => "test-project");
        mockPath.resolve = jest.fn((...args) => args.join('/'));

        command = Object.create(Microservice.prototype);
        command.parse = jest.fn(async () => ({
            args: { name: "microservice" },
            flags: {},
        }));
        command.id = "create:microservice";
    });

    afterEach(() => {
        process.exit = originalExit;
    });

    describe("Command Metadata", () => {
        test("should have correct description", () => {
            expect(Microservice.description).toContain("microservice");
        });

        test("should have correct examples", () => {
            expect(Microservice.examples.length).toBeGreaterThan(0);
        });

        test("should define 'name' argument as required", () => {
            expect(Microservice.args.name).toBeDefined();
            expect(Microservice.args.name.required).toBe(true);
        });
    });

    describe("run() - Valid Argument", () => {
        test("should successfully create a backend microservice", async () => {
            await command.run();

            expect(command.parse).toHaveBeenCalled();
            expect(mockfs.existsSync).toHaveBeenCalledWith(expect.stringContaining(".magikube"));
            expect(handlePrompts).toHaveBeenCalled();
            expect(updateProjectConfigArrays).toHaveBeenCalled();
            expect(initializeStatusFile).toHaveBeenCalled();
            expect(MicroserviceProject.getProject).toHaveBeenCalled();
            expect(setupAndPushServices).toHaveBeenCalled();
            expect(process.exit).toHaveBeenCalledWith(0);
        });

        test("should handle frontend service type (react)", async () => {
            (handlePrompts as jest.Mock).mockResolvedValue({
                service_name: "frontend-service",
                service_type: "frontend-service",
                frontend_app_type: "react",
                github_access_token: "test-token",
                git_user_name: "testuser",
                github_owner: "testorg",
                source_code_repository: "github.com/testorg/test-repo",
                aws_region: "us-east-1",
                aws_access_key_id: "AKIA123456789",
                aws_secret_access_key: "secret-key",
                environment: "dev",
                cloud_provider: "aws",
                aws_profile: "default",
            });

            await command.run();

            expect(updateProjectConfigArrays).toHaveBeenCalledWith(
                expect.any(Object),
                "service_names",
                "frontend-service"
            );
            expect(updateProjectConfigArrays).toHaveBeenCalledWith(
                expect.any(Object),
                "services",
                "react"
            );
        });

        test("should handle frontend service type (next)", async () => {
            (handlePrompts as jest.Mock).mockResolvedValue({
                service_name: "next-service",
                service_type: "frontend-service",
                frontend_app_type: "next",
                github_access_token: "test-token",
                git_user_name: "testuser",
                github_owner: "testorg",
                source_code_repository: "github.com/testorg/test-repo",
                aws_region: "us-east-1",
                aws_access_key_id: "AKIA123456789",
                aws_secret_access_key: "secret-key",
                environment: "dev",
                cloud_provider: "aws",
                aws_profile: "default",
            });

            await command.run();

            expect(updateProjectConfigArrays).toHaveBeenCalledWith(
                expect.any(Object),
                "services",
                "next"
            );
        });

        test("should handle backend service type", async () => {
            (handlePrompts as jest.Mock).mockResolvedValue({
                service_name: "backend-service",
                service_type: "backend-service",
                backend_app_type: "node-express",
                github_access_token: "test-token",
                git_user_name: "testuser",
                github_owner: "testorg",
                source_code_repository: "github.com/testorg/test-repo",
                aws_region: "us-east-1",
                aws_access_key_id: "AKIA123456789",
                aws_secret_access_key: "secret-key",
                environment: "dev",
                cloud_provider: "aws",
                aws_profile: "default",
            });

            await command.run();

            expect(updateProjectConfigArrays).toHaveBeenCalledWith(
                expect.any(Object),
                "services",
                "node-express"
            );
        });

        test("should handle gen-ai service type", async () => {
            (handlePrompts as jest.Mock).mockResolvedValue({
                service_name: "genai-service",
                service_type: "gen-ai-service",
                github_access_token: "test-token",
                git_user_name: "testuser",
                github_owner: "testorg",
                source_code_repository: "github.com/testorg/test-repo",
                aws_region: "us-east-1",
                aws_access_key_id: "AKIA123456789",
                aws_secret_access_key: "secret-key",
                environment: "dev",
                cloud_provider: "aws",
                aws_profile: "default",
            });

            await command.run();

            expect(updateProjectConfigArrays).toHaveBeenCalledWith(
                expect.any(Object),
                "services",
                "gen-ai-service"
            );
        });

        test("should configure logger with project name", async () => {
            await command.run();

            expect(AppLogger.configureLogger).toHaveBeenCalledWith(
                "test-project",
                "create:microservice"
            );
        });

        test("should clone templates if dist folder does not exist", async () => {
            mockfs.existsSync = jest.fn((path) => {
                if (typeof path === "string" && path.includes("/dist")) {
                    return false;
                }
                return true;
            });

            await command.run();

            expect(cloneAndCopyTemplates).toHaveBeenCalledWith("create:microservice");
        });

        test("should not clone templates if dist folder exists", async () => {
            mockfs.existsSync = jest.fn(() => true);

            await command.run();

            expect(cloneAndCopyTemplates).not.toHaveBeenCalled();
        });

        test("should activate AWS profile for AWS provider", async () => {
            const mockTerraform: any = {
                createProject: jest.fn(() => Promise.resolve()),
                AWSProfileActivate: jest.fn(() => Promise.resolve()),
                runTerraformInit: jest.fn(() => Promise.resolve()),
                runTerraformApply: jest.fn(() => Promise.resolve()),
            };
            (MicroserviceProject.getProject as jest.Mock).mockResolvedValue(mockTerraform);

            await command.run();

            expect(mockTerraform.AWSProfileActivate).toHaveBeenCalledWith("default");
        });

        test("should run terraform init and apply", async () => {
            const mockTerraform: any = {
                createProject: jest.fn(() => Promise.resolve()),
                AWSProfileActivate: jest.fn(() => Promise.resolve()),
                runTerraformInit: jest.fn(() => Promise.resolve()),
                runTerraformApply: jest.fn(() => Promise.resolve()),
            };
            (MicroserviceProject.getProject as jest.Mock).mockResolvedValue(mockTerraform);

            await command.run();

            expect(mockTerraform.runTerraformInit).toHaveBeenCalled();
            expect(mockTerraform.runTerraformApply).toHaveBeenCalled();
        });

        test("should update status file before and after terraform apply", async () => {
            const mockTerraform: any = {
                createProject: jest.fn(() => Promise.resolve()),
                AWSProfileActivate: jest.fn(() => Promise.resolve()),
                runTerraformInit: jest.fn(() => Promise.resolve()),
                runTerraformApply: jest.fn(() => Promise.resolve()),
            };
            (MicroserviceProject.getProject as jest.Mock).mockResolvedValue(mockTerraform);

            await command.run();

            expect(updateStatusFile).toHaveBeenCalledWith(
                "test-project",
                "terraform-apply",
                "fail"
            );
            expect(updateStatusFile).toHaveBeenCalledWith(
                "test-project",
                "terraform-apply",
                "success"
            );
        });

        test("should set command property in responses", async () => {
            await command.run();

            const handlePromptsCall = (handlePrompts as jest.Mock).mock.calls[0];
            expect(handlePromptsCall).toBeDefined();
        });

        test("should call setupAndPushServices with correct config objects", async () => {
            await command.run();

            expect(setupAndPushServices).toHaveBeenCalledWith(
                expect.objectContaining({
                    project_name: "test-project",
                    environment: "dev",
                }),
                expect.objectContaining({
                    token: "test-token",
                    userName: "testuser",
                    orgName: "testorg",
                    projectName: "test-project",
                })
            );
        });

        test("should handle missing terraform project", async () => {
            jest.useFakeTimers();
            (MicroserviceProject.getProject as jest.Mock).mockResolvedValue(null);

            const runPromise = command.run();
            jest.advanceTimersByTime(15000);
            await runPromise;

            expect(setupAndPushServices).not.toHaveBeenCalled();
            jest.useRealTimers();
        });
    });

    describe("run() - Invalid Argument", () => {
        test("should exit with error for invalid argument", async () => {
            command.parse = jest.fn(async () => ({
                args: { name: "invalid-arg" },
                flags: {},
            }));

            await command.run();

            expect(AppLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("Invalid argument"),
                true
            );
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        test("should display expected vs received argument in error", async () => {
            command.parse = jest.fn(async () => ({
                args: { name: "module" },
                flags: {},
            }));

            await command.run();

            expect(AppLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("Expected 'microservice'"),
                true
            );
            expect(AppLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("module"),
                true
            );
        });
    });

    describe("run() - Missing .magikube File", () => {
        test("should exit with error if .magikube file is missing", async () => {
            mockfs.existsSync = jest.fn((path) => {
                if (typeof path === "string" && path.includes(".magikube")) {
                    return false;
                }
                return true;
            });

            await command.run();

            expect(AppLogger.error).toHaveBeenCalledWith(
                expect.stringContaining(".magikube file is missing"),
                true
            );
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        test("should include current directory in .magikube error message", async () => {
            mockfs.existsSync = jest.fn((path: any) => {
                if (typeof path === "string" && path.includes(".magikube")) {
                    return false;
                }
                return true;
            });

            await command.run();

            expect(AppLogger.error).toHaveBeenCalledWith(
                expect.stringMatching(/\.magikube.*missing|missing.*\.magikube/i),
                true
            );
        });
    });

    describe("run() - Error Handling", () => {
        test("should handle errors during setup process", async () => {
            (handlePrompts as jest.Mock).mockRejectedValue(new Error("Prompt failed"));

            await command.run();

            expect(AppLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("An error occurred during the setup process"),
                true
            );
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        test("should handle errors from dotMagikubeConfig", async () => {
            (dotMagikubeConfig as jest.Mock).mockImplementation(() => {
                throw new Error("Config read failed");
            });

            await command.run();

            expect(AppLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("An error occurred during the setup process"),
                true
            );
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        test("should handle errors from cloneAndCopyTemplates", async () => {
            mockfs.existsSync = jest.fn((path) => {
                if (typeof path === "string" && path.includes("/dist")) {
                    return false;
                }
                return true;
            });
            (cloneAndCopyTemplates as jest.Mock).mockRejectedValue(
                new Error("Clone failed")
            );

            await command.run();

            expect(AppLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("An error occurred during the setup process"),
                true
            );
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        test("should handle errors from terraform operations", async () => {
            const mockTerraform: any = {
                createProject: jest.fn(() => Promise.reject(new Error("Terraform failed"))),
                AWSProfileActivate: jest.fn(() => Promise.resolve()),
                runTerraformInit: jest.fn(() => Promise.resolve()),
                runTerraformApply: jest.fn(() => Promise.resolve()),
            };
            (MicroserviceProject.getProject as jest.Mock).mockResolvedValue(mockTerraform);

            await command.run();

            expect(AppLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("An error occurred during the setup process"),
                true
            );
            expect(process.exit).toHaveBeenCalledWith(1);
        });

        test("should handle errors from setupAndPushServices", async () => {
            (setupAndPushServices as jest.Mock).mockRejectedValue(
                new Error("Service setup failed")
            );
            const mockTerraform: any = {
                createProject: jest.fn(() => Promise.resolve()),
                AWSProfileActivate: jest.fn(() => Promise.resolve()),
                runTerraformInit: jest.fn(() => Promise.resolve()),
                runTerraformApply: jest.fn(() => Promise.resolve()),
            };
            (MicroserviceProject.getProject as jest.Mock).mockResolvedValue(mockTerraform);

            await command.run();

            expect(AppLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("An error occurred during the setup process"),
                true
            );
            expect(process.exit).toHaveBeenCalledWith(1);
        });
    });

    describe("AWS Provider Handling", () => {
        test("should skip AWS profile activation for non-AWS providers", async () => {
            const mockConfig: any = {
                github_access_token: "test-token",
                git_user_name: "testuser",
                github_owner: "testorg",
                source_code_repository: "github.com/testorg/test-repo",
                aws_region: "us-east-1",
                aws_access_key_id: "AKIA123456789",
                aws_secret_access_key: "secret-key",
                environment: "dev",
                cloud_provider: "gcp", // Not AWS
                aws_profile: "default",
                project_name: "test-project",
            };
            (SystemConfig.getInstance().getConfig as jest.Mock).mockReturnValue(mockConfig);

            const mockTerraform: any = {
                createProject: jest.fn(() => Promise.resolve()),
                AWSProfileActivate: jest.fn(() => Promise.resolve()),
                runTerraformInit: jest.fn(() => Promise.resolve()),
                runTerraformApply: jest.fn(() => Promise.resolve()),
            };
            (MicroserviceProject.getProject as jest.Mock).mockResolvedValue(mockTerraform);

            await command.run();

            expect(mockTerraform.AWSProfileActivate).not.toHaveBeenCalled();
        });
    });
});
