import { ManageRepository } from "../../src/core/manage-repository.js";
import { AppLogger } from "../../src/logger/appLogger.js";
import ProgressBar from "../../src/logger/progressLogger.js";
import SystemConfig from "../../src/config/system.js";
import axios from "axios";
import sodium from "libsodium-wrappers";
import { executeCommandWithRetry } from "../../src/core/utils/executeCommandWithRetry-utils.js";

jest.mock("../../src/logger/appLogger.js", () => ({
    AppLogger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn()
    }
}));


const mockBar = {
    start: jest.fn(),
    update: jest.fn(),
    stop: jest.fn()
};

jest.mock("../../src/logger/progressLogger.js", () => ({
    __esModule: true,
    default: {
        createProgressBar: jest.fn(() => mockBar)
    }
}));

jest.mock("../../src/config/system.js", () => ({
    __esModule: true,
    default: {
        getInstance: () => ({
            getConfig: () => ({
                command: "create",
                service_name: "testservice"
            })
        })
    }
}));

jest.mock("axios");
jest.mock("libsodium-wrappers");
jest.mock("../../src/core/utils/executeCommandWithRetry-utils.js", () => ({
    executeCommandWithRetry: jest.fn()
}));

describe("ManageRepository.pushCode", () => {

    const mockConfigObject: any = {
        token: "FAKE_TOKEN",
        userName: "rohit",
        orgName: "myorg",
        sourceCodeRepo: "github",
        region: "ap-south-1",
        appName: "myapp",
        projectName: "demo",
        appType: "node",
        awsAccessKey: "AWS_KEY",
        awsSecretKey: "AWS_SECRET",
        environment: "dev"
    };

    beforeEach(() => {
        jest.clearAllMocks();

        (axios.get as jest.Mock).mockResolvedValue({
            data: { key: "PUBLIC_KEY", key_id: "KEY_ID" }
        });

        (sodium.ready as any) = Promise.resolve();
        sodium.from_base64 = jest.fn(() => "B64_KEY");
        sodium.from_string = jest.fn(() => "STRING_KEY");
        sodium.crypto_box_seal = jest.fn(() => "ENCRYPTED_BINARY");
        sodium.to_base64 = jest.fn(() => "ENCRYPTED_VALUE");

        (executeCommandWithRetry as jest.Mock).mockReturnValue("OK");
    });

    test("should push code successfully and return false", async () => {
        const result = await ManageRepository.pushCode(mockConfigObject);

        expect(result).toBe(false);

        // public key fetch twice (fetchkey + encryptSecrets)
        expect(axios.get).toHaveBeenCalledTimes(2);

        // encryption must be called 3 times
        expect(sodium.crypto_box_seal).toHaveBeenCalledTimes(3);

        // git commands must be executed
        expect(executeCommandWithRetry).toHaveBeenCalled();

        // Progress bar calls (fixed)
        expect(mockBar.start).toHaveBeenCalled();
        expect(mockBar.stop).toHaveBeenCalled();
    });

    test("should return true when a git command fails", async () => {
        (executeCommandWithRetry as jest.Mock)
            .mockImplementationOnce(() => { throw new Error("Git fail"); });

        const result = await ManageRepository.pushCode(mockConfigObject);

        expect(result).toBe(true);
        expect(AppLogger.error).toHaveBeenCalled();
    });

    test("should retry fetching public key 3 times on failure", async () => {
        (axios.get as jest.Mock)
            .mockRejectedValueOnce(new Error("Fail 1"))
            .mockRejectedValueOnce(new Error("Fail 2"))
            .mockResolvedValueOnce({
                data: { key: "PUBLIC_KEY", key_id: "KEY_ID" }
            });

        await ManageRepository.pushCode(mockConfigObject);

        // fetchPublicKeyWithRetry calls axios.get() 3 times + encryptSecrets
        expect(axios.get).toHaveBeenCalledTimes(4);
    });
});
