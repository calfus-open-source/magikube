import MicroserviceProject from "../../src/core/microserviceTerraform";
import SystemConfig from "../../src/config/system";
import CreateMicroserviceProject from "../../src/core/aws/aws-microservice";
import BaseCommand from "../../src/commands/base";

jest.mock("../../src/config/system", () => ({
    __esModule: true,
    default: {
        getInstance: jest.fn()
    }
}));

jest.mock("../../src/core/aws/aws-microservice", () => {
    return jest.fn().mockImplementation(() => ({
        project: "created"
    }));
});

describe("MicroserviceProject.getProject", () => {

    let mockCommand: any;
    let mockConfig: any;

    beforeEach(() => {
        mockCommand = {
            error: jest.fn()
        };

        mockConfig = {
            cloud_provider: "aws"
        };

        (SystemConfig.getInstance as jest.Mock).mockReturnValue({
            getConfig: () => mockConfig
        });
    });

    test("should return CreateMicroserviceProject when cloud_provider = aws", async () => {
        const project = await MicroserviceProject.getProject(mockCommand);

        expect(CreateMicroserviceProject).toHaveBeenCalledTimes(1);
        expect(project).toEqual(expect.any(Object));
        expect(project.project).toBe("created");
    });

    test("should call command.error for unsupported cloud provider", async () => {
        mockConfig.cloud_provider = "gcp";

        await MicroserviceProject.getProject(mockCommand);

        expect(mockCommand.error).toHaveBeenCalledWith(
            "Cloud provider 'gcp' not supported"
        );
    });
});
