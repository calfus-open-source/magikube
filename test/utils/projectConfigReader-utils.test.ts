import fs from "fs";
import { join } from "path";
import { dotMagikubeConfig } from "../../src/core/utils/projectConfigReader-utils.js";

jest.mock("fs");
jest.mock("path", () => ({
    join: jest.fn((...args) => args.join("/")),
}));

describe("dotMagikubeConfig", () => {
    const projectName = "testProject";
    const projectPath = "/some/path";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return parsed config if .magikube file exists", () => {
        const mockConfig = { name: "testProject", template: "eks-fargate-vpc" };
        // Mock fs.existsSync to return true
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        // Mock fs.readFileSync to return JSON string
        (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify(mockConfig));

        const result = dotMagikubeConfig(projectName, projectPath);

        expect(join).toHaveBeenCalledWith(projectPath, projectName, ".magikube");
        expect(fs.existsSync).toHaveBeenCalled();
        expect(fs.readFileSync).toHaveBeenCalled();
        expect(result).toEqual(mockConfig);
    });

    it("should return null if .magikube file does not exist", () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        const result = dotMagikubeConfig(projectName, projectPath);

        expect(join).toHaveBeenCalledWith(projectPath, projectName, ".magikube");
        expect(fs.existsSync).toHaveBeenCalled();
        expect(result).toBeNull();
    });
});
