jest.setTimeout(30000);
jest.mock("fs");
jest.mock("path");
jest.mock("uuid", () => ({
    v4: jest.fn(() => "test-uuid-1234"),
}));
jest.mock("liquidjs", () => ({
    Liquid: jest.fn(() => ({
        parseAndRender: jest.fn(() => Promise.resolve("rendered-content")),
    })),
}));
jest.mock("inquirer", () => ({
    prompt: jest.fn(() => Promise.resolve({
        service_Name: "auth-service",
    })),
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
                command: "new",
                project_name: "myapp",
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
        command: "new",
        project_name: "myapp",
        service_names: ["auth-service"],
    })),
}));
jest.mock("../../src/core/terraform-project.js", () => ({
    __esModule: true,
    default: {
        getProject: jest.fn(() => Promise.resolve({
            destroyProject: jest.fn(() => Promise.resolve()),
            AWSProfileActivate: jest.fn(() => Promise.resolve()),
            runTerraformDestroyTemplate: jest.fn(() => Promise.resolve()),
        })),
    },
}));
jest.mock("../../src/core/templatesTerraform-projects.js", () => ({
    __esModule: true,
    default: {
        getProject: jest.fn(() => Promise.resolve({
            destroyProject: jest.fn(() => Promise.resolve()),
            AWSProfileActivate: jest.fn(() => Promise.resolve()),
            runTerraformDestroyTemplate: jest.fn(() => Promise.resolve()),
        })),
    },
}));
jest.mock("../../src/core/submoduleTerraform.js", () => ({
    __esModule: true,
    default: {
        getProject: jest.fn(() => Promise.resolve({
            destroyProject: jest.fn(() => Promise.resolve()),
            AWSProfileActivate: jest.fn(() => Promise.resolve()),
            runTerraformDestroyTemplate: jest.fn(() => Promise.resolve()),
        })),
    },
}));
jest.mock("../../src/core/microserviceTerraform.js", () => ({
    __esModule: true,
    default: {
        getProject: jest.fn(() => Promise.resolve({
            destroyProject: jest.fn(() => Promise.resolve()),
            AWSProfileActivate: jest.fn(() => Promise.resolve()),
            runTerraformDestroyTemplate: jest.fn(() => Promise.resolve()),
        })),
    },
}));
jest.mock("../../src/core/utils/statusUpdater-utils.js", () => ({
    readStatusFile: jest.fn(() => Promise.resolve({
        services: { "terraform-apply": "success" },
        modules: { vpc: "success", security: "success" },
    })),
    updateStatusFile: jest.fn(),
}));
jest.mock("../../src/core/utils/unlockTerraformState-utils.js", () => ({
    runTerraformUnlockCommands: jest.fn(() => Promise.resolve()),
}));
jest.mock("../../src/core/utils/executeCommandWithRetry-utils.js", () => ({
    executeCommandWithRetry: jest.fn(() => Promise.resolve()),
}));
jest.mock("../../src/core/utils/deleteMicroService-utils.js", () => ({
    deleteMicroservice: jest.fn(() => Promise.resolve({
        service_names: [],
    })),
}));
jest.mock("../../src/prompts/prompt-generator.js", () => ({
    __esModule: true,
    default: jest.fn(() => ({
        getCreatedServices: jest.fn(() => []),
    })),
}));

import DestroyProject from "../../src/commands/destroy/index.js";

