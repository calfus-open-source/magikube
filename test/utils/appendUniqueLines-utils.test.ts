import * as fs from "fs";
import { appendUniqueLines } from "../../src/core/utils/appendUniqueLines-utils.js";
import { AppLogger } from "../../src/logger/appLogger.js";
import SystemConfig from "../../src/config/system.js";

jest.mock("fs");
jest.mock("../../src/logger/appLogger.js", () => ({
    AppLogger: {
        info: jest.fn(),
        warn: jest.fn(),
    },
}));
jest.mock("../../src/config/system.js", () => ({
    __esModule: true,
    default: {
        getInstance: () => ({
            getConfig: () => ({ command: "project" }),
        }),
    },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe("appendUniqueLines", () => {
    const sourceFile = "source.tf";
    const destFile = "dest.tf";
    const output = "line1\nline2";

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should write file directly if terraform.tfvars and command !== module", async () => {
        const destTfvars = "some/terraform.tfvars";
        mockFs.writeFileSync.mockImplementation(() => { });
        mockFs.readFileSync.mockReturnValue(output);

        const result = await appendUniqueLines(output, sourceFile, destTfvars);

        expect(mockFs.writeFileSync).toHaveBeenCalledWith(
            destTfvars,
            output,
            "utf8"
        );
        expect(result).toBe(output);
    });

    it("should create file if dest does not exist", async () => {
        mockFs.existsSync.mockReturnValue(false);
        mockFs.writeFileSync.mockImplementation(() => { });
        mockFs.readFileSync.mockReturnValue(output);

        const result = await appendUniqueLines(output, sourceFile, destFile);

        expect(mockFs.writeFileSync).toHaveBeenCalledWith(destFile, output, "utf8");
        expect(AppLogger.info).toHaveBeenCalled();
        expect(result).toBe(output);
    });

    it("should warn if source file is empty and return dest content", async () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValueOnce("") // source empty
            .mockReturnValueOnce("dest content");

        const result = await appendUniqueLines(output, sourceFile, destFile);

        expect(AppLogger.warn).toHaveBeenCalled();
        expect(result).toBe("dest content");
    });

    it("should append only unique lines", async () => {
        mockFs.existsSync.mockReturnValue(true);

        mockFs.readFileSync.mockReturnValueOnce("existing\nline2") // src file
            .mockReturnValueOnce("existing\nline2") // dest file before
            .mockReturnValueOnce("existing\nline2\nline1"); // dest after append

        mockFs.appendFileSync.mockImplementation(() => { });
        const result = await appendUniqueLines(output, sourceFile, destFile);

        expect(mockFs.appendFileSync).toHaveBeenCalledWith(
            destFile,
            "\nline1",
            "utf8"
        );
        expect(AppLogger.info).toHaveBeenCalled();
        expect(result).toContain("line1");
    });

    it("should not append if all lines already exist", async () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue("line1\nline2");

        const result = await appendUniqueLines(output, sourceFile, destFile);

        expect(mockFs.appendFileSync).not.toHaveBeenCalled();
        expect(AppLogger.info).toHaveBeenCalledWith(
            expect.stringContaining("No unique lines")
        );
        expect(result).toContain("line1");
    });
    it("should handle nested blocks correctly", async () => {
        mockFs.existsSync.mockReturnValue(true);
        const sourceWithBlocks = `
resource "foo" "bar" {
  nested {
    key = "value"
  }
}
other_line = 1
`;
        mockFs.readFileSync.mockReturnValueOnce(sourceWithBlocks) // src
            .mockReturnValueOnce("") // dest before
            .mockReturnValueOnce(sourceWithBlocks); // dest after

        mockFs.appendFileSync.mockImplementation(() => { });

        const result = await appendUniqueLines(sourceWithBlocks, sourceFile, destFile);

        expect(mockFs.appendFileSync).toHaveBeenCalledWith(
            destFile,
            expect.stringContaining('resource "foo" "bar" {'),
            "utf8"
        );
        expect(result).toContain("nested {");
    });
});
