// ----------------------------------------------------
// GLOBAL JEST TIMEOUT FIX
// ----------------------------------------------------
jest.setTimeout(30000);

// ----------------------------------------------------
// MOCKS
// ----------------------------------------------------
jest.mock("child_process", () => ({
    execSync: jest.fn()
}));

jest.mock("../../src/logger/appLogger.js", () => ({
    AppLogger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }
}));

jest.mock("../../src/core/utils/statusUpdater-utils.js", () => ({
    updateStatusFile: jest.fn()
}));

jest.mock("../../src/core/manage-repository.js", () => ({
    ManageRepository: {
        pushCode: jest.fn()
    }
}));

jest.mock("../../src/core/constants/constants.js", () => ({
    modules: ["network", "eks", "fargate"],
    playbooks: ["setup-master.yml", "deploy-app.yml"]
}));

// ----------------------------------------------------
// IMPORTS (after mocks)
// ----------------------------------------------------
import { execSync } from "child_process";
import { updateStatusFile } from "../../src/core/utils/statusUpdater-utils.js";
import { ManageRepository } from "../../src/core/manage-repository.js";
import { AppLogger } from "../../src/logger/appLogger.js";
import { modules, playbooks } from "../../src/core/constants/constants.js";
import { handleEKS, handleK8s } from "../../src/core/utils/terraformHandlers-utils.js";

// Utility
const mockTerraform = {
    runTerraformInit: jest.fn(),
    runTerraformApply: jest.fn(),
    startSSHProcess: jest.fn(),
    stopSSHProcess: jest.fn(),
    runAnsiblePlaybook: jest.fn(),
    getMasterIp: jest.fn(),
    editKubeConfigFile: jest.fn()
};

describe("handleEKS", () => {
    const projectName = "demo";
    const responses = { environment: "dev" };
    const configObject: any = {};

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(process, "cwd").mockReturnValue("/current");

        mockTerraform.runTerraformInit.mockResolvedValue(true);

        // Return for each module
        mockTerraform.runTerraformApply.mockResolvedValue(true);

        execSync.mockReturnValue(Buffer.from("ok"));
    });

    it("should initialize terraform and apply all modules successfully", async () => {
        // Mock each module apply separately (important)
        modules.forEach(() => {
            mockTerraform.runTerraformApply.mockResolvedValueOnce(true);
        });

        await handleEKS(projectName, responses, mockTerraform, true, configObject);

        expect(mockTerraform.runTerraformInit).toHaveBeenCalledWith(
            "/current/demo/infrastructure",
            "dev-config.tfvars",
            "demo"
        );

        // Ensure calls == number of modules
        expect(mockTerraform.runTerraformApply).toHaveBeenCalledTimes(modules.length);

        expect(updateStatusFile).toHaveBeenCalledWith("demo", "terraform-apply", "success");
        expect(ManageRepository.pushCode).toHaveBeenCalled();
    });

    it("should mark module failure when terraform apply throws", async () => {
        mockTerraform.runTerraformApply
            .mockResolvedValueOnce(true)
            .mockRejectedValueOnce(new Error("Apply failed"));

        await handleEKS(projectName, responses, mockTerraform, false, configObject);

        expect(updateStatusFile).toHaveBeenCalledWith("demo", "eks", "fail");
        expect(updateStatusFile).toHaveBeenCalledWith("demo", "terraform-apply", "fail");
    });
});

describe("handleK8s", () => {
    const projectName = "demo";
    const responses = { environment: "dev", aws_profile: "default" };
    const configObject: any = {};

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(process, "cwd").mockReturnValue("/current");

        mockTerraform.runTerraformInit.mockResolvedValue(true);
        mockTerraform.runTerraformApply.mockResolvedValue(true);
        mockTerraform.startSSHProcess.mockResolvedValue(true);
        mockTerraform.stopSSHProcess.mockResolvedValue(true);
        mockTerraform.runAnsiblePlaybook.mockResolvedValue(true);
        mockTerraform.getMasterIp.mockResolvedValue("1.2.3.4");
        mockTerraform.editKubeConfigFile.mockResolvedValue(true);

        execSync.mockReturnValue(Buffer.from("OK"));
    });

    it("should run terraform init/apply and ansible playbooks", async () => {
        await handleK8s(projectName, responses, mockTerraform, true, configObject);

        expect(mockTerraform.runTerraformInit).toHaveBeenCalled();
        expect(mockTerraform.runTerraformApply).toHaveBeenCalled();

        expect(execSync).toHaveBeenCalledWith(
            "export AWS_PROFILE=default",
            expect.any(Object)
        );

        expect(ManageRepository.pushCode).toHaveBeenCalled();
        expect(mockTerraform.startSSHProcess).toHaveBeenCalled();

        expect(mockTerraform.runAnsiblePlaybook).toHaveBeenCalledTimes(playbooks.length);

        expect(mockTerraform.editKubeConfigFile).toHaveBeenCalledWith(
            "/current/demo/templates/aws/ansible/config/1.2.3.4/etc/kubernetes/admin.conf"
        );

        expect(mockTerraform.stopSSHProcess).toHaveBeenCalled();
    });

    it("should log error if AWS export fails", async () => {
        (execSync as jest.Mock).mockImplementation(() => {
            throw new Error("Fail");
        });

        await handleK8s(projectName, responses, mockTerraform, false, configObject);

        expect(AppLogger.error).toHaveBeenCalledWith("AWS export command NOT executed", true);
    });
});
