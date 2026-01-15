import { updateProjectConfigArrays, deleteArrayProperty } from "../../src/core/utils/updateDotMagikube-utils.js";
import { AppLogger } from "../../src/logger/appLogger.js";

// Mock AppLogger
jest.mock("../../src/logger/appLogger.js", () => ({
    AppLogger: {
        info: jest.fn(),
        warn: jest.fn(),
    },
}));

describe("updateProjectConfigArrays", () => {
    let config: any;

    beforeEach(() => {
        config = {};
        jest.clearAllMocks();
    });

    it("adds a new VPC with cidr_block and syncs vpcNames/cidr_blocks", () => {
        updateProjectConfigArrays(config, "vpc", "vpc1", "10.0.0.0/16");

        expect(config.modules.vpc).toEqual([
            { name: "vpc1", cidr_blocks: ["10.0.0.0/16"] },
        ]);
        expect(config.vpcNames).toEqual(["vpc1"]);
        expect(config.cidr_blocks).toEqual(["10.0.0.0/16"]);
    });

    it("adds cidr_block to existing VPC if not present", () => {
        config = {
            modules: { vpc: [{ name: "vpc1", cidr_blocks: ["10.0.0.0/16"] }] },
            vpcNames: ["vpc1"],
            cidr_blocks: ["10.0.0.0/16"],
        };

        updateProjectConfigArrays(config, "vpc", "vpc1", "10.0.1.0/16");

        expect(config.modules.vpc[0].cidr_blocks).toEqual([
            "10.0.0.0/16",
            "10.0.1.0/16",
        ]);
        expect(config.cidr_blocks).toContain("10.0.1.0/16");
    });

    it("does not duplicate moduleName in vpcNames", () => {
        config = {
            modules: { vpc: [] },
            vpcNames: ["vpc1"],
            cidr_blocks: [],
        };

        updateProjectConfigArrays(config, "vpc", "vpc1");

        expect(config.vpcNames).toEqual(["vpc1"]);
    });

    it("ensures config.modules.vpc exists if not array", () => {
        config = {
            modules: { vpc: {} },
        };

        updateProjectConfigArrays(config, "vpc", "vpc2");

        expect(Array.isArray(config.modules.vpc)).toBe(true);
        expect(config.modules.vpc[0].name).toEqual("vpc2");
    });

    it("adds a non-vpc module and removes root-level duplicate array", () => {
        config = {
            modules: {},
            eks: [{ name: "oldEKS" }],
        };

        updateProjectConfigArrays(config, "eks", "eks1");

        expect(config.modules.eks).toEqual([{ name: "eks1" }]);
        expect(config.eks).toBeUndefined();
    });

    it("does not duplicate non-vpc module", () => {
        config = {
            modules: { eks: [{ name: "eks1" }] },
        };

        updateProjectConfigArrays(config, "eks", "eks1");

        expect(config.modules.eks).toEqual([{ name: "eks1" }]);
    });
});

describe("deleteArrayProperty", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("removes the service when found and logs success", () => {
        const arr = ["svc1", "svc2"];

        deleteArrayProperty(arr, "svc1");

        expect(arr).toEqual(["svc2"]);
        expect(AppLogger.info).toHaveBeenCalledTimes(1);
        expect(AppLogger.info).toHaveBeenCalledWith(
            "Removed svc1 from service_names array.",
            true
        );
    });

    it("logs not found when the service does not exist", () => {
        const arr: any[] = ["svc1"];

        deleteArrayProperty(arr, "svc2");

        expect(arr).toEqual(["svc1"]);
        expect(AppLogger.info).toHaveBeenCalledTimes(1);
        expect(AppLogger.info).toHaveBeenCalledWith(
            "svc2 not found in service_names array.",
            true
        );
    });

    it("warns when invalid array or serviceName missing", () => {
        deleteArrayProperty(null as any, "");

        expect(AppLogger.warn).toHaveBeenCalledTimes(1);
        expect(AppLogger.warn).toHaveBeenCalledWith(
            "service_names array is missing or invalid, or service_Name is not provided.",
            true
        );
    });
});
