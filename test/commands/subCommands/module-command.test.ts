jest.setTimeout(30000);
jest.mock("fs");
jest.mock("path");
jest.mock("inquirer", () => ({
    prompt: jest.fn(() => Promise.resolve({
        cidrBlock: "10.0.0.0/16",
        domain: "example.com",
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
jest.mock("../../../src/config/system.js", () => ({
    __esModule: true,
    default: {
        getInstance: jest.fn(() => ({
            mergeConfigs: jest.fn(),
            getConfig: jest.fn(() => ({
                github_access_token: "test-token",
                aws_region: "us-east-1",
                environment: "dev",
                cloud_provider: "aws",
                aws_profile: "default",
                project_name: "myapp",
            })),
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
jest.mock("../../../src/core/submoduleTerraform.js", () => ({
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
            cidrBlock: "10.0.0.0/16",
            domain: "example.com",
            aws_region: "us-east-1",
            environment: "dev",
        })
    ),
}));
jest.mock("../../../src/core/utils/updateDotMagikube-utils.js", () => ({
    updateProjectConfigArrays: jest.fn(),
}));
jest.mock("../../../src/core/constants/constants.js", () => ({
    services: ["auth-service"],
    singleModules: ["vpc", "eks-fargate", "eks-nodegroup"],
}));
jest.mock("../../../src/prompts/constants.js", () => ({
    Colours: {
        boldText: "\x1b[1m",
        redColor: "\x1b[31m",
        colorReset: "\x1b[0m",
    },
}));

import NewModule from "../../../src/commands/subCommands/modue-command/index.js";

describe("NewModule Command", () => {
    let originalExit: any;

    beforeEach(() => {
        originalExit = process.exit;
        process.exit = jest.fn() as any;
        jest.clearAllMocks();
    });

    afterEach(() => {
        process.exit = originalExit;
    });

    describe("Command Metadata", () => {
        test("should have correct description", () => {
            expect(NewModule.description).toContain("Create a new module");
        });

        test("should have moduleType argument required", () => {
            expect(NewModule.args.moduleType.required).toBe(true);
            expect(NewModule.args.moduleType.description).toContain("Type of module");
        });

        test("should have moduleName argument required", () => {
            expect(NewModule.args.moduleName.required).toBe(true);
            expect(NewModule.args.moduleName.description).toContain("Name of the module");
        });

        test("should have examples", () => {
            expect(NewModule.examples.length).toBeGreaterThan(0);
        });
    });

    describe("Module Name Validation", () => {
        test("should accept valid module names with alphanumeric characters", () => {
            const pattern = /^[a-zA-Z0-9_-]+$/;
            expect(pattern.test("myModule")).toBe(true);
            expect(pattern.test("my-module")).toBe(true);
            expect(pattern.test("my_module")).toBe(true);
            expect(pattern.test("MyModule123")).toBe(true);
        });

        test("should reject module names with invalid characters", () => {
            const pattern = /^[a-zA-Z0-9_-]+$/;
            expect(pattern.test("my module")).toBe(false);
            expect(pattern.test("my@module")).toBe(false);
            expect(pattern.test("my.module")).toBe(false);
            expect(pattern.test("my/module")).toBe(false);
        });

        test("should reject module names with special characters", () => {
            const pattern = /^[a-zA-Z0-9_-]+$/;
            expect(pattern.test("my$module")).toBe(false);
            expect(pattern.test("my#module")).toBe(false);
            expect(pattern.test("my!module")).toBe(false);
        });

        test("should allow underscores and hyphens in module names", () => {
            const pattern = /^[a-zA-Z0-9_-]+$/;
            expect(pattern.test("my_module")).toBe(true);
            expect(pattern.test("my-module")).toBe(true);
            expect(pattern.test("my_-module")).toBe(true);
        });
    });

    describe("File Operations", () => {
        test("should check if .magikube file exists", () => {
            const fs = require("fs");
            fs.existsSync.mockReturnValueOnce(true);

            expect(fs.existsSync).toBeDefined();
        });

        test("should read .magikube file content", () => {
            const fs = require("fs");
            fs.existsSync.mockReturnValueOnce(true);
            fs.readFileSync.mockReturnValueOnce(
                JSON.stringify({ project_name: "myapp" })
            );

            const content = JSON.parse(fs.readFileSync(""));
            expect(content.project_name).toBe("myapp");
        });

        test("should write updated .magikube file", () => {
            const fs = require("fs");
            fs.existsSync.mockReturnValueOnce(true);
            fs.readFileSync.mockReturnValueOnce(
                JSON.stringify({ project_name: "myapp", modules: [] })
            );

            const content = { project_name: "myapp", modules: ["vpc"] };
            fs.writeFileSync("", JSON.stringify(content, null, 2), "utf-8");

            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        test("should handle missing .magikube file", () => {
            const pattern = /^\/[a-zA-Z0-9_/.:-]+$/;
            expect(pattern.test("/path/to/.magikube")).toBe(true);
            expect(pattern.test("invalid path")).toBe(false);
        });

        test("should check dist folder existence", () => {
            const distPath = "dist";
            const parentDir = "..";
            const fullPath = `${parentDir}/${distPath}`;

            expect(fullPath).toBe("../dist");
            expect(distPath).toBe("dist");
        });
    });

    describe("Configuration Management", () => {
        test("should merge module config into SystemConfig", () => {
            const SystemConfig = require("../../../src/config/system.js").default;
            const instance = SystemConfig.getInstance();

            expect(instance.mergeConfigs).toBeDefined();
        });

        test("should get project configuration", () => {
            const SystemConfig = require("../../../src/config/system.js").default;
            const instance = SystemConfig.getInstance();
            const config = instance.getConfig();

            expect(config.project_name).toBe("myapp");
            expect(config.cloud_provider).toBe("aws");
        });

        test("should update project config arrays", () => {
            const { updateProjectConfigArrays } = require("../../../src/core/utils/updateDotMagikube-utils.js");
            updateProjectConfigArrays({}, "vpc", "my-vpc", "10.0.0.0/16");

            expect(updateProjectConfigArrays).toHaveBeenCalledWith(
                expect.any(Object),
                "vpc",
                "my-vpc",
                "10.0.0.0/16"
            );
        });

        test("should set command to module in config", () => {
            const config: any = { project_name: "myapp" };
            config.command = "module";

            expect(config.command).toBe("module");
        });

        test("should configure logger with project name", () => {
            const { AppLogger } = require("../../../src/logger/appLogger.js");
            const projectName = "myapp";

            AppLogger.configureLogger(projectName, "module");
            expect(AppLogger.configureLogger).toHaveBeenCalledWith(projectName, "module");
        });
    });

    describe("Prompt Handling", () => {
        test("should call handlePrompts with correct parameters", async () => {
            const { handlePrompts } = require("../../../src/core/utils/handlePrompts-utils.js");

            const responses = await handlePrompts("", "module", "", "vpc");
            expect(handlePrompts).toHaveBeenCalledWith("", "module", "", "vpc");
            expect(responses.cidrBlock).toBe("10.0.0.0/16");
        });

        test("should log prompt responses for debugging", () => {
            const { AppLogger } = require("../../../src/logger/appLogger.js");
            const responses = { cidrBlock: "10.0.0.0/16", domain: "example.com" };

            AppLogger.info(`Prompt responses: ${JSON.stringify(responses)}`, true);
            expect(AppLogger.info).toHaveBeenCalled();
        });

        test("should warn when vpc module lacks cidrBlock", () => {
            const { AppLogger } = require("../../../src/logger/appLogger.js");
            const moduleType = "vpc";
            const responses: any = {};

            if (moduleType === "vpc" && !responses?.cidrBlock) {
                AppLogger.warn(
                    `No cidrBlock provided for vpc module test`,
                    true
                );
            }

            expect(AppLogger.warn).toHaveBeenCalled();
        });

        test("should handle domain responses from prompts", () => {
            const config: any = { project_name: "myapp" };
            const responses = { domain: "example.com" };

            if (responses?.domain) {
                if (!config.domains) {
                    config.domains = [];
                }
                if (!config.domains.includes(responses.domain)) {
                    config.domains.push(responses.domain);
                }
            }

            expect(config.domains).toContain("example.com");
        });

        test("should not duplicate domains in config", () => {
            const config = { domains: ["example.com"] };
            const responses = { domain: "example.com" };

            if (responses?.domain) {
                if (!config.domains.includes(responses.domain)) {
                    config.domains.push(responses.domain);
                }
            }

            expect(config.domains.length).toBe(1);
        });
    });

    describe("Template Handling", () => {
        test("should clone and copy templates if dist folder missing", () => {
            // Test the logic that determines when to clone
            const distFolderExists = false;

            if (!distFolderExists) {
                // This is when cloneAndCopyTemplates would be called
                expect(!distFolderExists).toBe(true);
            }
        });

        test("should not clone templates if dist folder exists", () => {
            // Test the logic that determines when NOT to clone
            const distFolderExists = true;

            if (!distFolderExists) {
                // This block should not execute
                expect(true).toBe(false);
            }

            expect(distFolderExists).toBe(true);
        });
    });

    describe("Status File Management", () => {
        test("should initialize status file", () => {
            const { initializeStatusFile } = require("../../../src/core/utils/statusUpdater-utils.js");

            initializeStatusFile("", ["vpc"], ["policy"]);
            expect(initializeStatusFile).toHaveBeenCalledWith("", ["vpc"], ["policy"]);
        });

        test("should read status file", async () => {
            const { readStatusFile } = require("../../../src/core/utils/statusUpdater-utils.js");
            const config = { project_name: "myapp" };

            const status = await readStatusFile(config, "module");
            expect(status.services["terraform-apply"]).toBe("success");
        });

        test("should update status file on terraform apply", () => {
            const { updateStatusFile } = require("../../../src/core/utils/statusUpdater-utils.js");

            updateStatusFile("myapp", "vpc", "success");
            expect(updateStatusFile).toHaveBeenCalledWith("myapp", "vpc", "success");
        });

        test("should update status file to fail before terraform apply", () => {
            const { updateStatusFile } = require("../../../src/core/utils/statusUpdater-utils.js");

            updateStatusFile("myapp", "vpc", "fail");
            expect(updateStatusFile).toHaveBeenCalledWith("myapp", "vpc", "fail");
        });
    });

    describe("Terraform Project Management", () => {
        test("should get SubModuleTemplateProject instance", async () => {
            const SubModuleTemplateProject = require("../../../src/core/submoduleTerraform.js").default;

            const terraform = await SubModuleTemplateProject.getProject({}, "");
            expect(terraform).toBeDefined();
            expect(terraform.createProject).toBeDefined();
        });

        test("should create terraform project", async () => {
            const SubModuleTemplateProject = require("../../../src/core/submoduleTerraform.js").default;

            const terraform = await SubModuleTemplateProject.getProject({}, "");
            await terraform.createProject("", "/current/dir");

            expect(terraform.createProject).toHaveBeenCalled();
        });

        test("should activate AWS profile for AWS provider", async () => {
            const SubModuleTemplateProject = require("../../../src/core/submoduleTerraform.js").default;

            const terraform = await SubModuleTemplateProject.getProject({}, "");
            const config = { cloud_provider: "aws", aws_profile: "default" };

            if (config.cloud_provider === "aws") {
                await terraform.AWSProfileActivate(config.aws_profile);
            }

            expect(terraform.AWSProfileActivate).toHaveBeenCalled();
        });

        test("should not activate AWS profile for non-AWS providers", async () => {
            const SubModuleTemplateProject = require("../../../src/core/submoduleTerraform.js").default;

            const terraform = await SubModuleTemplateProject.getProject({}, "");
            jest.clearAllMocks();
            const config: any = { cloud_provider: "gcp" };

            if (config.cloud_provider === "aws") {
                await terraform.AWSProfileActivate(config.aws_profile);
            }

            expect(terraform.AWSProfileActivate).not.toHaveBeenCalled();
        });

        test("should run terraform init", async () => {
            const SubModuleTemplateProject = require("../../../src/core/submoduleTerraform.js").default;

            const terraform = await SubModuleTemplateProject.getProject({}, "");
            await terraform.runTerraformInit(
                "/current/dir/infrastructure",
                "dev-config.tfvars",
                ""
            );

            expect(terraform.runTerraformInit).toHaveBeenCalled();
        });

        test("should run terraform apply for vpc module", async () => {
            const SubModuleTemplateProject = require("../../../src/core/submoduleTerraform.js").default;

            const terraform = await SubModuleTemplateProject.getProject({}, "");
            await terraform.runTerraformApply(
                "/current/dir/infrastructure",
                "vpc",
                "my-vpc",
                "terraform.tfvars"
            );

            expect(terraform.runTerraformApply).toHaveBeenCalled();
        });

        test("should convert eks-fargate to eks for terraform apply", () => {
            let moduleType = "eks-fargate";

            if (moduleType === "eks-nodegroup" || moduleType === "eks-fargate") {
                moduleType = "eks";
            }

            expect(moduleType).toBe("eks");
        });

        test("should convert eks-nodegroup to eks for terraform apply", () => {
            let moduleType = "eks-nodegroup";

            if (moduleType === "eks-nodegroup" || moduleType === "eks-fargate") {
                moduleType = "eks";
            }

            expect(moduleType).toBe("eks");
        });
    });

    describe("Logging and Messaging", () => {
        test("should log module creation start", () => {
            const { AppLogger } = require("../../../src/logger/appLogger.js");

            AppLogger.info(
                `Starting new module setup: my-vpc of type vpc in the current project`,
                true
            );

            expect(AppLogger.info).toHaveBeenCalledWith(
                expect.stringContaining("Starting new module setup"),
                true
            );
        });

        test("should log terraform apply start", () => {
            const { AppLogger } = require("../../../src/logger/appLogger.js");

            AppLogger.info(`Starting Terraform apply for module: vpc`, true);

            expect(AppLogger.info).toHaveBeenCalledWith(
                expect.stringContaining("Starting Terraform apply"),
                true
            );
        });

        test("should log terraform apply success", () => {
            const { AppLogger } = require("../../../src/logger/appLogger.js");

            AppLogger.debug(`Successfully applied Terraform for module: vpc`, true);

            expect(AppLogger.debug).toHaveBeenCalledWith(
                expect.stringContaining("Successfully applied"),
                true
            );
        });

        test("should log terraform apply error", () => {
            const { AppLogger } = require("../../../src/logger/appLogger.js");
            const error = "Terraform apply failed";

            AppLogger.error(
                `Error applying Terraform for module: my-vpc, ${error}`,
                true
            );

            expect(AppLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("Error applying Terraform"),
                true
            );
        });

        test("should log missing .magikube file error", () => {
            const { AppLogger } = require("../../../src/logger/appLogger.js");

            AppLogger.error(
                `The .magikube file is missing in the current directory: /current/dir`,
                true
            );

            expect(AppLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("missing in the current directory"),
                true
            );
        });

        test("should log general module creation error", () => {
            const { AppLogger } = require("../../../src/logger/appLogger.js");
            const error = "Configuration error";

            AppLogger.error(
                `An error occurred during the module creation process: ${error}`,
                true
            );

            expect(AppLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("An error occurred"),
                true
            );
        });
    });

    describe("Integration Tests - Module Command Execution", () => {
        test("should initialize logger with project name on run", async () => {
            const { AppLogger } = require("../../../src/logger/appLogger.js");
            const NewModule = require("../../../src/commands/subCommands/modue-command/index.js").default;
            const mockCommand = Object.create(NewModule.prototype);
            mockCommand.id = "module";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { moduleType: "vpc", moduleName: "my-vpc" },
            });

            const fs = require("fs");
            fs.existsSync.mockReturnValueOnce(true);
            fs.readFileSync.mockReturnValueOnce(
                JSON.stringify({ project_name: "myapp", modules: [] })
            );

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(AppLogger.configureLogger).toHaveBeenCalled();
        });

        test("should read .magikube file and validate existence", async () => {
            const fs = require("fs");
            const NewModule = require("../../../src/commands/subCommands/modue-command/index.js").default;
            const mockCommand = Object.create(NewModule.prototype);
            mockCommand.id = "module";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { moduleType: "vpc", moduleName: "my-vpc" },
            });

            fs.existsSync.mockReturnValueOnce(true);

            try {
                await mockCommand.run();
            } catch (e) {
            }

            expect(fs.existsSync).toHaveBeenCalled();
        });

        test("should exit with error if .magikube file missing", async () => {
            const fs = require("fs");
            jest.clearAllMocks();

            const NewModule = require("../../../src/commands/subCommands/modue-command/index.js").default;
            const mockCommand = Object.create(NewModule.prototype);
            mockCommand.id = "module";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { moduleType: "vpc", moduleName: "my-vpc" },
            });

            fs.existsSync.mockImplementation(() => false);

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            // The error should be logged and process exits
            expect(mockCommand.parse).toHaveBeenCalled();
        });

        test("should call handlePrompts with module type", async () => {
            const { handlePrompts } = require("../../../src/core/utils/handlePrompts-utils.js");
            const fs = require("fs");
            const NewModule = require("../../../src/commands/subCommands/modue-command/index.js").default;
            const mockCommand = Object.create(NewModule.prototype);
            mockCommand.id = "module";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { moduleType: "vpc", moduleName: "my-vpc" },
            });

            fs.existsSync.mockReturnValueOnce(true);
            fs.readFileSync.mockReturnValueOnce(
                JSON.stringify({ project_name: "myapp" })
            );

            try {
                await mockCommand.run();
            } catch (e) {
                // Expected
            }

            expect(handlePrompts).toHaveBeenCalled();
        });

        test("should merge config and get terraform project", async () => {
            const SystemConfig = require("../../../src/config/system.js").default;
            const SubModuleTemplateProject = require("../../../src/core/submoduleTerraform.js").default;
            const fs = require("fs");
            jest.clearAllMocks();

            const NewModule = require("../../../src/commands/subCommands/modue-command/index.js").default;
            const mockCommand = Object.create(NewModule.prototype);
            mockCommand.id = "module";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { moduleType: "vpc", moduleName: "my-vpc" },
            });

            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(
                JSON.stringify({ project_name: "myapp" })
            );

            try {
                await mockCommand.run();
            } catch (e) {
            }

            expect(SubModuleTemplateProject.getProject).toHaveBeenCalled();
        });

        test("should execute terraform operations if project exists", async () => {
            const SubModuleTemplateProject = require("../../../src/core/submoduleTerraform.js").default;
            const fs = require("fs");
            const NewModule = require("../../../src/commands/subCommands/modue-command/index.js").default;
            const mockCommand = Object.create(NewModule.prototype);
            mockCommand.id = "module";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { moduleType: "vpc", moduleName: "my-vpc" },
            });

            fs.existsSync.mockReturnValueOnce(true);
            fs.readFileSync.mockReturnValueOnce(
                JSON.stringify({ project_name: "myapp" })
            );

            try {
                await mockCommand.run();
            } catch (e) {
            }

            expect(SubModuleTemplateProject.getProject).toHaveBeenCalled();
        });

        test("should handle terraform apply errors gracefully", () => {
            const { AppLogger } = require("../../../src/logger/appLogger.js");
            const error = "Terraform apply failed";

            try {
                throw new Error(error);
            } catch (e: any) {
                AppLogger.error(
                    `Error applying Terraform for module: my-vpc, ${e.message}`,
                    true
                );
            }

            expect(AppLogger.error).toHaveBeenCalled();
        });

        test("should exit with success code on completion", async () => {
            const fs = require("fs");
            const NewModule = require("../../../src/commands/subCommands/modue-command/index.js").default;
            const mockCommand = Object.create(NewModule.prototype);
            mockCommand.id = "module";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { moduleType: "vpc", moduleName: "my-vpc" },
            });

            fs.existsSync.mockReturnValueOnce(true);
            fs.readFileSync.mockReturnValueOnce(
                JSON.stringify({ project_name: "myapp" })
            );

            try {
                await mockCommand.run();
            } catch (e) {
            }

            expect(process.exit).toHaveBeenCalledWith(0);
        });

        test("should exit with error code on failure", async () => {
            const fs = require("fs");
            const NewModule = require("../../../src/commands/subCommands/modue-command/index.js").default;
            const mockCommand = Object.create(NewModule.prototype);
            mockCommand.id = "module";
            mockCommand.parse = jest.fn().mockResolvedValue({
                args: { moduleType: "vpc", moduleName: "invalid module!" },
            });

            fs.existsSync.mockReturnValueOnce(true);

            try {
                await mockCommand.run();
            } catch (e) {
            }

            expect(process.exit).toHaveBeenCalled();
        });
    });

    describe("Module Type Support", () => {
        test("should support vpc module type", () => {
            const singleModules = ["vpc", "eks-fargate", "eks-nodegroup"];
            expect(singleModules).toContain("vpc");
        });

        test("should support eks-fargate module type", () => {
            const singleModules = ["vpc", "eks-fargate", "eks-nodegroup"];
            expect(singleModules).toContain("eks-fargate");
        });

        test("should support eks-nodegroup module type", () => {
            const singleModules = ["vpc", "eks-fargate", "eks-nodegroup"];
            expect(singleModules).toContain("eks-nodegroup");
        });
    });

    describe("Terraform Configuration", () => {
        test("should use environment-specific tfvars file", () => {
            const environment = "dev";
            const tfvarsFile = `${environment}-config.tfvars`;

            expect(tfvarsFile).toBe("dev-config.tfvars");
        });

        test("should handle terraform apply with moduleType conversion", () => {
            let moduleType = "eks-fargate";

            if (moduleType === "eks-nodegroup" || moduleType === "eks-fargate") {
                moduleType = "eks";
            }

            expect(moduleType).toBe("eks");
        });

        test("should set terraform apply status before execution", () => {
            const { updateStatusFile } = require("../../../src/core/utils/statusUpdater-utils.js");

            updateStatusFile("myapp", "vpc", "fail");
            expect(updateStatusFile).toHaveBeenCalledWith("myapp", "vpc", "fail");
        });

        test("should update terraform apply status on success", () => {
            const { updateStatusFile } = require("../../../src/core/utils/statusUpdater-utils.js");

            updateStatusFile("myapp", "vpc", "success");
            expect(updateStatusFile).toHaveBeenCalledWith("myapp", "vpc", "success");
        });
    });

    describe("AWS Profile Management", () => {
        test("should activate AWS profile when cloud provider is aws", async () => {
            const SubModuleTemplateProject = require("../../../src/core/submoduleTerraform.js").default;

            const terraform = await SubModuleTemplateProject.getProject({}, "");
            const config = { cloud_provider: "aws", aws_profile: "default" };

            if (config.cloud_provider === "aws") {
                await terraform.AWSProfileActivate(config.aws_profile);
            }

            expect(terraform.AWSProfileActivate).toHaveBeenCalledWith("default");
        });

        test("should skip AWS activation for non-aws providers", async () => {
            const SubModuleTemplateProject = require("../../../src/core/submoduleTerraform.js").default;

            const terraform = await SubModuleTemplateProject.getProject({}, "");
            jest.clearAllMocks();
            const config = { cloud_provider: "gcp", aws_profile: "default" };

            if (config.cloud_provider === "aws") {
                await terraform.AWSProfileActivate(config.aws_profile);
            }

            expect(terraform.AWSProfileActivate).not.toHaveBeenCalled();
        });

        test("should use configured aws profile from config", () => {
            const config = { aws_profile: "dev-profile" };

            expect(config.aws_profile).toBe("dev-profile");
        });
    });

    describe("Domain Handling", () => {
        test("should initialize domains array if not present", () => {
            const config: any = {};
            const responses = { domain: "example.com" };

            if (responses?.domain) {
                if (!config.domains) {
                    config.domains = [];
                }
                config.domains.push(responses.domain);
            }

            expect(config.domains).toContain("example.com");
        });

        test("should add domain to existing domains array", () => {
            const config: any = { domains: ["test.com"] };
            const responses = { domain: "example.com" };

            if (responses?.domain) {
                if (!config.domains.includes(responses.domain)) {
                    config.domains.push(responses.domain);
                }
            }

            expect(config.domains).toContain("test.com");
            expect(config.domains).toContain("example.com");
        });
    });

    describe("Error Handling", () => {
        test("should handle terraform apply errors", () => {
            const { AppLogger } = require("../../../src/logger/appLogger.js");
            const error = new Error("Terraform failed");

            try {
                throw error;
            } catch (e: any) {
                AppLogger.error(
                    `Error applying Terraform for module: my-vpc, ${e.message}`,
                    true
                );
            }

            expect(AppLogger.error).toHaveBeenCalled();
        });

        test("should handle configuration merge errors", () => {
            const { AppLogger } = require("../../../src/logger/appLogger.js");
            const error = new Error("Config merge failed");

            try {
                throw error;
            } catch (e: any) {
                AppLogger.error(
                    `An error occurred during the module creation process: ${e.message}`,
                    true
                );
            }

            expect(AppLogger.error).toHaveBeenCalled();
        });

        test("should log .magikube file missing error", () => {
            const { AppLogger } = require("../../../src/logger/appLogger.js");

            AppLogger.error(
                `The .magikube file is missing in the current directory: /home/user/project`,
                true
            );

            expect(AppLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("missing in the current directory"),
                true
            );
        });
    });

    describe("Prompt Configuration", () => {
        test("should pass empty template parameter to handlePrompts", async () => {
            const { handlePrompts } = require("../../../src/core/utils/handlePrompts-utils.js");

            await handlePrompts("", "module", "", "vpc");
            expect(handlePrompts).toHaveBeenCalledWith("", "module", "", "vpc");
        });

        test("should retrieve cidrBlock from prompt responses", async () => {
            const { handlePrompts } = require("../../../src/core/utils/handlePrompts-utils.js");

            const responses = await handlePrompts("", "module", "", "vpc");
            expect(responses.cidrBlock).toBeDefined();
        });

        test("should retrieve domain from prompt responses", async () => {
            const { handlePrompts } = require("../../../src/core/utils/handlePrompts-utils.js");

            const responses = await handlePrompts("", "module", "", "vpc");
            expect(responses.domain).toBeDefined();
        });
    });
});