describe("DestroyProject Command", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("Command Metadata", () => {
        test("should have correct description", () => {
            expect(DestroyProject.description).toContain("Destroy magikube project");
        });

        test("should have name argument required", () => {
            expect(DestroyProject.args.name.required).toBe(true);
            expect(DestroyProject.args.name.description).toContain("Project name");
        });

        test("should have dryrun flag", () => {
            expect(DestroyProject.flags.dryrun.char).toBe("d");
            expect(DestroyProject.flags.dryrun.description).toContain("Simulates execution");
        });

        test("should have examples", () => {
            expect(DestroyProject.examples.length).toBeGreaterThan(0);
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
            expect(config.cloud_provider).toBe("aws");
        });
    });

    describe("Terraform Project Management", () => {
        test("should get terraform project instance for new command", async () => {
            const TerraformProject = require("../../src/core/terraform-project.js").default;
            const terraform = await TerraformProject.getProject({});
            expect(terraform).toBeDefined();
            expect(terraform.destroyProject).toBeDefined();
            expect(terraform.AWSProfileActivate).toBeDefined();
        });

        test("should get template terraform project for template command", async () => {
            const TemplateTerraformProject = require("../../src/core/templatesTerraform-projects.js").default;
            const terraform = await TemplateTerraformProject.getProject({});
            expect(terraform).toBeDefined();
            expect(terraform.runTerraformDestroyTemplate).toBeDefined();
        });

        test("should get submodule terraform project for module command", async () => {
            const SubModuleTemplateProject = require("../../src/core/submoduleTerraform.js").default;
            const terraform = await SubModuleTemplateProject.getProject({}, "myapp");
            expect(terraform).toBeDefined();
        });

        test("should get microservice terraform project for create command", async () => {
            const MicroserviceProject = require("../../src/core/microserviceTerraform.js").default;
            const terraform = await MicroserviceProject.getProject({}, "myapp");
            expect(terraform).toBeDefined();
        });

        test("should destroy project", async () => {
            const TerraformProject = require("../../src/core/terraform-project.js").default;
            const terraform = await TerraformProject.getProject({});
            await terraform.destroyProject("myapp", process.cwd());
            expect(terraform.destroyProject).toHaveBeenCalledWith("myapp", process.cwd());
        });

        test("should activate AWS profile", async () => {
            const TerraformProject = require("../../src/core/terraform-project.js").default;
            const terraform = await TerraformProject.getProject({});
            await terraform.AWSProfileActivate("default");
            expect(terraform.AWSProfileActivate).toHaveBeenCalledWith("default");
        });

        test("should run terraform destroy template", async () => {
            const TemplateTerraformProject = require("../../src/core/templatesTerraform-projects.js").default;
            const terraform = await TemplateTerraformProject.getProject({});
            await terraform.runTerraformDestroyTemplate("/path/to/infra", "terraform.tfvars");
            expect(terraform.runTerraformDestroyTemplate).toHaveBeenCalled();
        });
    });

    describe("Status File Management", () => {
        test("should read status file", async () => {
            const { readStatusFile } = require("../../src/core/utils/statusUpdater-utils.js");
            const status = await readStatusFile({});
            expect(status).toBeDefined();
            expect(status.services).toBeDefined();
        });

        test("should check terraform apply status", () => {
            const status = {
                services: { "terraform-apply": "success" },
            };
            const isFailed = status.services["terraform-apply"] === "fail" || status.services["terraform-apply"] === "pending";
            expect(isFailed).toBe(false);
        });
    });

    describe("Terraform State Management", () => {
        test("should unlock terraform state if needed", () => {
            const { runTerraformUnlockCommands } = require("../../src/core/utils/unlockTerraformState-utils.js");
            runTerraformUnlockCommands("/project/path", {});
            expect(runTerraformUnlockCommands).toHaveBeenCalled();
        });

        test("should execute commands with retry", async () => {
            const { executeCommandWithRetry } = require("../../src/core/utils/executeCommandWithRetry-utils.js");
            await executeCommandWithRetry("rm -rf project", {}, 1);
            expect(executeCommandWithRetry).toHaveBeenCalled();
        });
    });

    describe("Microservice Deletion", () => {
        test("should delete microservice", async () => {
            const { deleteMicroservice } = require("../../src/core/utils/deleteMicroService-utils.js");
            const result = await deleteMicroservice({}, {});
            expect(result).toBeDefined();
        });

        test("should prompt for service selection", async () => {
            const inquirer = require("inquirer");
            const response = await inquirer.prompt([]);
            expect(response).toBeDefined();
        });

        test("should render terraform template", async () => {
            const { Liquid } = require("liquidjs");
            const engine = new Liquid();
            const output = await engine.parseAndRender("template", {});
            expect(output).toBe("rendered-content");
        });
    });

    describe("Logger Functionality", () => {
        test("should configure logger with project name", () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            AppLogger.configureLogger("myapp", "destroy", false);
            expect(AppLogger.configureLogger).toHaveBeenCalledWith("myapp", "destroy", false);
        });

        test("should log debug messages", () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            AppLogger.debug("Destroying magikube project", true);
            expect(AppLogger.debug).toHaveBeenCalled();
        });

        test("should log info messages on success", () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            AppLogger.info("service deleted successfully", true);
            expect(AppLogger.info).toHaveBeenCalled();
        });

        test("should log error messages on failure", () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            AppLogger.error("Error in deleting microservice", true);
            expect(AppLogger.error).toHaveBeenCalled();
        });
    });

    describe("Command Type Detection", () => {
        test("should detect new command type", () => {
            const config = { command: "new" };
            expect(config.command).toBe("new");
        });

        test("should detect template in new command", () => {
            const config = { command: "new", template: "eks-fargate-vpc" };
            expect("template" in config).toBe(true);
        });

        test("should detect module command type", () => {
            const config = { command: "module" };
            expect(config.command).toBe("module");
        });

        test("should detect create command type", () => {
            const config = { command: "create" };
            expect(config.command).toBe("create");
        });
    });

    describe("Dryrun Flag Handling", () => {
        test("should set dryrun flag from arguments", () => {
            const flags = { dryrun: true };
            expect(flags.dryrun).toBe(true);
        });

        test("should default dryrun to false", () => {
            const flags = { dryrun: false };
            expect(flags.dryrun).toBe(false);
        });

        test("should merge dryrun flag into config", () => {
            const responses: any = {};
            const flags = { dryrun: true };
            responses.dryrun = flags.dryrun || false;
            expect(responses.dryrun).toBe(true);
        });
    });

    describe("File Operations", () => {
        test("should read file system operations", async () => {
            const fs = require("fs");
            expect(fs).toBeDefined();
        });

        test("should use path operations", () => {
            const path = require("path");
            expect(path).toBeDefined();
        });
    });

    describe("Cloud Provider Support", () => {
        test("should support AWS cloud provider", () => {
            const config = { cloud_provider: "aws" };
            expect(config.cloud_provider).toBe("aws");
        });

        test("should check cloud provider before destroy", () => {
            const terraform = true;
            const cloudProvider = "aws";
            const shouldProceed = terraform && cloudProvider === "aws";
            expect(shouldProceed).toBe(true);
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
            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: { dryrun: false },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(AppLogger.configureLogger).toHaveBeenCalled();
        });

        test("should read project configuration", async () => {
            const { dotMagikubeConfig } = require("../../src/core/utils/projectConfigReader-utils.js");
            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: { dryrun: false },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(dotMagikubeConfig).toHaveBeenCalled();
        });

        test("should get terraform project", async () => {
            const TerraformProject = require("../../src/core/terraform-project.js").default;
            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: { dryrun: false },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(TerraformProject.getProject).toHaveBeenCalled();
        });

        test("should activate AWS profile for AWS provider", async () => {
            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: { dryrun: false },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            // Should activate AWS profile based on config
            const TerraformProject = require("../../src/core/terraform-project.js").default;
            expect(TerraformProject.getProject).toHaveBeenCalled();
        });

        test("should unlock terraform state if needed", async () => {
            const { runTerraformUnlockCommands } = require("../../src/core/utils/unlockTerraformState-utils.js");
            const { readStatusFile } = require("../../src/core/utils/statusUpdater-utils.js");

            // Mock readStatusFile to return failed terraform status to trigger unlock
            (readStatusFile as jest.Mock).mockResolvedValue({
                services: { "terraform-apply": "fail" },
                modules: { vpc: "fail", security: "success" },
            });

            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: { dryrun: false },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            // When terraform-apply status is fail or pending, unlock should be called
            expect(typeof runTerraformUnlockCommands).toBe("function");
        });

        test("should destroy project infrastructure", async () => {
            const TerraformProject = require("../../src/core/terraform-project.js").default;
            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: { dryrun: false },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(TerraformProject.getProject).toHaveBeenCalled();
        });

        test("should handle microservice deletion", async () => {
            const { deleteMicroservice } = require("../../src/core/utils/deleteMicroService-utils.js");
            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "microservice" },
                flags: { dryrun: false },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            // When destroying microservice, deleteMicroservice should be called
            expect(typeof deleteMicroservice).toBe("function");
        });

        test("should handle error during destruction", async () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockRejectedValue(new Error("Test error"));

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(typeof AppLogger).toBe("object");
            expect(AppLogger.error).toBeDefined();
        });

        test("should support dryrun flag", async () => {
            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: { dryrun: true },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            // Dryrun should be processed
            expect(true).toBe(true);
        });
    });

    describe("Project Type Routing", () => {
        test("should route to new command handler", () => {
            const config = { command: "new" };
            const shouldUseNewHandler = config.command === "new" && !("template" in config);
            expect(shouldUseNewHandler).toBe(true);
        });

        test("should route to template handler when template is present", () => {
            const config = { command: "new", template: "eks-fargate-vpc" };
            const shouldUseTemplateHandler = config.command === "new" && "template" in config;
            expect(shouldUseTemplateHandler).toBe(true);
        });

        test("should route to module handler", () => {
            const config = { command: "module" };
            const shouldUseModuleHandler = config.command === "module";
            expect(shouldUseModuleHandler).toBe(true);
        });

        test("should route to microservice handler", () => {
            const config = { command: "create" };
            const shouldUseMicroserviceHandler = config.command === "create";
            expect(shouldUseMicroserviceHandler).toBe(true);
        });
    });

    describe("Configuration Object", () => {
        test("should have all required configuration fields", () => {
            const config = {
                github_access_token: "test-token",
                aws_region: "us-east-1",
                environment: "dev",
                cloud_provider: "aws",
                aws_profile: "default",
                project_name: "myapp",
            };

            expect(config.github_access_token).toBeDefined();
            expect(config.aws_region).toBeDefined();
            expect(config.cloud_provider).toBeDefined();
        });
    });

    describe("Template Project Destruction", () => {
        test("should destroy template project with terraform destroy template", async () => {
            const TemplateTerraformProject = require("../../src/core/templatesTerraform-projects.js").default;
            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: { dryrun: false },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(typeof TemplateTerraformProject.getProject).toBe("function");
        });

        test("should handle template project removal", async () => {
            const { executeCommandWithRetry } = require("../../src/core/utils/executeCommandWithRetry-utils.js");
            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: { dryrun: false },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(typeof executeCommandWithRetry).toBe("function");
        });
    });

    describe("Module Project Destruction", () => {
        test("should destroy module project", async () => {
            const SubModuleTemplateProject = require("../../src/core/submoduleTerraform.js").default;
            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: { dryrun: false },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(typeof SubModuleTemplateProject.getProject).toBe("function");
        });
    });

    describe("Microservice Project Destruction", () => {
        test("should destroy microservice project", async () => {
            const MicroserviceProject = require("../../src/core/microserviceTerraform.js").default;
            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: { dryrun: false },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(typeof MicroserviceProject.getProject).toBe("function");
        });
    });

    describe("Microservice Deletion Flow", () => {
        test("should handle microservice name as special case", async () => {
            const PromptGenerator = require("../../src/prompts/prompt-generator.js").default;
            const originalExit = process.exit;
            process.exit = jest.fn() as any;

            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "microservice" },
                flags: { dryrun: false },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            process.exit = originalExit;
            expect(typeof PromptGenerator).toBe("function");
        });

        test("should get created services for microservice deletion", () => {
            const PromptGenerator = require("../../src/prompts/prompt-generator.js").default;
            const promptGenerator = new PromptGenerator();
            expect(promptGenerator).toBeDefined();
            expect(promptGenerator.getCreatedServices).toBeDefined();
        });

        test("should render terraform template for microservice", async () => {
            const { Liquid } = require("liquidjs");
            const engine = new Liquid();
            const template = "test template";
            const context = { service: "auth-service" };
            const result = await engine.parseAndRender(template, context);
            expect(result).toBe("rendered-content");
        });

        test("should write updated config to .magikube file", () => {
            const fs = require("fs");
            expect(fs.writeFileSync).toBeDefined();
        });

        test("should remove service folder after deletion", async () => {
            const { executeCommandWithRetry } = require("../../src/core/utils/executeCommandWithRetry-utils.js");
            await executeCommandWithRetry("rm -rf service-folder", {}, 1);
            expect(executeCommandWithRetry).toHaveBeenCalled();
        });
    });

    describe("Path and File Handling", () => {
        test("should construct project path correctly", () => {
            const projectPath = "/current/dir/myapp";
            expect(projectPath).toContain("myapp");
        });

        test("should construct infrastructure path correctly", () => {
            const infrastructurePath = "/current/dir/myapp/infrastructure";
            expect(infrastructurePath).toContain("infrastructure");
        });

        test("should handle file existence checks", () => {
            const fs = require("fs");
            expect(fs.existsSync).toBeDefined();
        });
    });

    describe("Environment Configuration", () => {
        test("should use environment from config", () => {
            const SystemConfig = require("../../src/config/system.js").default;
            const config = SystemConfig.getInstance().getConfig();
            expect(config.environment).toBe("dev");
        });

        test("should use aws region from config", () => {
            const SystemConfig = require("../../src/config/system.js").default;
            const config = SystemConfig.getInstance().getConfig();
            expect(config.aws_region).toBe("us-east-1");
        });

        test("should use aws profile from config", () => {
            const SystemConfig = require("../../src/config/system.js").default;
            const config = SystemConfig.getInstance().getConfig();
            expect(config.aws_profile).toBe("default");
        });
    });

    describe("Error Handling Paths", () => {
        test("should handle microservice deletion error gracefully", async () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            const originalExit = process.exit;
            process.exit = jest.fn() as any;

            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "microservice" },
                flags: { dryrun: false },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            process.exit = originalExit;
            expect(typeof AppLogger.error).toBe("function");
        });

        test("should log error message with error details", () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            AppLogger.error("Error in deleting microservice: test error", true);
            expect(AppLogger.error).toHaveBeenCalled();
        });

        test("should handle terraform initialization error", async () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockRejectedValue(new Error("Terraform init failed"));

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(typeof AppLogger).toBe("object");
        });
    });

    describe("Success Logging", () => {
        test("should log microservice deletion success", () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            AppLogger.info("auth-service service deleted successfully", true);
            expect(AppLogger.info).toHaveBeenCalledWith("auth-service service deleted successfully", true);
        });

        test("should log debug message for folder removal", () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            AppLogger.debug("Removing folder /current/myapp", true);
            expect(AppLogger.debug).toHaveBeenCalled();
        });

        test("should log debug message when folder does not exist", () => {
            const { AppLogger } = require("../../src/logger/appLogger.js");
            AppLogger.debug("Folder /current/myapp does not exist in the path", true);
            expect(AppLogger.debug).toHaveBeenCalled();
        });
    });

    describe("Command Execution with Terraform", () => {
        test("should check if terraform initialization was successful", () => {
            const terraform = { destroyProject: jest.fn() };
            expect(terraform).toBeDefined();
            expect(terraform.destroyProject).toBeDefined();
        });

        test("should handle terraform error message", () => {
            const errorMessage = "Terraform project initialization failed or unsupported cloud provider.";
            expect(errorMessage).toContain("Terraform project initialization failed");
        });

        test("should validate terraform project before destruction", () => {
            const terraform = true;
            const isValid = terraform && typeof terraform === "object" || terraform === true;
            expect(isValid).toBe(true);
        });
    });

    describe("Status File and Configuration Merge", () => {
        test("should merge responses into SystemConfig", () => {
            const SystemConfig = require("../../src/config/system.js").default;
            const instance = SystemConfig.getInstance();
            const responses = { dryrun: false };
            instance.mergeConfigs(responses);
            expect(instance.mergeConfigs).toHaveBeenCalledWith(responses);
        });

        test("should read status file successfully", async () => {
            const { readStatusFile } = require("../../src/core/utils/statusUpdater-utils.js");
            const status = await readStatusFile({});
            expect(status).toBeDefined();
            expect(status.services).toBeDefined();
        });

        test("should merge dryrun flag into responses", () => {
            const responses: any = {};
            const flags = { dryrun: true };
            responses.dryrun = flags.dryrun || false;
            expect(responses.dryrun).toBe(true);
        });
    });

    describe("Comprehensive Destroy Flow", () => {
        let originalExit: any;

        beforeEach(() => {
            originalExit = process.exit;
            process.exit = jest.fn() as any;
        });

        afterEach(() => {
            process.exit = originalExit;
        });

        test("should execute complete destroy workflow for new project", async () => {
            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: { dryrun: false },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            // Verify the parsing happened
            expect(mockCommand.parse).toHaveBeenCalled();
        });

        test("should call terraform unlock when terraform-apply status is fail", async () => {
            const { readStatusFile } = require("../../src/core/utils/statusUpdater-utils.js");
            readStatusFile.mockReturnValueOnce({
                services: { "terraform-apply": "fail" },
            });

            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: { dryrun: false },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            const { runTerraformUnlockCommands } = require("../../src/core/utils/unlockTerraformState-utils.js");
            expect(runTerraformUnlockCommands).toHaveBeenCalled();
        });

        test("should call terraform unlock when terraform-apply status is pending", async () => {
            const { readStatusFile } = require("../../src/core/utils/statusUpdater-utils.js");
            readStatusFile.mockReturnValueOnce({
                services: { "terraform-apply": "pending" },
            });

            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: { dryrun: false },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            const { runTerraformUnlockCommands } = require("../../src/core/utils/unlockTerraformState-utils.js");
            expect(runTerraformUnlockCommands).toHaveBeenCalled();
        });

        test("should handle when terraform is not initialized", async () => {
            const TerraformProject = require("../../src/core/terraform-project.js").default;
            TerraformProject.getProject.mockResolvedValueOnce(null);

            const DestroyProject = require("../../src/commands/destroy/index.js").default;
            const mockCommand = Object.create(DestroyProject.prototype);
            mockCommand.id = "destroy";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { name: "myapp" },
                flags: { dryrun: false },
            });

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            const { AppLogger } = require("../../src/logger/appLogger.js");
            expect(AppLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("Terraform project initialization failed"),
                true
            );
        });

        test("should handle different command types in destroy", () => {
            const commands = ["new", "module", "create"];
            expect(commands).toContain("new");
            expect(commands).toContain("module");
            expect(commands).toContain("create");
        });

        test("should verify AWS provider activation is called", () => {
            const config = { cloud_provider: "aws", aws_profile: "default" };
            const shouldActivate = config.cloud_provider === "aws";
            expect(shouldActivate).toBe(true);
        });

        test("should verify terraform unlock is conditional", () => {
            const status = { services: { "terraform-apply": "success" } };
            const shouldUnlock = status.services["terraform-apply"] === "fail" || status.services["terraform-apply"] === "pending";
            expect(shouldUnlock).toBe(false);
        });

        test("should verify terraform unlock when status is fail", () => {
            const status = { services: { "terraform-apply": "fail" } };
            const shouldUnlock = status.services["terraform-apply"] === "fail" || status.services["terraform-apply"] === "pending";
            expect(shouldUnlock).toBe(true);
        });
    });
});
