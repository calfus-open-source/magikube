import { createEmptyMagikubeProject } from "../../src/core/utils/createEmptyProject-utils.js";
import fs from "fs";
import { AppLogger } from "../../src/logger/appLogger.js";
import { join } from "path";

jest.mock("fs");
jest.mock("../../src/logger/appLogger.js", () => ({
    AppLogger: {
        debug: jest.fn(),
        info: jest.fn(),
    },
}));

describe("createEmptyMagikubeProject", () => {
    const mockResponses = { name: "test-project" };
    const projectName = "sample-project";
    const projectPath = join(process.cwd(), projectName);
    const magikubeConfigPath = join(projectPath, ".magikube");

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should create a new project folder and write config file", async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        await createEmptyMagikubeProject(projectName, mockResponses);

        expect(fs.existsSync).toHaveBeenCalledWith(projectPath);
        expect(fs.mkdirSync).toHaveBeenCalledWith(projectPath);
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            magikubeConfigPath,
            JSON.stringify(mockResponses, null, 4)
        );
        expect(AppLogger.info).toHaveBeenCalled();
        expect(AppLogger.debug).toHaveBeenCalled();
    });

    it("should not create folder if it already exists", async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);

        await createEmptyMagikubeProject(projectName, mockResponses);

        expect(fs.existsSync).toHaveBeenCalledWith(projectPath);
        expect(fs.mkdirSync).not.toHaveBeenCalled();
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            magikubeConfigPath,
            JSON.stringify(mockResponses, null, 4)
        );
        expect(AppLogger.info).toHaveBeenCalled();
        expect(AppLogger.debug).toHaveBeenCalled();
    });
});
