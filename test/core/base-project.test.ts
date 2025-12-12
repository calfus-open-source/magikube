import fs from "fs";
import path from "path";
import BaseProject from "../../src/core/base-project.js";
import { AppLogger } from "../../src/logger/appLogger.js";
import { appendUniqueLines } from "../../src/core/utils/appendUniqueLines-utils.js";
import SystemConfig from "../../src/config/system.js";

// -------------------- MOCKS --------------------
jest.mock("fs");

jest.mock("../../src/logger/appLogger.js", () => ({
    AppLogger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn()
    }
}));

jest.mock("../../src/core/terraform-project.js", () => ({
    default: {
        getProject: jest.fn().mockResolvedValue({
            runTerraformInit: jest.fn(),
            runTerraformDestroy: jest.fn(),
            startSSHProcess: jest.fn(),
            stopSSHProcess: jest.fn()
        })
    }
}));

jest.mock("../../src/core/utils/statusUpdater-utils.js", () => ({
    readStatusFile: jest.fn()
}));

jest.mock("../../src/core/utils/appendUniqueLines-utils.js", () => ({
    appendUniqueLines: jest.fn()
}));

// --------------------------------------------
// FIXED SystemConfig mock (correct structure)
// --------------------------------------------
const mockGetConfig = jest.fn().mockReturnValue({
    command: "new",
    project_name: "demo",
});

jest.mock("../../src/config/system.js", () => ({
    __esModule: true,
    default: {
        getInstance: jest.fn(() => ({
            getConfig: mockGetConfig
        }))
    }
}));

// -------------------- TEST SETUP --------------------
class DummyCommand { }
const mockCommand = new DummyCommand();

const mockConfig = {
    cluster_type: "eks-fargate",
    environment: "dev",
    command: "new"
};

let project: BaseProject;

beforeEach(() => {
    jest.clearAllMocks();
    project = new (class extends BaseProject { })(mockCommand, mockConfig);
});

// -------------------- TESTS --------------------

// ------------------------------------
// createFolder()
// ------------------------------------
describe("BaseProject.createFolder()", () => {
    test("creates a folder when it does not exist", async () => {
        fs.existsSync.mockReturnValue(false);

        await project.createFolder();

        expect(fs.mkdirSync).toHaveBeenCalledWith(project.projectPath);
        expect(AppLogger.debug).toHaveBeenCalled();
    });

    test("logs error when folder already exists", async () => {
        fs.existsSync.mockReturnValue(true);

        await project.createFolder();

        expect(AppLogger.error).toHaveBeenCalled();
    });
});

// ------------------------------------
// deleteFolder()
// ------------------------------------
describe("BaseProject.deleteFolder()", () => {
    test("deletes folder when it exists", async () => {
        fs.existsSync.mockReturnValue(true);

        await project.deleteFolder();

        expect(fs.rmSync).toHaveBeenCalledWith(project.projectPath, { recursive: true });
    });

    test("logs message if folder does not exist", async () => {
        fs.existsSync.mockReturnValue(false);

        await project.deleteFolder();

        expect(AppLogger.debug).toHaveBeenCalled();
    });
});

// ------------------------------------
// createProject()
// ------------------------------------
describe("BaseProject.createProject()", () => {
    test("creates project and writes .magikube", async () => {
        fs.existsSync.mockReturnValue(false);

        await project.createProject("demo", "/root");

        expect(fs.mkdirSync).toHaveBeenCalled();
        expect(fs.writeFileSync).toHaveBeenCalled();
    });
});

// ------------------------------------
// createProviderFile()
// ------------------------------------
describe("BaseProject.createProviderFile()", () => {
    test("creates providers.tf when it does not exist", async () => {
        fs.existsSync.mockReturnValue(false);

        project.createFile = jest.fn();

        await project.createProviderFile("/root");

        expect(project.createFile).toHaveBeenCalled();
    });

    test("skips if providers.tf already exists", async () => {
        fs.existsSync.mockReturnValue(true);

        project.createFile = jest.fn();

        await project.createProviderFile("/root");

        expect(project.createFile).not.toHaveBeenCalled();
    });
});

// ------------------------------------
// createFile()
// ------------------------------------
describe("BaseProject.createFile()", () => {
    test("writes file for new project", async () => {
        fs.readFileSync.mockReturnValue("template content");

        await project.createFile(
            "main.tf",
            "/template/file.liquid",
            "infra",
            false
        );

        expect(fs.writeFileSync).toHaveBeenCalled();
    });

    test("uses appendUniqueLines for module command", async () => {
        // override SystemConfig mock return
        mockGetConfig.mockReturnValue({
            command: "module"
        });

        fs.readFileSync.mockReturnValue("template");

        await project.createFile("x.tf", "/template", ".", false);

        expect(appendUniqueLines).toHaveBeenCalled();
    });
});

// ------------------------------------
// generateContent()
// ------------------------------------
describe("BaseProject.generateContent()", () => {
    test("reads and parses template", async () => {
        fs.readFileSync.mockReturnValue("content");

        const output = await project.generateContent("/abc/test.liquid");

        expect(output).toBeDefined();
        expect(fs.readFileSync).toHaveBeenCalled();
    });
});

// ------------------------------------
// copyFolderAndRender()
// ------------------------------------
describe("BaseProject.copyFolderAndRender()", () => {
    test("logs error if source does not exist", async () => {
        fs.existsSync.mockReturnValue(false);

        await project.copyFolderAndRender("/src", "/dest");

        expect(AppLogger.error).toHaveBeenCalled();
    });
});
