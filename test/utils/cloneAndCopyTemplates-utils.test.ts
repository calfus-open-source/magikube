import { cloneAndCopyTemplates } from "../../src/core/utils/copyTemplates-utils.js";
import { executeCommandWithRetry } from "../../src/core/utils/executeCommandWithRetry-utils.js";
import fs from "fs";
import { AppLogger } from "../../src/logger/appLogger.js";

jest.mock("fs");
jest.mock("../../src/logger/appLogger.js", () => ({
    AppLogger: {
        info: jest.fn(),
        error: jest.fn()
    }
}));
jest.mock("../../src/core/utils/executeCommandWithRetry-utils.js", () => ({
    executeCommandWithRetry: jest.fn()
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockExec = executeCommandWithRetry as jest.MockedFunction<typeof executeCommandWithRetry>;

describe("cloneAndCopyTemplates", () => {
    const cwd = "/mock/project";
    const parentPath = cwd;
    const dist = `${parentPath}/dist`;
    const dirInfra = `${parentPath}/infrastructure-templates`;
    const dirTemplates = `${parentPath}/magikube-templates`;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(process, "cwd").mockReturnValue(cwd);
    });

    it("should clone and copy when dist and template dirs do NOT exist", async () => {
        mockFs.existsSync.mockImplementation((path: any) => false);

        await cloneAndCopyTemplates(undefined);
        expect(mockExec).toHaveBeenCalledTimes(8); // mkdir + 5 clone/copy/rm
        expect(mockExec).toHaveBeenCalledWith(
            expect.stringContaining("mkdir -p"),
            { cwd: parentPath },
            1
        );
        expect(AppLogger.info).toHaveBeenCalledWith(
            "Templates cloned and copied successfully.",
            true
        );
    });

    it("should skip mkdir and clone if folders already exist", async () => {
        mockFs.existsSync.mockImplementation((path: any) => {
            if (path === dist || path === dirInfra || path === dirTemplates) return true;
            return false;
        });

        await cloneAndCopyTemplates(undefined);

        // Should NOT clone repos or mkdir
        expect(mockExec).not.toHaveBeenCalledWith(
            expect.stringContaining("mkdir -p"),
            expect.anything(),
            expect.any(Number)
        );
        expect(mockExec).not.toHaveBeenCalledWith(
            expect.stringContaining("git clone"),
            expect.anything(),
            expect.any(Number)
        );

        // Should still rsync + rm both dirs
        expect(mockExec).toHaveBeenCalledTimes(5);
        expect(AppLogger.info).toHaveBeenCalled();
    });

    it("should handle errors and rethrow", async () => {
        mockFs.existsSync.mockReturnValue(false);
        mockExec.mockRejectedValueOnce(new Error("command failed"));

        await expect(cloneAndCopyTemplates(undefined)).rejects.toThrow("command failed");

        expect(AppLogger.error).toHaveBeenCalledWith(
            "An error occurred during the cloning and copying process:",
            expect.any(Error)
        );
    });
});
