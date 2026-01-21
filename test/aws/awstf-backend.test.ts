import AWSTerraformBackend from "../../src/core/aws/aws-tf-backend.js";

jest.mock("../../src/core/base-project.js", () => ({
    __esModule: true,
    default: class BaseProjectMock {
        constructor() { }
    }
}));

jest.mock("../../src/logger/appLogger.js", () => ({
    AppLogger: {
        info: jest.fn(),
        error: jest.fn(),
    }
}));

const mockSend = jest.fn();

jest.mock("@aws-sdk/client-s3", () => {
    return {
        S3Client: jest.fn(() => ({ send: mockSend })),
        CreateBucketCommand: jest.fn(),
        HeadBucketCommand: jest.fn(),
        DeleteBucketCommand: jest.fn(),
        ListObjectsCommand: jest.fn(),
        DeleteObjectCommand: jest.fn(),
    };
});

jest.mock("@aws-sdk/client-dynamodb", () => {
    return {
        DynamoDBClient: jest.fn(() => ({ send: mockSend })),
        CreateTableCommand: jest.fn(),
        DeleteTableCommand: jest.fn(),
    };
});

const { AppLogger } = require("../../src/logger/appLogger.js");

describe("AWSTerraformBackend", () => {

    beforeEach(() => {
        mockSend.mockReset();
        AppLogger.info.mockClear();
        AppLogger.error.mockClear();
    });


    test("create() should call createBucket and createDynamoDBTable", async () => {
        mockSend.mockResolvedValue({});

        const result = await AWSTerraformBackend.create(
            {}, "project123", "ap-south-1", "key", "secret"
        );

        expect(result).toBe(true);

        expect(mockSend).toHaveBeenCalled();
    });

    test("delete() should call deleteBucket and deleteDynamoDBTable", async () => {
        mockSend.mockResolvedValue({});

        const result = await AWSTerraformBackend.delete(
            {}, "project123", "ap-south-1", "key", "secret"
        );

        expect(result).toBe(true);
        expect(mockSend).toHaveBeenCalled();
    });

    test("createBucket() should create bucket when not exists", async () => {
        mockSend
            .mockRejectedValueOnce(new Error("NotFound"))
            .mockResolvedValueOnce({});

        const result = await AWSTerraformBackend.createBucket(
            {}, "mybucket", "ap-south-1", "key", "secret"
        );

        expect(result).toBe(true);
        expect(AppLogger.info).toHaveBeenCalled();
    });

    test("createBucket() should return false when bucket already exists", async () => {
        mockSend.mockResolvedValueOnce({});

        const result = await AWSTerraformBackend.createBucket(
            {}, "mybucket", "ap-south-1", "key", "secret"
        );

        expect(result).toBe(false);
        expect(AppLogger.info).toHaveBeenCalledWith(
            expect.stringContaining("already exists"),
            true
        );
    });

    test("deleteBucket() should delete all objects then bucket", async () => {
        mockSend
            .mockResolvedValueOnce({
                Contents: [{ Key: "a.txt" }, { Key: "b.txt" }]
            })
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({})
            .mockResolvedValueOnce({});

        const result = await AWSTerraformBackend.deleteBucket(
            {}, "mybucket", "ap-south-1", "key", "secret"
        );

        expect(result).toBe(true);
        expect(mockSend).toHaveBeenCalledTimes(4);
        expect(AppLogger.info).toHaveBeenCalled();
    });

    test("createDynamoDBTable() should return false if table already exists", async () => {
        mockSend.mockResolvedValueOnce({}); // table exists

        const result = await AWSTerraformBackend.createDynamoDBTable(
            {}, "mytable", "ap-south-1", "key", "secret"
        );

        expect(result).toBe(false);
        expect(AppLogger.info).toHaveBeenCalledWith(
            expect.stringContaining("already exists"),
            true
        );
    });

    test("createDynamoDBTable() should return true when table creation succeeds", async () => {
        mockSend.mockRejectedValueOnce(new Error("Table not found"));

        const result = await AWSTerraformBackend.createDynamoDBTable(
            {}, "mytable", "ap-south-1", "key", "secret"
        );

        expect(result).toBe(true);
    });

    test("deleteDynamoDBTable() should delete table successfully", async () => {
        mockSend.mockResolvedValueOnce({});

        const result = await AWSTerraformBackend.deleteDynamoDBTable(
            {}, "mytable", "ap-south-1", "key", "secret"
        );

        expect(result).toBe(true);
        expect(AppLogger.info).toHaveBeenCalled();
    });
});
