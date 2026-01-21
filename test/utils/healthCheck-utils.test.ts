import { checkServiceStatus, waitForServiceToUP, serviceHealthCheck } from "../../src/core/utils/healthCheck-utils";
import fs from "fs";
import { AppLogger } from "../../src/logger/appLogger.js";
import { executeCommandWithRetry } from "../../src/core/utils/executeCommandWithRetry-utils.js";
import ora from "ora";

jest.mock("follow-redirects", () => ({
    http: {
        get: jest.fn(),
    },
}));

const mockHttp = require("follow-redirects").http;

jest.mock("ora", () => {
    return jest.fn(() => ({
        start: jest.fn().mockReturnThis(),
        succeed: jest.fn(),
        fail: jest.fn(),
    }));
});

jest.mock("fs", () => ({
    existsSync: jest.fn(),
}));

jest.mock("../../src/core/utils/executeCommandWithRetry-utils.js", () => ({
    executeCommandWithRetry: jest.fn(),
}));

jest.mock("../../src/logger/appLogger.js", () => ({
    AppLogger: {
        info: jest.fn(),
        error: jest.fn(),
    },
}));

// Speed up tests by mocking timeout
jest.spyOn(global, "setTimeout").mockImplementation((cb: any) => {
    cb();
    return undefined as any;
});

describe("checkServiceStatus", () => {
    it("returns true when statusCode is 200", async () => {
        mockHttp.get.mockImplementation((_url: string, cb: any) => {
            cb({ statusCode: 200 });
            return { on: jest.fn() };
        });

        const result = await checkServiceStatus("http://test.com");
        expect(result).toBe(true);
    });

    it("returns false when statusCode is not 200", async () => {
        mockHttp.get.mockImplementation((_url: string, cb: any) => {
            cb({ statusCode: 503 });
            return { on: jest.fn() };
        });

        const result = await checkServiceStatus("http://test.com");
        expect(result).toBe(false);
    });

    it("returns false when request errors", async () => {
        mockHttp.get.mockImplementation(() => {
            return { on: (_: string, handler: any) => handler(new Error("Network Error")) };
        });

        const result = await checkServiceStatus("http://test.com");
        expect(result).toBe(false);
    });
});

describe("waitForServiceToUP", () => {
    it("returns false when retries exhausted", async () => {
        const mockCheck = jest.spyOn(
            require("../../src/core/utils/healthCheck-utils"),
            "checkServiceStatus"
        );

        mockCheck.mockResolvedValue(false);

        const result = await waitForServiceToUP("http://down.com", "keycloak");
        expect(result).toBe(false);
        expect(AppLogger.error).toHaveBeenCalled();
    });
});

describe("serviceHealthCheck", () => {
    const args = { name: "demo" };
    const responses = { domain: "example.com" };
    const projectConfig = { frontend_app_type: "frontend" };
    const keycloakPath = `${process.cwd()}/demo/keycloak/config.sh`;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("logs error when config.sh is missing", async () => {
        jest.spyOn(fs, "existsSync").mockReturnValue(false);

        const mockWait = jest.spyOn(
            require("../../src/core/utils/healthCheck-utils"),
            "waitForServiceToUP"
        );

        mockWait
            .mockResolvedValueOnce(true)   // Keycloak UP
            .mockResolvedValueOnce(true)   // ArgoCD UP
            .mockResolvedValueOnce(true);  // Frontend UP

        await serviceHealthCheck(args, responses, projectConfig);

        expect(AppLogger.error).toHaveBeenCalledWith("config.sh file not found", true);
    });

    it("logs error when one or more services fail", async () => {
        jest.spyOn(fs, "existsSync").mockReturnValue(true);

        const mockWait = jest.spyOn(
            require("../../src/core/utils/healthCheck-utils"),
            "waitForServiceToUP"
        );

        mockWait
            .mockResolvedValueOnce(true)   // Keycloak UP
            .mockResolvedValueOnce(false)  // ArgoCD DOWN
            .mockResolvedValueOnce(true);  // Frontend UP

        await serviceHealthCheck(args, responses, projectConfig);

        expect(AppLogger.error).toHaveBeenCalledWith(
            "One or more services failed to start. Please check the service.",
            true
        );
    });
});
