import AWSPolicies from "../../src/core/aws/aws-iam.js";
import {
    IAMClient,
    CreatePolicyCommand,
    CreateGroupCommand,
    CreateUserCommand,
    AddUserToGroupCommand,
    AttachGroupPolicyCommand,
    DetachGroupPolicyCommand,
    RemoveUserFromGroupCommand,
    DeleteUserCommand,
    DeleteGroupCommand,
    DeletePolicyCommand
} from "@aws-sdk/client-iam";
import * as fs from "fs";
import AWSAccount from "../../src/core/aws/aws-account.js";
import SystemConfig from "../../src/config/system.js";
import { readStatusFile, updateStatusFile } from "../../src/core/utils/statusUpdater-utils.js";
import { AppLogger } from "../../src/logger/appLogger.js";


jest.mock("@aws-sdk/client-iam");
jest.mock("../../src/core/aws/aws-account.js");
jest.mock("fs");
jest.mock("../../src/logger/appLogger.js");
jest.mock("../../src/core/utils/statusUpdater-utils.js");
jest.mock("../../src/config/system.js");

describe("AWSPolicies", () => {
    let sendMock: jest.Mock;
    let mockProject: any;

    beforeEach(() => {
        sendMock = jest.fn();
        (IAMClient as any).mockImplementation(() => ({
            send: sendMock
        }));

        (AWSAccount.getAccountId as jest.Mock).mockResolvedValue("123456789012");

        (fs.readdirSync as jest.Mock).mockReturnValue(["policy1.json", "policy2.json"]);

        mockProject = {
            generateContent: jest.fn().mockResolvedValue("{\"Version\":\"2012-10-17\"}")
        };

        (readStatusFile as jest.Mock).mockReturnValue({
            services: { policy: "pending" }
        });

        (SystemConfig.getInstance as jest.Mock).mockReturnValue({
            getConfig: () => ({
                project_name: "demo",
                command: "project",
                source_code_repository: "github"
            })
        });

        (updateStatusFile as jest.Mock).mockClear();

        (AppLogger.info as jest.Mock).mockReturnValue(undefined);
        (AppLogger.debug as jest.Mock).mockReturnValue(undefined);
        (AppLogger.error as jest.Mock).mockReturnValue(undefined);
    });


    it("should create policies, groups, users, and attach policies", async () => {
        sendMock.mockResolvedValue({}); 

        const result = await AWSPolicies.create(
            mockProject,
            "us-east-1",
            "AKIA123",
            "SECRET",
            "demo"
        );

        expect(result).toBe(true);

        expect(sendMock).toHaveBeenCalledWith(expect.any(CreatePolicyCommand));
        expect(sendMock).toHaveBeenCalledWith(expect.any(CreateGroupCommand));
        expect(sendMock).toHaveBeenCalledWith(expect.any(AttachGroupPolicyCommand));
        expect(sendMock).toHaveBeenCalledWith(expect.any(CreateUserCommand));
        expect(sendMock).toHaveBeenCalledWith(expect.any(AddUserToGroupCommand));

        expect(updateStatusFile).toHaveBeenCalledTimes(2);
    });


    it("should delete users, groups, and policies", async () => {
        sendMock.mockResolvedValue({});

        const result = await AWSPolicies.delete(
            mockProject,
            "us-east-1",
            "AKIA123",
            "SECRET"
        );

        expect(result).toBe(true);

        expect(sendMock).toHaveBeenCalledWith(expect.any(DetachGroupPolicyCommand));
        expect(sendMock).toHaveBeenCalledWith(expect.any(RemoveUserFromGroupCommand));
        expect(sendMock).toHaveBeenCalledWith(expect.any(DeleteUserCommand));
        expect(sendMock).toHaveBeenCalledWith(expect.any(DeleteGroupCommand));
        expect(sendMock).toHaveBeenCalledWith(expect.any(DeletePolicyCommand));
    });
});
