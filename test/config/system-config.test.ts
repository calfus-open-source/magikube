import fs from "fs";

// Mock fs
jest.mock("fs");

const mockLoad = jest.fn();
const mockGetConfig = jest.fn();

jest.mock("../../src/config/user.js", () => {
    return jest.fn().mockImplementation(() => ({
        load: mockLoad,
        getConfig: mockGetConfig
    }));
});

// Import AFTER mocks
import SystemConfig from "../../src/config/system.js";

describe("SystemConfig", () => {
    let instance: any;

    beforeEach(() => {
        jest.clearAllMocks();

        process.env.HOME = "/home/test";

        jest.spyOn(SystemConfig.prototype as any, "init").mockImplementation(async () => { });

        instance = SystemConfig.getInstance();

        // Reset config inside singleton
        instance.config = {};
    });

    test("exists() should return true when file exists", () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        expect(instance.exists("/path")).toBe(true);
    });

    test("exists() should return false when file does not exist", () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);
        expect(instance.exists("/path")).toBe(false);
    });

    test("create() should write default system.json", () => {
        instance.create("/path/system.json");

        expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            "/path/system.json",
            expect.any(String)
        );
    });

    test("load() should read json and load config", () => {
        const json = JSON.stringify({ key: "value" });
        (fs.readFileSync as jest.Mock).mockReturnValue(json);

        instance.load("/path/system.json");

        expect(instance.getConfig()).toEqual({ key: "value" });
    });

    test("init() should load and merge user.json when it exists", async () => {
        (SystemConfig.prototype as any).init.mockRestore();

        (fs.existsSync as jest.Mock)
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true);

        (fs.readFileSync as jest.Mock)
            .mockReturnValueOnce(JSON.stringify({}))                
            .mockReturnValueOnce(JSON.stringify({ theme: "dark" }));

        mockGetConfig.mockReturnValue({ theme: "dark" });

        await instance.init();

        expect(mockLoad).toHaveBeenCalledWith(
            "/home/test/.config/magikube/user.json"
        );

        expect(instance.getConfig().theme).toBe("dark");
    });

    test("mergeConfigs() should override config values", () => {
        instance.config = { theme: "light", version: 1 };

        instance.mergeConfigs({ theme: "dark" });

        expect(instance.getConfig()).toEqual({ theme: "dark", version: 1 });
    });
});
