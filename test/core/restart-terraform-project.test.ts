import RestartTerraformProject from "../../src/core/restartterraform-project";
import { dotMagikubeConfig } from "../../src/core/utils/projectConfigReader-utils.js";

import EKSFargateProject from "../../src/core/aws/aws-eks-fargate.js";
import AWSK8SProject from "../../src/core/aws/aws-k8s.js";
import EKSNodeGroupProject from "../../src/core/aws/aws-eks-nodegroup.js";

jest.mock("../../src/core/utils/projectConfigReader-utils.js", () => ({
    dotMagikubeConfig: jest.fn()
}));

jest.mock("../../src/core/aws/aws-eks-fargate.js", () =>
    jest.fn().mockImplementation(() => ({ type: "fargate" }))
);

jest.mock("../../src/core/aws/aws-k8s.js", () =>
    jest.fn().mockImplementation(() => ({ type: "k8s" }))
);

jest.mock("../../src/core/aws/aws-eks-nodegroup.js", () =>
    jest.fn().mockImplementation(() => ({ type: "nodegroup" }))
);

describe("RestartTerraformProject.getProject", () => {
    let mockCommand: any;

    beforeEach(() => {
        mockCommand = { error: jest.fn() };
        jest.clearAllMocks();
    });

    test("should return EKSFargateProject when cluster_type = eks-fargate", async () => {
        (dotMagikubeConfig as jest.Mock).mockReturnValue({
            cloud_provider: "aws",
            cluster_type: "eks-fargate"
        });

        const project = await RestartTerraformProject.getProject(mockCommand, "test");

        expect(EKSFargateProject).toHaveBeenCalledWith(mockCommand, {
            cloud_provider: "aws",
            cluster_type: "eks-fargate"
        });
        expect(project).toEqual({ type: "fargate" });
    });

    test("should return AWSK8SProject when cluster_type = k8s", async () => {
        (dotMagikubeConfig as jest.Mock).mockReturnValue({
            cloud_provider: "aws",
            cluster_type: "k8s"
        });

        const project = await RestartTerraformProject.getProject(mockCommand, "test");

        expect(AWSK8SProject).toHaveBeenCalledWith(mockCommand, {
            cloud_provider: "aws",
            cluster_type: "k8s"
        });
        expect(project).toEqual({ type: "k8s" });
    });

    test("should return EKSNodeGroupProject when cluster_type = eks-nodegroup", async () => {
        (dotMagikubeConfig as jest.Mock).mockReturnValue({
            cloud_provider: "aws",
            cluster_type: "eks-nodegroup"
        });

        const project = await RestartTerraformProject.getProject(mockCommand, "test");

        expect(EKSNodeGroupProject).toHaveBeenCalledWith(mockCommand, {
            cloud_provider: "aws",
            cluster_type: "eks-nodegroup"
        });
        expect(project).toEqual({ type: "nodegroup" });
    });

    test("should call command.error for unsupported cluster type", async () => {
        (dotMagikubeConfig as jest.Mock).mockReturnValue({
            cloud_provider: "aws",
            cluster_type: "unknown"
        });

        await RestartTerraformProject.getProject(mockCommand, "test");

        expect(mockCommand.error).toHaveBeenCalledWith(
            "Cloud provider 'aws' and cluster type 'unknown' not supported"
        );
    });

    test("should call command.error for unsupported cloud provider", async () => {
        (dotMagikubeConfig as jest.Mock).mockReturnValue({
            cloud_provider: "gcp",
            cluster_type: "eks-fargate"
        });

        await RestartTerraformProject.getProject(mockCommand, "test");

        expect(mockCommand.error).toHaveBeenCalledWith(
            "Cloud provider 'gcp' not supported"
        );
    });
});
