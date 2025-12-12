import { expect } from "chai";
import sinon from "sinon";
import { updateProjectConfigArrays, deleteArrayProperty } from "../../src/core/utils/updateDotMagikube-utils.js";
import { AppLogger } from "../../src/logger/appLogger.js";

describe("updateProjectConfigArrays", () => {
    let config: any;

    beforeEach(() => {
        config = {};
    });

    it("adds a new VPC with cidr_block and syncs vpcNames/cidr_blocks", () => {
        updateProjectConfigArrays(config, "vpc", "vpc1", "10.0.0.0/16");

        expect(config.modules.vpc).to.deep.equal([
            { name: "vpc1", cidr_blocks: ["10.0.0.0/16"] },
        ]);
        expect(config.vpcNames).to.deep.equal(["vpc1"]);
        expect(config.cidr_blocks).to.deep.equal(["10.0.0.0/16"]);
    });

    it("adds cidr_block to existing VPC if not present", () => {
        config = {
            modules: { vpc: [{ name: "vpc1", cidr_blocks: ["10.0.0.0/16"] }] },
            vpcNames: ["vpc1"],
            cidr_blocks: ["10.0.0.0/16"],
        };

        updateProjectConfigArrays(config, "vpc", "vpc1", "10.0.1.0/16");

        expect(config.modules.vpc[0].cidr_blocks).to.deep.equal([
            "10.0.0.0/16",
            "10.0.1.0/16",
        ]);
        expect(config.cidr_blocks).to.include("10.0.1.0/16");
    });

    it("does not duplicate moduleName in vpcNames", () => {
        config = {
            modules: { vpc: [] },
            vpcNames: ["vpc1"],
            cidr_blocks: [],
        };

        updateProjectConfigArrays(config, "vpc", "vpc1");

        expect(config.vpcNames).to.deep.equal(["vpc1"]);
    });

    it("ensures config.modules.vpc exists if not array", () => {
        config = {
            modules: { vpc: {} },
        };

        updateProjectConfigArrays(config, "vpc", "vpc2");

        expect(Array.isArray(config.modules.vpc)).to.be.true;
        expect(config.modules.vpc[0].name).to.equal("vpc2");
    });

    it("adds a non-vpc module and removes root-level duplicate array", () => {
        config = {
            modules: {},
            eks: [{ name: "oldEKS" }],
        };

        updateProjectConfigArrays(config, "eks", "eks1");

        expect(config.modules.eks).to.deep.equal([{ name: "eks1" }]);
        expect(config.eks).to.be.undefined;
    });

    it("does not duplicate non-vpc module", () => {
        config = {
            modules: { eks: [{ name: "eks1" }] },
        };

        updateProjectConfigArrays(config, "eks", "eks1");

        expect(config.modules.eks).to.deep.equal([{ name: "eks1" }]);
    });
});

describe("deleteArrayProperty", () => {
    let infoStub: sinon.SinonStub;
    let warnStub: sinon.SinonStub;

    beforeEach(() => {
        infoStub = sinon.stub(AppLogger, "info");
        warnStub = sinon.stub(AppLogger, "warn");
    });

    afterEach(() => {
        sinon.restore();
    });

    it("removes the service when found and logs success", () => {
        const arr = ["svc1", "svc2"];

        deleteArrayProperty(arr, "svc1");

        expect(arr).to.deep.equal(["svc2"]);
        expect(infoStub.calledOnce).to.be.true;
        expect(infoStub.firstCall.args[0]).to.equal(
            "Removed svc1 from service_names array."
        );
    });

    it("logs not found when the service does not exist", () => {
        const arr: any[] = ["svc1"];

        deleteArrayProperty(arr, "svc2");

        expect(arr).to.deep.equal(["svc1"]);
        expect(infoStub.calledOnce).to.be.true;
        expect(infoStub.firstCall.args[0]).to.equal(
            "svc2 not found in service_names array."
        );
    });

    it("warns when invalid array or serviceName missing", () => {
        deleteArrayProperty(null as any, "");

        expect(warnStub.calledOnce).to.be.true;
        expect(
            warnStub.firstCall.args[0]
        ).to.equal(
            "service_names array is missing or invalid, or service_Name is not provided."
        );
    });
});

