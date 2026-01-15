import SubModuleTemplateProject from "../../src/core/submoduleTerraform.js";
import SystemConfig from "../../src/config/system.js";
import CommonSubModuleProject from "../../src/core/aws/aws-submodules.js";

const mockGetConfig = jest.fn();

jest.mock("../../src/config/system.js", () => ({
    __esModule: true,
    default: {
        getInstance: () => ({
            getConfig: mockGetConfig
        })
    }
}));

jest.mock("../../src/core/aws/aws-submodules.js", () =>
    jest.fn().mockImplementation(() => ({ type: "submodules" }))
);

describe("SubModuleTemplateProject.getProject", () => {
    let mockCommand: any;

    beforeEach(() => {
        mockCommand = { error: jest.fn() };
        mockGetConfig.mockReset();
        jest.clearAllMocks();
    });

    test("should return CommonSubModuleProject when cloud_provider = aws", async () => {
        mockGetConfig.mockReturnValue({
            cloud_provider: "aws",
            region: "ap-south-1",
            project: "demo"
        });

        const project = await SubModuleTemplateProject.getProject(
            mockCommand,
            "demo"
        );

        expect(CommonSubModuleProject).toHaveBeenCalledWith(mockCommand, {
            cloud_provider: "aws",
            region: "ap-south-1",
            project: "demo"
        });

        expect(project).toEqual({ type: "submodules" });
    });

    test("should call command.error when cloud provider is not supported", async () => {
        mockGetConfig.mockReturnValue({
            cloud_provider: "gcp"
        });

        await SubModuleTemplateProject.getProject(mockCommand, "demo");

        expect(mockCommand.error).toHaveBeenCalledWith(
            "Cloud provider 'gcp' not supported"
        );
    });
});
