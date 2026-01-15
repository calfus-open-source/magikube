import EKSFargateProject from "../../src/core/aws/aws-eks-fargate.js";
import AWSProject from "../../src/core/aws/aws-project.js";

jest.mock("fs-extra");
jest.mock("../../src/core/aws/aws-project.js");
AWSProject.prototype.createProject = jest.fn();
AWSProject.prototype.createFile = jest.fn();
AWSProject.prototype.createProviderFile = jest.fn();
AWSProject.prototype.createCommon = jest.fn();


jest.mock("../../src/core/gitops/common-gitops.js", () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
            createGitOps: jest.fn(),
        })),
    };
});

jest.mock("../../src/core/code-repository/common-repository.js", () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
            createrepository: jest.fn(),
        })),
    };
});

jest.mock("../../src/core/argocd/setup-argocd.js", () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
            argoCdProject: jest.fn(),
        })),
    };
});

// Helper
const mockCwd = "/mocked/path";
jest.spyOn(process, "cwd").mockReturnValue(mockCwd);

describe("EKSFargateProject", () => {
    let project: any;

    beforeEach(() => {
        jest.clearAllMocks();
        project = new EKSFargateProject({ environment: "dev" });
        project.config = { environment: "dev" };
    });

    test("createProject should call super.createProject and createMainFile", async () => {
        const mainSpy = jest.spyOn(project, "createMainFile").mockResolvedValue();

        await project.createProject("testName", "/test/path");

        expect(AWSProject.prototype.createProject).toHaveBeenCalledWith("testName", "/test/path");
        expect(mainSpy).toHaveBeenCalled();
    });



    test("createEKS should generate module files", async () => {
        await project.createEKS();

        expect(project.createFile).toHaveBeenCalledWith(
            "main.tf",
            `${mockCwd}/dist/templates/aws/modules/eks-fargate/main.tf.liquid`,
            "/infrastructure/modules/eks-fargate",
            true
        );

        expect(project.createFile).toHaveBeenCalledWith(
            "variables.tf",
            `${mockCwd}/dist/templates/aws/modules/eks-fargate/variables.tf.liquid`,
            "/infrastructure/modules/eks-fargate",
            true
        );
    });
});
