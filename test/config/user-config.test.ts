import fs from "fs";

// Mock fs module
jest.mock("fs");

import UserConfig from "../../src/config/user.js";

describe("UserConfig", () => {
    let instance: UserConfig;

    beforeEach(() => {
        jest.clearAllMocks();
        instance = new UserConfig();
    });

    test("load() should read JSON and update config", () => {
        const mockJson = JSON.stringify({ theme: "dark", region: "us-east-1" });
        (fs.readFileSync as jest.Mock).mockReturnValue(mockJson);

        instance.load("/path/to/user.json");

        expect(fs.readFileSync).toHaveBeenCalledWith(
            "/path/to/user.json",
            "utf8"
        );
        expect(instance.getConfig()).toEqual({
            theme: "dark",
            region: "us-east-1",
        });
    });

    test("getConfig() should return the current config", () => {
        (instance as any).config = { key: "value" };

        expect(instance.getConfig()).toEqual({ key: "value" });
    });

    test("exists() should return true when file exists", () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);

        expect(instance.exists("/some/path.json")).toBe(true);
        expect(fs.existsSync).toHaveBeenCalledWith("/some/path.json");
    });

    test("exists() should return false when file does not exist", () => {
        (fs.existsSync as jest.Mock).mockReturnValue(false);

        expect(instance.exists("/missing.json")).toBe(false);
        expect(fs.existsSync).toHaveBeenCalledWith("/missing.json");
    });
});
