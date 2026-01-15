import { deleteMicroservice } from "../../src/core/utils/deleteMicroService-utils.js";
import { AppLogger } from "../../src/logger/appLogger.js";
import { executeCommandWithRetry } from "../../src/core/utils/executeCommandWithRetry-utils.js";
import { deleteArrayProperty } from "../../src/core/utils/updateDotMagikube-utils.js";

jest.mock("../../src/logger/appLogger.js", () => ({
    AppLogger: {
        info: jest.fn(),
        error: jest.fn(),
    },
}));

jest.mock(
    "../../src/core/utils/executeCommandWithRetry-utils.js",
    () => ({
        executeCommandWithRetry: jest.fn(),
    })
);

jest.mock("../../src/core/utils/updateDotMagikube-utils.js", () => ({
    deleteArrayProperty: jest.fn(),
}));

describe("deleteMicroservice", () => {
    const mockResp = {
        project_name: "testproj",
        github_access_token: "mocktoken",
        github_owner: "mockowner",
        service_names: ["service1", "service2"]
    };

    const createdResp = {
        service_Name: "backend"
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should delete microservice successfully (happy path)", async () => {
        (executeCommandWithRetry as jest.Mock).mockResolvedValue(undefined);

        const result = await deleteMicroservice(mockResp, createdResp);

        const repoName = "testproj-backend-app";
        const teamName = "backend-team";

        // Ensure logs were called
        expect(AppLogger.info).toHaveBeenCalled();

        // Validate team delete command call
        const deleteTeamCall = (executeCommandWithRetry as jest.Mock).mock.calls[0][0];
        expect(deleteTeamCall).toContain(`teams/${teamName}/repos/mockowner/${repoName}`);

        // Validate repo delete command call
        const deleteRepoCall = (executeCommandWithRetry as jest.Mock).mock.calls[1][0];
        expect(deleteRepoCall).toContain(`repos/mockowner/${repoName}`);

        // Ensure 2 retries executed
        expect(executeCommandWithRetry).toHaveBeenCalledTimes(2);

        // Ensure deleteArrayProperty is called correctly
        expect(deleteArrayProperty).toHaveBeenCalledWith(
            mockResp.service_names,
            createdResp.service_Name
        );

        // Function should return resp
        expect(result).toBe(mockResp);
    });

    it("should log error when delete fails", async () => {
        const mockError = new Error("Delete failed");
        (executeCommandWithRetry as jest.Mock).mockRejectedValue(mockError);

        // suppress console error logs from Jest
        jest.spyOn(AppLogger, "error").mockImplementation(() => { });

        const result = await deleteMicroservice(mockResp, createdResp);

        expect(AppLogger.error).toHaveBeenCalledWith(
            expect.stringContaining("backend"),
            true
        );

        // should return undefined on error case
        expect(result).toBeUndefined();
    });
});
