import AWSAccount from "../../src/core/aws/aws-account";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

jest.mock("@aws-sdk/client-sts", () => {
    const mockSend = jest.fn();

    return {
        STSClient: jest.fn(() => ({
            send: mockSend
        })),
        GetCallerIdentityCommand: jest.fn(),

        __mockSend: mockSend
    };
});

const { __mockSend } = jest.requireMock("@aws-sdk/client-sts");

describe("AWSAccount.getAccountId", () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return the AWS Account ID when STS returns a valid response", async () => {
        __mockSend.mockResolvedValue({ Account: "123456789012" });

        const result = await AWSAccount.getAccountId(
            "TEST_KEY",
            "TEST_SECRET",
            "ap-south-1"
        );

        expect(result).toBe("123456789012");
        expect(STSClient).toHaveBeenCalledTimes(1);
        expect(GetCallerIdentityCommand).toHaveBeenCalledTimes(1);
    });

    it("should pass correct credentials and region to STSClient", async () => {
        __mockSend.mockResolvedValue({ Account: "123456789012" });

        await AWSAccount.getAccountId("AKIA123", "SECRET123", "us-east-1");

        expect(STSClient).toHaveBeenCalledWith({
            region: "us-east-1",
            credentials: {
                accessKeyId: "AKIA123",
                secretAccessKey: "SECRET123",
            },
        });
    });

    it("should return undefined if STS responds without an Account value", async () => {
        __mockSend.mockResolvedValue({});

        const result = await AWSAccount.getAccountId(
            "KEY",
            "SECRET",
            "us-east-1"
        );

        expect(result).toBeUndefined();
    });

    it("should throw an error if STS fails", async () => {
        __mockSend.mockRejectedValue(new Error("STS error"));

        await expect(
            AWSAccount.getAccountId("KEY", "SECRET", "us-east-1")
        ).rejects.toThrow("STS error");
    });
});
