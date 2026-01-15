import TerraformProject from "../../src/core/terraform-project.js";
import SystemConfig from "../../src/config/system.js";

import EKSFargateProject from "../../src/core/aws/aws-eks-fargate.js";
import AWSK8SProject from "../../src/core/aws/aws-k8s.js";
import EKSNodeGrpClusterProject from "../../src/core/aws/aws-eks-nodegroup.js";

// Use jest.mocked to get better type inference for mocks
const mockGetConfig = jest.fn();

// Mock SystemConfig globally
jest.mock("../../src/config/system.js", () => ({
    __esModule: true,
    default: {
        getInstance: () => ({
            getConfig: mockGetConfig
        })
    }
}));

// Mock AWS project classes
jest.mock("../../src/core/aws/aws-eks-fargate.js", () =>
    jest.fn().mockImplementation((cmd, cfg) => ({ type: "fargate", cfg }))
);

jest.mock("../../src/core/aws/aws-k8s.js", () =>
    jest.fn().mockImplementation((cmd, cfg) => ({ type: "k8s", cfg }))
);

jest.mock("../../src/core/aws/aws-eks-nodegroup.js", () =>
    jest.fn().mockImplementation((cmd, cfg) => ({ type: "nodegroup", cfg }))
);

describe("TerraformProject.getProject", () => {
    let mockCommand: any;

    beforeEach(() => {
        mockCommand = { error: jest.fn() };
        jest.clearAllMocks(); // Clear call history of all mocks

        // Crucial fix: Set a default implementation for getConfig()
        // that includes 'service_name', preventing the TypeError in other tests
        // which rely on this global mock but may not explicitly set a return value.
        mockGetConfig.mockImplementation(() => ({
            cloud_provider: "aws",
            cluster_type: "eks-nodegroup",
            region: "ap-south-1",
            service_name: "default-service" // Safe default to prevent TypeError in other files
        }));
    });

    test("should return EKSFargateProject for cluster_type = 'eks-fargate'", async () => {
        const config = {
            cloud_provider: "aws",
            cluster_type: "eks-fargate",
            region: "ap-south-1"
        };

        // Override the default implementation for this specific test
        mockGetConfig.mockReturnValue(config);

        const project = await TerraformProject.getProject(mockCommand);

        expect(EKSFargateProject).toHaveBeenCalledWith(mockCommand, config);
        expect(project).toEqual({ type: "fargate", cfg: config });
    });

    test("should return AWSK8SProject for cluster_type = 'k8s'", async () => {
        const config = {
            cloud_provider: "aws",
            cluster_type: "k8s",
            region: "ap-south-1"
        };

        mockGetConfig.mockReturnValue(config);

        const project = await TerraformProject.getProject(mockCommand);

        expect(AWSK8SProject).toHaveBeenCalledWith(mockCommand, config);
        expect(project).toEqual({ type: "k8s", cfg: config });
    });

    test("should return EKSNodeGrpClusterProject for cluster_type = 'eks-nodegroup'", async () => {
        const config = {
            cloud_provider: "aws",
            cluster_type: "eks-nodegroup",
            region: "ap-south-1"
        };

        mockGetConfig.mockReturnValue(config);

        const project = await TerraformProject.getProject(mockCommand);

        expect(EKSNodeGrpClusterProject).toHaveBeenCalledWith(mockCommand, config);
        expect(project).toEqual({ type: "nodegroup", cfg: config });
    });

    test("should call command.error for unsupported cluster type", async () => {
        const config = {
            cloud_provider: "aws",
            cluster_type: "unknown-type"
        };

        mockGetConfig.mockReturnValue(config);

        await TerraformProject.getProject(mockCommand);

        expect(mockCommand.error).toHaveBeenCalledWith(
            "Cloud provider 'aws' and cluster type 'unknown-type' not supported"
        );
    });

    test("should call command.error when cloud_provider is not aws", async () => {
        const config = {
            cloud_provider: "gcp",
            cluster_type: "eks-fargate"
        };

        mockGetConfig.mockReturnValue(config);

        await TerraformProject.getProject(mockCommand);

        expect(mockCommand.error).toHaveBeenCalledWith(
            "Cloud provider 'gcp' not supported"
        );
    });
});