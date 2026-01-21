import { execSync } from "child_process";
import { executeCommandWithRetry } from "../../src/core/utils/executeCommandWithRetry-utils.js";
import { AppLogger } from "../../src/logger/appLogger.js";

jest.mock("child_process", () => ({
    execSync: jest.fn(),
}));

jest.mock("../../src/logger/appLogger.js", () => ({
    AppLogger: {
        info: jest.fn(),
    },
}));

describe("executeCommandWithRetry", () => {
    const mockExec = execSync as jest.Mock;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should execute successfully on first attempt", async () => {
        mockExec.mockReturnValue(Buffer.from("Success"));

        await executeCommandWithRetry("echo test", { cwd: "/mock" }, 3);

        expect(mockExec).toHaveBeenCalledTimes(1);
        expect(AppLogger.info).toHaveBeenCalledWith(
            expect.stringContaining("Executing command")
        );
    });

    it("should retry once and then succeed", async () => {
        mockExec
            .mockImplementationOnce(() => {
                throw Object.assign(new Error("fail-1"), {
                    stderr: Buffer.from("stderr-1"),
                });
            })
            .mockReturnValue(Buffer.from("Success"));

        await executeCommandWithRetry("cmd", {}, 3);

        expect(mockExec).toHaveBeenCalledTimes(2);

        expect(AppLogger.info).toHaveBeenCalledWith(
            expect.stringContaining("Retrying..."),
            true
        );
        expect(AppLogger.info).toHaveBeenCalledWith(
            expect.stringContaining("Success")
        );
    });

    it("should stop retrying after max attempts and log error", async () => {
        const error = Object.assign(new Error("cmd failed"), {
            stderr: Buffer.from("bad stderr"),
        });

        mockExec.mockImplementation(() => {
            throw error;
        });

        await expect(executeCommandWithRetry("cmd", {}, 2)).rejects.toThrow();

        expect(AppLogger.info).toHaveBeenCalledWith(
            expect.stringContaining("Max retry attempts reached"),
            true
        );
    });

    // it("should handle unknown error shape and stop without success", async () => {
    //     const unknownErr: any = {}; // simulate unexpected error shape

    //     mockExec.mockImplementation(() => {
    //         throw unknownErr;
    //     });

    //     await expect(executeCommandWithRetry("cmd", {}, 1)).resolves.not.toThrow();

    //     expect(mockExec).toHaveBeenCalledTimes(1);
    //     expect(AppLogger.info).toHaveBeenCalledWith(
    //         expect.stringContaining("unknown error")
    //     );
    // });


});
