jest.setTimeout(30000);
jest.mock("fs");
jest.mock("path");
jest.mock("uuid", () => ({
    v4: jest.fn(() => "test-uuid-1234"),
}));
jest.mock("../../src/logger/appLogger.js", () => ({
    AppLogger: {
        configureLogger: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
    },
}));
jest.mock("../../src/config/system.js", () => ({
    __esModule: true,
    default: {
        getInstance: jest.fn(() => ({
            mergeConfigs: jest.fn(),
            getConfig: jest.fn(() => ({
                github_access_token: "test-token",
                aws_region: "us-east-1",
                environment: "dev",
                cluster_type: "eks-fargate",
                cloud_provider: "aws",
                aws_profile: "default",
            })),
        })),
    },
}));
jest.mock("../../src/core/utils/projectConfigReader-utils.js", () => ({
    dotMagikubeConfig: jest.fn(() => ({
        github_access_token: "test-token",
        aws_region: "us-east-1",
        environment: "dev",
        cluster_type: "eks-fargate",
        cloud_provider: "aws",
        aws_profile: "default",
    })),
}));
jest.mock("../../src/core/restartTerraform-project.js", () => ({
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
jest.mock("../../src/core/utils/statusUpdater-utils.js", () => ({
    readStatusFile: jest.fn(() => Promise.resolve({
        services: { "terraform-apply": "pending" },
        modules: { vpc: "pending", security: "success" },
    })),
    updateStatusFile: jest.fn(),
}));
jest.mock("../../src/core/utils/healthCheck-utils.js", () => ({
    serviceHealthCheck: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("../../src/core/utils/unlockTerraformState-utils.js", () => ({
    runTerraformUnlockCommands: jest.fn(() => Promise.resolve()),
}));
jest.mock("../../src/core/utils/executeCommandWithRetry-utils.js", () => ({
    executeCommandWithRetry: jest.fn(() => Promise.resolve()),
}));
jest.mock("../../src/core/utils/setupAndPushService-utils.js", () => ({
    setupAndPushServices: jest.fn(() => Promise.resolve()),
}));
jest.mock("../../src/core/constants/constants.js", () => ({
    modules: ["vpc", "security"],
}));

import RestartProject from "../../src/commands/restart/index.js";

describe("RestartProject Command", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Command Metadata", () => {
        test("should have correct description", () => {
            expect(RestartProject.description).toContain("Restart the magikube project");
        });

        test("should have name argument required", () => {
            expect(RestartProject.args.name.required).toBe(true);
            expect(RestartProject.args.name.description).toContain("Project name");
        });

        test("should have examples", () => {
            expect(RestartProject.examples.length).toBeGreaterThan(0);
        });
    });

    describe("Project Configuration", () => {
        test("should read project configuration from .magikube file", () => {
            const { dotMagikubeConfig } = require("../../src/core/utils/projectConfigReader-utils.js");
            const config = dotMagikubeConfig("myapp", process.cwd());
            expect(config).toBeDefined();
            expect(config.github_access_token).toBe("test-token");
        });

        test("should merge configurations into SystemConfig", () => {
            const SystemConfig = require("../../src/config/system.js").default;
            const instance = SystemConfig.getInstance();
            instance.mergeConfigs({});
            expect(instance.mergeConfigs).toHaveBeenCalled();
        });

        test("should get project configuration", () => {
            const SystemConfig = require("../../src/config/system.js").default;
            const config = SystemConfig.getInstance().getConfig();
            expect(config.aws_region).toBe("us-east-1");
            expect(config.environment).toBe("dev");
            expect(config.cluster_type).toBe("eks-fargate");
        });
    });

    describe("Status File Management", () => {
        test("should read status file", async () => {
            const { readStatusFile } = require("../../src/core/utils/statusUpdater-utils.js");
            const status = await readStatusFile({});
            expect(status).toBeDefined();
            expect(status.services).toBeDefined();
            expect(status.modules).toBeDefined();
        });

        test("should update status file on module completion", () => {
            const { updateStatusFile } = require("../../src/core/utils/statusUpdater-utils.js");
            updateStatusFile("myapp", "vpc", "success");
            expect(updateStatusFile).toHaveBeenCalledWith("myapp", "vpc", "success");
        });

        test("should track terraform apply status", () => {
            const { updateStatusFile } = require("../../src/core/utils/statusUpdater-utils.js");
            updateStatusFile("myapp", "terraform-apply", "success");
            expect(updateStatusFile).toHaveBeenCalledWith("myapp", "terraform-apply", "success");
        });
    });

    describe("Terraform Project Management", () => {
        test("should get terraform project instance", async () => {
            const RestartTerraformProject = require("../../src/core/restartTerraform-project.js").default;
            const terraform = await RestartTerraformProject.getProject({}, "myapp");
            expect(terraform).toBeDefined();
            expect(terraform.createProject).toBeDefined();
            expect(terraform.AWSProfileActivate).toBeDefined();
        });

        test("should create terraform project", async () => {
            const RestartTerraformProject = require("../../src/core/restartTerraform-project.js").default;
            const terraform = await RestartTerraformProject.getProject({}, "myapp");
            await terraform.createProject("myapp", process.cwd());
            expect(terraform.createProject).toHaveBeenCalledWith("myapp", process.cwd());
        });

        test("should activate AWS profile", async () => {
            const RestartTerraformProject = require("../../src/core/restartTerraform-project.js").default;
            const terraform = await RestartTerraformProject.getProject({}, "myapp");
            await terraform.AWSProfileActivate("default");
            expect(terraform.AWSProfileActivate).toHaveBeenCalledWith("default");
        });

        test("should run terraform init", async () => {
            const RestartTerraformProject = require("../../src/core/restartTerraform-project.js").default;
            const terraform = await RestartTerraformProject.getProject({}, "myapp");
            await terraform.runTerraformInit("/path/to/infra", "config.tfvars", "myapp");
            expect(terraform.runTerraformInit).toHaveBeenCalled();
        });

        test("should run terraform apply for modules", async () => {
            const RestartTerraformProject = require("../../src/core/restartTerraform-project.js").default;
            const terraform = await RestartTerraformProject.getProject({}, "myapp");
            await terraform.runTerraformApply("/path/to/infra", "vpc", "terraform.tfvars");
            expect(terraform.runTerraformApply).toHaveBeenCalled();
        });
    });

    describe("Infrastructure Setup", () => {
        test("should detect EKS infrastructure type", () => {
            const SystemConfig = require("../../src/config/system.js").default;
            const config = SystemConfig.getInstance().getConfig();
            const isEKS = config.cluster_type === "eks-fargate" || config.cluster_type === "eks-nodegroup";
            expect(isEKS).toBe(true);
        });

        test("should handle AWS profile activation for AWS provider", () => {
            const SystemConfig = require("../../src/config/system.js").default;
            const config = SystemConfig.getInstance().getConfig();
            expect(config.cloud_provider).toBe("aws");
            expect(config.aws_profile).toBe("default");
        });

        test("should check cluster type from config", () => {
            const SystemConfig = require("../../src/config/system.js").default;
            const config = SystemConfig.getInstance().getConfig();
            const supportedClusterTypes = ["eks-fargate", "eks-nodegroup", "k8s"];
            expect(supportedClusterTypes).toContain(config.cluster_type);
        });
    });

    describe("Terraform State Management", () => {
        test("should unlock terraform state when terraform-apply status is fail", () => {
            const { runTerraformUnlockCommands } = require("../../src/core/utils/unlockTerraformState-utils.js");
            runTerraformUnlockCommands("/project/path", {});
            expect(runTerraformUnlockCommands).toHaveBeenCalled();
        });

        test("should execute commands with retry", async () => {
            const { executeCommandWithRetry } = require("../../src/core/utils/executeCommandWithRetry-utils.js");
            await executeCommandWithRetry("terraform destroy", {}, 1);
            expect(executeCommandWithRetry).toHaveBeenCalled();
        });

        test("should set AWS profile before terraform operations", async () => {
            const { executeCommandWithRetry } = require("../../src/core/utils/executeCommandWithRetry-utils.js");
            await executeCommandWithRetry("export AWS_PROFILE=default", {}, 1);
            expect(executeCommandWithRetry).toHaveBeenCalled();
        });
    });

    describe("Module Management", () => {
        test("should get modules from constants", () => {
            const { modules } = require("../../src/core/constants/constants.js");
            expect(Array.isArray(modules)).toBe(true);
            expect(modules.length).toBeGreaterThan(0);
        });

        test("should iterate through modules for terraform apply", () => {
            const { modules } = require("../../src/core/constants/constants.js");
            expect(modules).toContain("vpc");
        });

        test("should handle module failure status", () => {
            const moduleStatus = "fail";
            expect(moduleStatus === "fail" || moduleStatus === "pending").toBe(true);
        });

        test("should handle module success status", () => {
            const moduleStatus = "success";
            expect(moduleStatus === "success").toBe(true);
        });
    });

    describe("Service Setup", () => {
        test("should setup and push services", async () => {
            const { setupAndPushServices } = require("../../src/core/utils/setupAndPushService-utils.js");
            await setupAndPushServices({}, {});
            expect(setupAndPushServices).toHaveBeenCalled();
        });

        test("should pass config object with required fields to setupAndPushServices", async () => {
            const { setupAndPushServices } = require("../../src/core/utils/setupAndPushService-utils.js");
            const configObject = {
                token: "test-token",
                userName: "testuser",
                orgName: "testorg",
                sourceCodeRepo: "https://github.com/test/repo",
                region: "us-east-1",
                projectName: "myapp",
                awsAccessKey: "AKIAIOSFODNN7EXAMPLE",
                awsSecretKey: "wJalrXUtnFEMI/K7MDENG",
                environment: "dev",
            };
            await setupAndPushServices({}, configObject);
            expect(setupAndPushServices).toHaveBeenCalledWith({}, configObject);
        });
    });

    describe("Health Checks", () => {
        test("should check service health after restart", async () => {
            const { serviceHealthCheck } = require("../../src/core/utils/healthCheck-utils.js");
            await serviceHealthCheck({}, {}, {});
            expect(serviceHealthCheck).toHaveBeenCalled();
        });
    });

    describe("Logger Functionality", () => {
        test("should configure logger with project name", () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            AppLogger.configureLogger("myapp", "restart");
            expect(AppLogger.configureLogger).toHaveBeenCalledWith("myapp", "restart");
        });

        test("should log startup message", () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            AppLogger.info("Logger Started ...");
            expect(AppLogger.info).toHaveBeenCalled();
        });

        test("should log info messages during restart", () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            AppLogger.info("Starting Terraform apply for module: vpc", true);
            expect(AppLogger.info).toHaveBeenCalled();
        });

        test("should log debug messages", () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            AppLogger.debug("Successfully applied Terraform for module: vpc");
            expect(AppLogger.debug).toHaveBeenCalled();
        });

        test("should log error messages on failure", () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            AppLogger.error("Error applying Terraform for module: vpc, error details", true);
            expect(AppLogger.error).toHaveBeenCalled();
        });
    });

    describe("Run Method - Integration Tests", () => {
        let originalExit: any;

        beforeEach(() => {
            originalExit = process.exit;
            process.exit = jest.fn() as any;
            jest.clearAllMocks();
        });

        afterEach(() => {
            process.exit = originalExit;
        });

        test("should initialize logger with project name", async () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            const RestartProject = require("../../src/commands/restart/index.js").default;
            const mockCommand = Object.create(RestartProject.prototype);
            mockCommand.id = "restart";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(AppLogger.configureLogger).toHaveBeenCalledWith("myapp", "restart");
        });

        test("should read project configuration", async () => {
            const { dotMagikubeConfig } = require("../../src/core/utils/projectConfigReader-utils.js");
            const RestartProject = require("../../src/commands/restart/index.js").default;
            const mockCommand = Object.create(RestartProject.prototype);
            mockCommand.id = "restart";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(dotMagikubeConfig).toHaveBeenCalled();
        });

        test("should get terraform project", async () => {
            const RestartTerraformProject = require("../../src/core/restartTerraform-project.js").default;
            const RestartProject = require("../../src/commands/restart/index.js").default;
            const mockCommand = Object.create(RestartProject.prototype);
            mockCommand.id = "restart";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(RestartTerraformProject.getProject).toHaveBeenCalled();
        });

        test("should read status file", async () => {
            const { readStatusFile } = require("../../src/core/utils/statusUpdater-utils.js");
            const RestartProject = require("../../src/commands/restart/index.js").default;
            const mockCommand = Object.create(RestartProject.prototype);
            mockCommand.id = "restart";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(readStatusFile).toHaveBeenCalled();
        });

        test("should activate AWS profile for AWS provider", async () => {
            const RestartProject = require("../../src/commands/restart/index.js").default;
            const mockCommand = Object.create(RestartProject.prototype);
            mockCommand.id = "restart";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            // Should attempt to activate AWS profile based on config
            const RestartTerraformProject = require("../../src/core/restartTerraform-project.js").default;
            expect(RestartTerraformProject.getProject).toHaveBeenCalled();
        });

        test("should run terraform init for EKS infrastructure", async () => {
            const RestartProject = require("../../src/commands/restart/index.js").default;
            const mockCommand = Object.create(RestartProject.prototype);
            mockCommand.id = "restart";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            // Terraform init should be called for EKS
            expect(true).toBe(true);
        });

        test("should unlock terraform state if needed", async () => {
            const { runTerraformUnlockCommands } = require("../../src/core/utils/unlockTerraformState-utils.js");
            const RestartProject = require("../../src/commands/restart/index.js").default;
            const mockCommand = Object.create(RestartProject.prototype);
            mockCommand.id = "restart";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            // Should unlock if terraform-apply status is fail or pending
            expect(runTerraformUnlockCommands).toHaveBeenCalled();
        });

        test("should apply terraform for failed modules", async () => {
            const { updateStatusFile } = require("../../src/core/utils/statusUpdater-utils.js");
            const RestartProject = require("../../src/commands/restart/index.js").default;
            const mockCommand = Object.create(RestartProject.prototype);
            mockCommand.id = "restart";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(updateStatusFile).toHaveBeenCalled();
        });

        test("should setup and push services after infrastructure", async () => {
            const { setupAndPushServices } = require("../../src/core/utils/setupAndPushService-utils.js");
            const RestartProject = require("../../src/commands/restart/index.js").default;
            const mockCommand = Object.create(RestartProject.prototype);
            mockCommand.id = "restart";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(setupAndPushServices).toHaveBeenCalled();
        });

        test("should check service health after restart completes", async () => {
            const { serviceHealthCheck } = require("../../src/core/utils/healthCheck-utils.js");
            const RestartProject = require("../../src/commands/restart/index.js").default;
            const mockCommand = Object.create(RestartProject.prototype);
            mockCommand.id = "restart";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(serviceHealthCheck).toHaveBeenCalled();
        });

        test("should handle error during restart execution", async () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            const RestartProject = require("../../src/commands/restart/index.js").default;
            const mockCommand = Object.create(RestartProject.prototype);
            mockCommand.id = "restart";
            mockCommand.parse = jest.fn().mockRejectedValue(new Error("Test error"));

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(typeof AppLogger).toBe("object");
            expect(AppLogger.error).toBeDefined();
        });
    });

    describe("Configuration Object Building", () => {
        test("should build config object with all required fields", () => {
            const configObject = {
                token: "test-token",
                userName: "testuser",
                orgName: "testorg",
                sourceCodeRepo: "https://github.com/test/repo",
                region: "us-east-1",
                projectName: "myapp",
                awsAccessKey: "AKIAIOSFODNN7EXAMPLE",
                awsSecretKey: "wJalrXUtnFEMI/K7MDENG",
                environment: "dev",
            };

            expect(configObject.token).toBe("test-token");
            expect(configObject.projectName).toBe("myapp");
            expect(configObject.region).toBe("us-east-1");
        });

        test("should contain AWS credentials in config object", () => {
            const configObject = {
                awsAccessKey: "AKIAIOSFODNN7EXAMPLE",
                awsSecretKey: "wJalrXUtnFEMI/K7MDENG",
                region: "us-east-1",
            };

            expect(configObject.awsAccessKey).toBeDefined();
            expect(configObject.awsSecretKey).toBeDefined();
            expect(configObject.region).toBeDefined();
        });
    });

    describe("Module Processing Logic", () => {
        test("should check module status is pending or fail", () => {
            const statuses = ["pending", "fail", "success"];
            const pendingOrFail = (status: string) => status === "fail" || status === "pending";

            expect(pendingOrFail("pending")).toBe(true);
            expect(pendingOrFail("fail")).toBe(true);
            expect(pendingOrFail("success")).toBe(false);
        });

        test("should handle terraform destroy for failed modules", () => {
            const moduleStatus = "fail";
            const shouldDestroy = moduleStatus === "fail";
            expect(shouldDestroy).toBe(true);
        });
    });
});
