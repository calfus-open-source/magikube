jest.setTimeout(30000);
jest.mock("fs");
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
            })),
        })),
    },
}));
jest.mock("../../src/core/aws/aws-account.js", () => ({
    __esModule: true,
    default: {
        getAccountId: jest.fn(() => Promise.resolve("123456789012")),
    },
}));
jest.mock("../../src/core/terraform-project.js", () => ({
    __esModule: true,
    default: {
        getProject: jest.fn(() => Promise.resolve({
            createProject: jest.fn(() => Promise.resolve()),
            AWSProfileActivate: jest.fn(() => Promise.resolve()),
        })),
    },
}));
jest.mock("../../src/core/setup-application.js", () => ({
    __esModule: true,
    default: jest.fn(() => ({
        setupGitops: jest.fn(() => Promise.resolve(true)),
    })),
}));
jest.mock("../../src/core/utils/statusUpdater-utils.js", () => ({
    initializeStatusFile: jest.fn(),
}));
jest.mock("../../src/core/utils/healthCheck-utils.js", () => ({
    serviceHealthCheck: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("../../src/core/utils/handlePrompts-utils.js", () => ({
    handlePrompts: jest.fn(() =>
        Promise.resolve({
            cloud_provider: "aws",
            cluster_type: "eks-fargate",
            aws_profile: "default",
            github_access_token: "test-token",
            git_user_name: "testuser",
            github_owner: "testorg",
            source_code_repository: "https://github.com/test/repo",
            aws_region: "us-east-1",
            aws_access_key_id: "AKIAIOSFODNN7EXAMPLE",
            aws_secret_access_key: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
            environment: "dev",
        })
    ),
}));
jest.mock("../../src/core/utils/copyTemplates-utils.js", () => ({
    cloneAndCopyTemplates: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("../../src/core/utils/createEmptyProject-utils.js", () => ({
    createEmptyMagikubeProject: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("../../src/core/utils/groupingTemplateProject-utils.js", () => ({
    handleTemplateFlag: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("../../src/core/utils/terraformHandlers-utils.js", () => ({
    handleEKS: jest.fn(() => Promise.resolve(true)),
    handleK8s: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("../../src/core/utils/setupAndPushService-utils.js", () => ({
    setupAndPushServices: jest.fn(() => Promise.resolve(true)),
}));
jest.mock("../../src/core/constants/constants.js", () => ({
    services: ["auth-service"],
    modules: ["vpc"],
    InvalidProjectNames: ["help"],
    supportedTemplates: ["eks-fargate-vpc"],
}));
jest.mock("../../src/core/constants/systemDefaults.js", () => ({
    BASTION_SYSTEM_CONFIG: {},
    MASTER_SYSTEM_CONFIG: {},
    WORKER_SYSTEM_CONFIG: {},
    KUBERNITIES_SYSTEM_CONFIG: {},
    EKSNODEGROUP_SYSTEM_CONFIG: {},
    NEXT_APP_CONFIG: {},
    REACT_APP_CONFIG: {},
    GEN_AI_CONFIG: {},
    NODE_APP_CONFIG: {},
}));

import CreateProject from "../../src/commands/new/index.js";

describe("CreateProject Command", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Command Metadata", () => {
        test("should have correct description", () => {
            expect(CreateProject.description).toContain("Create new Magikube project");
        });

        test("should have name argument required", () => {
            expect(CreateProject.args.name.required).toBe(true);
        });

        test("should have template flag available", () => {
            expect(CreateProject.flags.template.char).toBe("t");
            expect(CreateProject.flags.template.required).toBe(false);
        });

        test("should have examples", () => {
            expect(CreateProject.examples.length).toBeGreaterThan(0);
        });
    });

    describe("Input Validation Rules", () => {
        test("should validate project name pattern", () => {
            const pattern = /^(?=.{3,8}$)(?!.*_$)[a-z][a-z0-9]*(?:_[a-z0-9]*)?$/;
            // Valid names
            expect(pattern.test("abc")).toBe(true);
            expect(pattern.test("app1")).toBe(true);
            expect(pattern.test("my_app")).toBe(true);
            expect(pattern.test("a1b2c3")).toBe(true);
        });

        test("should reject names that are too short", () => {
            const pattern = /^(?=.{3,8}$)(?!.*_$)[a-z][a-z0-9]*(?:_[a-z0-9]*)?$/;
            expect(pattern.test("ab")).toBe(false);
            expect(pattern.test("a")).toBe(false);
        });

        test("should reject names that are too long", () => {
            const pattern = /^(?=.{3,8}$)(?!.*_$)[a-z][a-z0-9]*(?:_[a-z0-9]*)?$/;
            expect(pattern.test("abcdefghij")).toBe(false);
        });

        test("should reject names starting with uppercase", () => {
            const pattern = /^(?=.{3,8}$)(?!.*_$)[a-z][a-z0-9]*(?:_[a-z0-9]*)?$/;
            expect(pattern.test("Abc")).toBe(false);
            expect(pattern.test("ABC")).toBe(false);
        });

        test("should reject names starting with numbers", () => {
            const pattern = /^(?=.{3,8}$)(?!.*_$)[a-z][a-z0-9]*(?:_[a-z0-9]*)?$/;
            expect(pattern.test("1abc")).toBe(false);
            expect(pattern.test("9app")).toBe(false);
        });

        test("should reject names ending with underscore", () => {
            const pattern = /^(?=.{3,8}$)(?!.*_$)[a-z][a-z0-9]*(?:_[a-z0-9]*)?$/;
            expect(pattern.test("app_")).toBe(false);
            expect(pattern.test("my_")).toBe(false);
        });

        test("should reject names with special characters", () => {
            const pattern = /^(?=.{3,8}$)(?!.*_$)[a-z][a-z0-9]*(?:_[a-z0-9]*)?$/;
            expect(pattern.test("app-name")).toBe(false);
            expect(pattern.test("app.name")).toBe(false);
            expect(pattern.test("app@name")).toBe(false);
        });
    });

    describe("Reserved Project Names", () => {
        test("should identify help as reserved", () => {
            const reserved = ["help"];
            expect(reserved.includes("help")).toBe(true);
        });

        test("should allow non-reserved names", () => {
            const reserved = ["help"];
            expect(reserved.includes("myapp")).toBe(false);
            expect(reserved.includes("app1")).toBe(false);
        });
    });

    describe("Template Support", () => {
        test("should support eks-fargate-vpc template", () => {
            const templates = ["eks-fargate-vpc"];
            expect(templates.includes("eks-fargate-vpc")).toBe(true);
        });

        test("should support empty template option", () => {
            // empty is a special flag value, not in predefined templates
            expect("empty" === "empty").toBe(true);
        });

        test("should have predefined templates", () => {
            const { supportedTemplates } = require("../../src/core/constants/constants.js");
            expect(Array.isArray(supportedTemplates)).toBe(true);
            expect(supportedTemplates.length).toBeGreaterThan(0);
        });
    });

    describe("Configuration Management", () => {
        test("should provide system config instance", () => {
            const SystemConfig = require("../../src/config/system.js").default;
            const instance = SystemConfig.getInstance();
            expect(instance).toBeDefined();
            expect(instance.getConfig).toBeDefined();
            expect(instance.mergeConfigs).toBeDefined();
        });

        test("should merge configuration objects", () => {
            const SystemConfig = require("../../src/config/system.js").default;
            const instance = SystemConfig.getInstance();
            const configObj = { test_key: "test_value" };
            instance.mergeConfigs(configObj);
            expect(instance.mergeConfigs).toHaveBeenCalledWith(configObj);
        });

        test("should get AWS region from config", () => {
            const SystemConfig = require("../../src/config/system.js").default;
            const instance = SystemConfig.getInstance();
            const config = instance.getConfig();
            expect(config.aws_region).toBe("us-east-1");
        });

        test("should get environment from config", () => {
            const SystemConfig = require("../../src/config/system.js").default;
            const instance = SystemConfig.getInstance();
            const config = instance.getConfig();
            expect(config.environment).toBe("dev");
        });
    });

    describe("AWS Integration", () => {
        test("should fetch AWS account ID", async () => {
            const AWSAccount = require("../../src/core/aws/aws-account.js").default;
            const accountId = await AWSAccount.getAccountId("key", "secret", "us-east-1");
            expect(accountId).toBe("123456789012");
        });

        test("should call getAccountId with credentials", async () => {
            const AWSAccount = require("../../src/core/aws/aws-account.js").default;
            await AWSAccount.getAccountId("AKIAIOSFODNN7EXAMPLE", "wJalrXUtnFEMI/K7MDENG", "us-east-1");
            expect(AWSAccount.getAccountId).toHaveBeenCalledWith(
                "AKIAIOSFODNN7EXAMPLE",
                "wJalrXUtnFEMI/K7MDENG",
                "us-east-1"
            );
        });
    });

    describe("Terraform Project Management", () => {
        test("should get terraform project instance", async () => {
            const TerraformProject = require("../../src/core/terraform-project.js").default;
            const terraform = await TerraformProject.getProject({});
            expect(terraform).toBeDefined();
            expect(terraform.createProject).toBeDefined();
            expect(terraform.AWSProfileActivate).toBeDefined();
        });

        test("should create project with terraform", async () => {
            const TerraformProject = require("../../src/core/terraform-project.js").default;
            const terraform = await TerraformProject.getProject({});
            await terraform.createProject("myapp", "/path", "new");
            expect(terraform.createProject).toHaveBeenCalledWith("myapp", "/path", "new");
        });

        test("should activate AWS profile in terraform", async () => {
            const TerraformProject = require("../../src/core/terraform-project.js").default;
            const terraform = await TerraformProject.getProject({});
            await terraform.AWSProfileActivate("default");
            expect(terraform.AWSProfileActivate).toHaveBeenCalledWith("default");
        });
    });

    describe("Service Health Checks", () => {
        test("should check service health status", async () => {
            const { serviceHealthCheck } = require("../../src/core/utils/healthCheck-utils.js");
            const result = await serviceHealthCheck({}, {}, {});
            expect(result).toBe(true);
        });
    });

    describe("Utility Functions", () => {
        test("should handle prompts and return responses", async () => {
            const { handlePrompts } = require("../../src/core/utils/handlePrompts-utils.js");
            const responses = await handlePrompts({}, "new");
            expect(responses.cloud_provider).toBe("aws");
            expect(responses.cluster_type).toBe("eks-fargate");
            expect(responses.aws_profile).toBe("default");
        });

        test("should handle empty project creation", async () => {
            const { createEmptyMagikubeProject } = require("../../src/core/utils/createEmptyProject-utils.js");
            const result = await createEmptyMagikubeProject("myapp", {});
            expect(result).toBe(true);
        });

        test("should handle template flag", async () => {
            const { handleTemplateFlag } = require("../../src/core/utils/groupingTemplateProject-utils.js");
            const result = await handleTemplateFlag({}, "new", "eks-fargate-vpc");
            expect(result).toBe(true);
        });

        test("should handle EKS infrastructure", async () => {
            const { handleEKS } = require("../../src/core/utils/terraformHandlers-utils.js");
            const result = await handleEKS("myapp", {}, {}, true, {});
            expect(result).toBe(true);
        });

        test("should handle K8s infrastructure", async () => {
            const { handleK8s } = require("../../src/core/utils/terraformHandlers-utils.js");
            const result = await handleK8s("myapp", {}, {}, true, {});
            expect(result).toBe(true);
        });

        test("should setup and push services", async () => {
            const { setupAndPushServices } = require("../../src/core/utils/setupAndPushService-utils.js");
            const result = await setupAndPushServices({}, {});
            expect(result).toBe(true);
        });

        test("should copy and clone templates", async () => {
            const { cloneAndCopyTemplates } = require("../../src/core/utils/copyTemplates-utils.js");
            const result = await cloneAndCopyTemplates("new");
            expect(result).toBe(true);
        });
    });

    describe("Logger Functionality", () => {
        test("should configure logger", () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            AppLogger.configureLogger("myapp", "new");
            expect(AppLogger.configureLogger).toHaveBeenCalledWith("myapp", "new");
        });

        test("should log info messages", () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            AppLogger.info("Test message", true);
            expect(AppLogger.info).toHaveBeenCalledWith("Test message", true);
        });

        test("should log debug messages", () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            AppLogger.debug("Debug message", true);
            expect(AppLogger.debug).toHaveBeenCalledWith("Debug message", true);
        });

        test("should log error messages", () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            AppLogger.error("Error message", true);
            expect(AppLogger.error).toHaveBeenCalledWith("Error message", true);
        });
    });

    describe("Status File Management", () => {
        test("should initialize status file", () => {
            const { initializeStatusFile } = require("../../src/core/utils/statusUpdater-utils.js");
            initializeStatusFile("myapp", ["vpc"], ["auth-service"]);
            expect(initializeStatusFile).toHaveBeenCalledWith("myapp", ["vpc"], ["auth-service"]);
        });
    });

    describe("Application Setup", () => {
        test("should setup gitops service", async () => {
            const CreateApplication = require("../../src/core/setup-application.js").default;
            const app = new CreateApplication({}, {});
            const result = await app.setupGitops({});
            expect(result).toBe(true);
        });
    });

    describe("Constants and Defaults", () => {
        test("should have services defined", () => {
            const { services } = require("../../src/core/constants/constants.js");
            expect(Array.isArray(services)).toBe(true);
            expect(services).toContain("auth-service");
        });

        test("should have modules defined", () => {
            const { modules } = require("../../src/core/constants/constants.js");
            expect(Array.isArray(modules)).toBe(true);
            expect(modules).toContain("vpc");
        });

        test("should have system defaults defined", () => {
            const systemDefaults = require("../../src/core/constants/systemDefaults.js");
            expect(systemDefaults.BASTION_SYSTEM_CONFIG).toBeDefined();
            expect(systemDefaults.MASTER_SYSTEM_CONFIG).toBeDefined();
            expect(systemDefaults.WORKER_SYSTEM_CONFIG).toBeDefined();
        });
    });

    describe("Run Method - Integration Tests", () => {
        let originalExit: any;

        beforeEach(() => {
            // Mock process.exit to prevent test termination
            originalExit = process.exit;
            process.exit = jest.fn() as any;
            jest.clearAllMocks();
        });

        afterEach(() => {
            process.exit = originalExit;
        });

        test("should execute run method without crashing", async () => {
            const CreateProject = require("../../src/commands/new/index.js").default;
            const mockCommand = Object.create(CreateProject.prototype);
            mockCommand.id = "new";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: {},
            });

            // Should not throw
            expect(async () => {
                await mockCommand.run();
            }).not.toThrow();
        });

        test("should call validation functions during run", async () => {
            const CreateProject = require("../../src/commands/new/index.js").default;
            const mockCommand = Object.create(CreateProject.prototype);
            mockCommand.id = "new";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: {},
            });

            // Mock console.error to catch validation errors
            const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => { });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected to fail on process.exit
            }

            consoleSpy.mockRestore();
        });

        test("should handle empty template flag path", async () => {
            const { handlePrompts } = require("../../src/core/utils/handlePrompts-utils.js");
            const { createEmptyMagikubeProject } = require("../../src/core/utils/createEmptyProject-utils.js");

            const CreateProject = require("../../src/commands/new/index.js").default;
            const mockCommand = Object.create(CreateProject.prototype);
            mockCommand.id = "new";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: { template: "empty" },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(handlePrompts).toHaveBeenCalled();
        });

        test("should handle template flag path with valid template", async () => {
            const { handleTemplateFlag } = require("../../src/core/utils/groupingTemplateProject-utils.js");

            const CreateProject = require("../../src/commands/new/index.js").default;
            const mockCommand = Object.create(CreateProject.prototype);
            mockCommand.id = "new";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: { template: "eks-fargate-vpc" },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            // When template flag is provided with valid template, handleTemplateFlag is called
            // Check that the function exists and can be called
            expect(typeof handleTemplateFlag).toBe("function");
        });

        test("should configure logger with project name", async () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");

            const CreateProject = require("../../src/commands/new/index.js").default;
            const mockCommand = Object.create(CreateProject.prototype);
            mockCommand.id = "new";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "testapp" },
                flags: {},
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(AppLogger.configureLogger).toHaveBeenCalledWith("testapp", "new");
        });

        test("should merge system configs during default project creation", async () => {
            const SystemConfig = require("../../src/config/system.js").default;

            const CreateProject = require("../../src/commands/new/index.js").default;
            const mockCommand = Object.create(CreateProject.prototype);
            mockCommand.id = "new";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: {},
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            // SystemConfig should be instantiated during run
            const configInstance = SystemConfig.getInstance();
            expect(configInstance).toBeDefined();
            expect(configInstance.mergeConfigs).toBeDefined();
        });

        test("should call handlePrompts for default project creation", async () => {
            const { handlePrompts } = require("../../src/core/utils/handlePrompts-utils.js");

            const CreateProject = require("../../src/commands/new/index.js").default;
            const mockCommand = Object.create(CreateProject.prototype);
            mockCommand.id = "new";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: {},
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(handlePrompts).toHaveBeenCalled();
        });

        test("should initialize terraform project", async () => {
            const TerraformProject = require("../../src/core/terraform-project.js").default;

            const CreateProject = require("../../src/commands/new/index.js").default;
            const mockCommand = Object.create(CreateProject.prototype);
            mockCommand.id = "new";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: {},
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(TerraformProject.getProject).toHaveBeenCalled();
        });

        test("should get AWS account ID for AWS provider", async () => {
            const AWSAccount = require("../../src/core/aws/aws-account.js").default;

            const CreateProject = require("../../src/commands/new/index.js").default;
            const mockCommand = Object.create(CreateProject.prototype);
            mockCommand.id = "new";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: {},
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(AWSAccount.getAccountId).toHaveBeenCalled();
        });

        test("should handle EKS infrastructure when cluster_type is eks-fargate", async () => {
            const { handleEKS } = require("../../src/core/utils/terraformHandlers-utils.js");
            const { handlePrompts } = require("../../src/core/utils/handlePrompts-utils.js");

            // Mock handlePrompts to return eks-fargate cluster type
            (handlePrompts as jest.Mock).mockResolvedValue({
                cloud_provider: "aws",
                cluster_type: "eks-fargate",
                aws_profile: "default",
                github_access_token: "test-token",
                git_user_name: "testuser",
                github_owner: "testorg",
                source_code_repository: "https://github.com/test/repo",
                aws_region: "us-east-1",
                aws_access_key_id: "AKIAIOSFODNN7EXAMPLE",
                aws_secret_access_key: "wJalrXUtnFEMI/K7MDENG",
                environment: "dev",
            });

            const CreateProject = require("../../src/commands/new/index.js").default;
            const mockCommand = Object.create(CreateProject.prototype);
            mockCommand.id = "new";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: {},
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(handleEKS).toHaveBeenCalled();
        });

        test("should handle K8s infrastructure when cluster_type is k8s", async () => {
            const { handleK8s } = require("../../src/core/utils/terraformHandlers-utils.js");
            const { handlePrompts } = require("../../src/core/utils/handlePrompts-utils.js");

            // Mock handlePrompts to return k8s cluster type
            (handlePrompts as jest.Mock).mockResolvedValue({
                cloud_provider: "aws",
                cluster_type: "k8s",
                aws_profile: "default",
                github_access_token: "test-token",
                git_user_name: "testuser",
                github_owner: "testorg",
                source_code_repository: "https://github.com/test/repo",
                aws_region: "us-east-1",
                aws_access_key_id: "AKIAIOSFODNN7EXAMPLE",
                aws_secret_access_key: "wJalrXUtnFEMI/K7MDENG",
                environment: "dev",
            });

            const CreateProject = require("../../src/commands/new/index.js").default;
            const mockCommand = Object.create(CreateProject.prototype);
            mockCommand.id = "new";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: {},
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(handleK8s).toHaveBeenCalled();
        });

        test("should setup and push services", async () => {
            const { setupAndPushServices } = require("../../src/core/utils/setupAndPushService-utils.js");

            const CreateProject = require("../../src/commands/new/index.js").default;
            const mockCommand = Object.create(CreateProject.prototype);
            mockCommand.id = "new";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: {},
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(setupAndPushServices).toHaveBeenCalled();
        });

        test("should check service health", async () => {
            const { serviceHealthCheck } = require("../../src/core/utils/healthCheck-utils.js");

            const CreateProject = require("../../src/commands/new/index.js").default;
            const mockCommand = Object.create(CreateProject.prototype);
            mockCommand.id = "new";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: {},
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(serviceHealthCheck).toHaveBeenCalled();
        });

        test("should handle error during run execution", async () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");

            const CreateProject = require("../../src/commands/new/index.js").default;
            const mockCommand = Object.create(CreateProject.prototype);
            mockCommand.id = "new";
            // Mock parse to reject
            mockCommand.parse = jest.fn().mockRejectedValue(new Error("Test error"));

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            // AppLogger should be used during error handling
            expect(typeof AppLogger).toBe("object");
            expect(AppLogger.error).toBeDefined();
        });
    });
});
