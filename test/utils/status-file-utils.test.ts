import { initializeStatusFile, updateStatusFile, readStatusFile } from "../../src/core/utils/statusUpdater-utils.js";
import * as fs from "fs";
import path from "path";
import SystemConfig from "../../src/config/system.js";
import { AppLogger } from "../../src/logger/appLogger.js";

jest.mock("fs");
jest.mock("../../src/logger/appLogger.js", () => ({
    AppLogger: {
        error: jest.fn(),
    },
}));

jest.mock("../../src/config/system.js", () => ({
    __esModule: true,
    default: {
        getInstance: jest.fn().mockReturnValue({
            getConfig: jest.fn(),
        }),
    },
}));

const mockedFS = fs as jest.Mocked<typeof fs>;
const mockedSystem = SystemConfig.getInstance();
const mockedLogger = AppLogger;

describe("Status File Utils", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("initializeStatusFile", () => {
        it("should create project folder and initialize modules/services", () => {
            mockedFS.existsSync.mockReturnValue(false);
            mockedFS.mkdirSync.mockReturnValue(undefined);
            mockedFS.writeFileSync.mockReturnValue(undefined);

            initializeStatusFile("myProject", ["moduleA", "moduleB"], ["svc1"]);

            const projectPath = path.join(process.cwd(), "myProject");
            const statusPath = path.join(projectPath, "status.json");

            expect(mockedFS.mkdirSync).toHaveBeenCalledWith(projectPath, { recursive: true });
            expect(mockedFS.writeFileSync).toHaveBeenCalledWith(
                statusPath,
                JSON.stringify(
                    {
                        modules: { moduleA: "pending", moduleB: "pending" },
                        services: { svc1: "pending" },
                    },
                    null,
                    2
                ),
                "utf8"
            );
        });

        it("should merge with existing status.json", () => {
            const existing = {
                modules: { moduleA: "success" },
                services: {},
            };

            mockedFS.existsSync.mockReturnValue(true);
            mockedFS.readFileSync.mockReturnValue(JSON.stringify(existing));
            mockedFS.writeFileSync.mockReturnValue(undefined);

            initializeStatusFile("proj", ["moduleA", "moduleB"], []);

            const statusPath = path.join(process.cwd(), "proj", "status.json");

            expect(mockedFS.writeFileSync).toHaveBeenCalledWith(
                statusPath,
                JSON.stringify(
                    {
                        modules: { moduleA: "success", moduleB: "pending" },
                        services: {},
                    },
                    null,
                    2
                ),
                "utf8"
            );
        });
    });

    // --------------------------------------------------------------------------------------

    describe("updateStatusFile", () => {
        it("should update module status when exists", () => {
            const status = {
                modules: { terraform: "pending" },
                services: {},
            };

            mockedSystem.getConfig.mockReturnValue({
                command: "deploy",
                project_name: "proj",
            });

            mockedFS.existsSync.mockReturnValue(true);
            mockedFS.readFileSync.mockReturnValue(JSON.stringify(status));
            mockedFS.writeFileSync.mockReturnValue(undefined);

            updateStatusFile("proj", "terraform", "success");

            const statusPath = path.join(process.cwd(), "proj", "status.json");

            expect(mockedFS.writeFileSync).toHaveBeenCalledWith(
                statusPath,
                JSON.stringify(
                    {
                        modules: { terraform: "success" },
                        services: {},
                    },
                    null,
                    2
                ),
                "utf8"
            );
        });

        it("should update service status when exists", () => {
            const status = {
                modules: {},
                services: { api: "pending" },
            };

            mockedSystem.getConfig.mockReturnValue({
                command: "deploy",
                project_name: "proj",
            });

            mockedFS.existsSync.mockReturnValue(true);
            mockedFS.readFileSync.mockReturnValue(JSON.stringify(status));

            updateStatusFile("proj", "api", "fail");

            const statusPath = path.join(process.cwd(), "proj", "status.json");

            expect(mockedFS.writeFileSync).toHaveBeenCalledWith(
                statusPath,
                JSON.stringify(
                    {
                        modules: {},
                        services: { api: "fail" },
                    },
                    null,
                    2
                ),
                "utf8"
            );
        });

        it("should log error when module/service does not exist", () => {
            const status = { modules: {}, services: {} };

            mockedSystem.getConfig.mockReturnValue({
                command: "deploy",
                project_name: "proj",
            });

            mockedFS.existsSync.mockReturnValue(true);
            mockedFS.readFileSync.mockReturnValue(JSON.stringify(status));

            updateStatusFile("proj", "unknown", "success");

            expect(AppLogger.error).toHaveBeenCalledWith(
                'Service or module "unknown" not found in the status file.',
                true
            );
            expect(mockedFS.writeFileSync).not.toHaveBeenCalled();
        });
    });

    // --------------------------------------------------------------------------------------

    describe("readStatusFile", () => {
        it("should return null when file does not exist", () => {
            mockedFS.existsSync.mockReturnValue(false);

            const result = readStatusFile({ project_name: "proj" });

            expect(result).toBeNull();
        });

        it("should return parsed JSON when file exists", () => {
            const status = { modules: { a: "pending" }, services: {} };

            mockedFS.existsSync.mockReturnValue(true);
            mockedFS.readFileSync.mockReturnValue(JSON.stringify(status));

            const result = readStatusFile({ project_name: "proj" });

            expect(result).toEqual(status);
        });

        it("should read root-level status.json when command=create", () => {
            const status = { modules: {}, services: {} };

            mockedFS.existsSync.mockReturnValue(true);
            mockedFS.readFileSync.mockReturnValue(JSON.stringify(status));

            const result = readStatusFile({}, "create");

            const expectedPath = path.join(process.cwd(), "status.json");

            expect(mockedFS.readFileSync).toHaveBeenCalledWith(expectedPath, "utf8");
            expect(result).toEqual(status);
        });
    });
});
