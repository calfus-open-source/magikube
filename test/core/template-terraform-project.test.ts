import TemplateTerraformProject from "../../src/core/templatesTerraform-projects.js";
import SystemConfig from "../../src/config/system.js";
import AWSTemplateProject from "../../src/core/aws/aws-template-project.js";
import { supportedTemplates } from "../../src/core/constants/constants.js";

const mockGetConfig = jest.fn();

jest.mock("../../src/config/system.js", () => ({
    __esModule: true,
    default: {
        getInstance: () => ({
            getConfig: mockGetConfig
        })
    }
}));

jest.mock("../../src/core/aws/aws-template-project.js", () =>
    jest.fn().mockImplementation((cmd, cfg) => ({ type: "aws-template", cfg }))
);

jest.mock("../../src/core/constants/constants.js", () => ({
    supportedTemplates: ["node", "react", "nextjs"]
}));

describe("TemplateTerraformProject.getProject", () => {
    let mockCommand: any;

    beforeEach(() => {
        mockCommand = { error: jest.fn() };
        jest.clearAllMocks();
        mockGetConfig.mockReset();
    });

    test("should return AWSTemplateProject when cloud provider is aws and template is supported", async () => {
        const config = {
            cloud_provider: "aws",
            template: "node"
        };

        mockGetConfig.mockReturnValue(config);

        const project = await TemplateTerraformProject.getProject(mockCommand);

        expect(AWSTemplateProject).toHaveBeenCalledWith(mockCommand, config);
        expect(project).toEqual({ type: "aws-template", cfg: config });
    });

    test("should call command.error for unsupported template", async () => {
        const config = {
            cloud_provider: "aws",
            template: "unknown-template"
        };

        mockGetConfig.mockReturnValue(config);

        await TemplateTerraformProject.getProject(mockCommand);

        expect(mockCommand.error).toHaveBeenCalledWith(
            "Template 'unknown-template' not supported"
        );
    });

    test("should call command.error when cloud provider is not aws", async () => {
        const config = {
            cloud_provider: "gcp",
            template: "node"
        };

        mockGetConfig.mockReturnValue(config);

        await TemplateTerraformProject.getProject(mockCommand);

        expect(mockCommand.error).toHaveBeenCalledWith(
            "Cloud provider 'gcp' not supported"
        );
    });
});
