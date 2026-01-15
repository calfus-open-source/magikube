import { AppLogger } from "../../src/logger/appLogger.js";
import fs from "fs";
import winston from "winston";
import path from "path";

jest.mock("fs");
jest.mock("winston", () => {
    const mFormat = {
        combine: jest.fn(),
        timestamp: jest.fn(),
        printf: jest.fn(),
        simple: jest.fn(),
    };
    const mLogger = {
        log: jest.fn(),
    };
    return {
        format: mFormat,
        createLogger: jest.fn(() => mLogger),
        transports: {
            Console: jest.fn(),
            DailyRotateFile: jest.fn(),
        },
    };
});
jest.mock("winston-daily-rotate-file", () => {
    return jest.fn();
});

describe("AppLogger", () => {
    const mockFs = fs as jest.Mocked<typeof fs>;
    const mockWinston = winston as jest.Mocked<typeof winston>;

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset private static properties if possible, or just re-configure
        // Since it's a static class, state persists. We might need to be careful.
    });

    it("should configure logger and create log directory", () => {
        mockFs.existsSync.mockReturnValue(false);
        mockFs.mkdirSync.mockImplementation(() => undefined);
        mockFs.readdirSync.mockReturnValue([]);

        AppLogger.configureLogger("test-project", "new");

        expect(mockFs.mkdirSync).toHaveBeenCalledWith(
            expect.stringContaining("logs"),
            { recursive: true }
        );
        expect(mockWinston.createLogger).toHaveBeenCalledTimes(2); // Console and File
    });

    it("should log info messages", () => {
        // Re-configure to ensure loggers are set
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readdirSync.mockReturnValue([]);
        AppLogger.configureLogger("test-project", "new");

        AppLogger.info("info message");

        // We need to access the mock logger returned by createLogger
        const loggerInstance = mockWinston.createLogger.mock.results[0].value;
        expect(loggerInstance.log).toHaveBeenCalledWith("info", "info message");
    });

    it("should log error messages", () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readdirSync.mockReturnValue([]);
        AppLogger.configureLogger("test-project", "new");

        AppLogger.error("error message");

        const loggerInstance = mockWinston.createLogger.mock.results[0].value;
        expect(loggerInstance.log).toHaveBeenCalledWith("error", "error message");
    });

    it("should rotate log files if they exist", () => {
        mockFs.existsSync.mockReturnValue(true);
        // Mock readdir to return existing log files
        const date = new Date().toISOString().split('T')[0];
        mockFs.readdirSync.mockReturnValue([
            `test-project-${date}.log`
        ] as any);

        // Mock renameSync
        mockFs.renameSync.mockImplementation(() => { });

        AppLogger.configureLogger("test-project", "new");

        expect(mockFs.renameSync).toHaveBeenCalled();
    });
});
