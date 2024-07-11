// Create S3 bucket for storing terraform state
// Create a new S3 bucket in the AWS account to store the terraform state. The bucket name should be unique in the AWS region.

import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  DeleteBucketCommand,
  ListObjectsCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand
} from "@aws-sdk/client-dynamodb";

import BaseProject from "../base-project.js";
import { AppLogger } from "../../logger/appLogger.js";

export default class AWSTerraformBackend {

  static async create(
    project: BaseProject,
    projectName: string,
    region: string,
    accessKeyId: string,
    secretAccessKey: string
  ): Promise<boolean> {

    const bucketName = `${projectName}-tfstate`;
    await AWSTerraformBackend.createBucket(
      project,
      bucketName,
      region,
      accessKeyId,
      secretAccessKey
    );

    const tableName = `${projectName}-tfstate-lock`;
    await AWSTerraformBackend.createDynamoDBTable(
      project,
      tableName,
      region,
      accessKeyId,
      secretAccessKey
    );

    return true;
  }
  
  static async delete(
    project: BaseProject,
    projectName: string,
    region: string,
    accessKeyId: string,
    secretAccessKey: string
  ): Promise<boolean> {
      
      const bucketName = `${projectName}-tfstate`;
      await AWSTerraformBackend.deleteBucket(
        project,
        bucketName,
        region,
        accessKeyId,
        secretAccessKey
      );
  
      const tableName = `${projectName}-tfstate-lock`;
      await AWSTerraformBackend.deleteDynamoDBTable(
        project,
        tableName,
        region,
        accessKeyId,
        secretAccessKey
      );

      return true;
  }
  
  static async createDynamoDBTable(
    project: BaseProject,
    tableName: string,
    region: string,
    accessKeyId: string,
    secretAccessKey: string
  ): Promise<boolean> {
    const dynamoDBClient = new DynamoDBClient({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    const tableExists = async (tableName: string) => {
      try {
        await dynamoDBClient.send(
          new CreateTableCommand({
            TableName: tableName,
            KeySchema: [
              { AttributeName: "LockID", KeyType: "HASH" },
            ],
            AttributeDefinitions: [
              { AttributeName: "LockID", AttributeType: "S" },
            ],
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5,
            },
          })
        );
        return true;
      } catch (err) {
        return false;
      }
    };

    try {
      if (await tableExists(tableName)) {
        AppLogger.info(`Table ${tableName} already exists`, true);
        return false;
      }
    } catch (err) {
      AppLogger.error(`Error creating table ${tableName}, ${err}`, true);
    }

    return true;
  }

  static async createBucket(
    project: BaseProject,
    bucketName: string,
    region: string,
    accessKeyId: string,
    secretAccessKey: string
  ): Promise<boolean> {
    const s3Client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    const bucketExists = async (bucketName: string) => {
      try {
        await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
        return true;
      } catch (err) {
        return false;
      }
    };

    try {
      if (await bucketExists(bucketName)) {
        AppLogger.info(`Bucket ${bucketName} already exists`, true);
        return false;
      }
      const data = await s3Client.send(
        new CreateBucketCommand({ Bucket: bucketName })
      );
      AppLogger.info(`Bucket ${bucketName} created, ${data}`, true);
    } catch (err) {
      AppLogger.error(`Error creating bucket ${bucketName}, ${err}`, true);
    }

    return true;
  }

  static async deleteDynamoDBTable(
    project: BaseProject,
    tableName: string,
    region: string,
    accessKeyId: string,
    secretAccessKey: string
  ): Promise<boolean> {
    const dynamoDBClient = new DynamoDBClient({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    try {
      await dynamoDBClient.send(
        new DeleteTableCommand({ TableName: tableName })
      );
      AppLogger.info(`Table ${tableName} deleted`, true);
    } catch (err) {
      AppLogger.error(`Error deleting table ${tableName}, ${err}`, true);
    }

    return true;
  }

  static async deleteBucket(
    project: BaseProject,
    bucketName: string,
    region: string,
    accessKeyId: string,
    secretAccessKey: string
  ): Promise<boolean> {

    const s3Client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });

    try {
      //delete all obejcts in the bucket
      const listObjects = await s3Client.send(
        new ListObjectsCommand({ Bucket: bucketName })
      );
      if (listObjects.Contents) {
        for (const obj of listObjects.Contents) {
          await s3Client.send(
            new DeleteObjectCommand({ Bucket: bucketName, Key: obj.Key })
          );
        }
      }

      const data = await s3Client.send(
        new DeleteBucketCommand({ Bucket: bucketName })
      );
      AppLogger.info(`Bucket ${bucketName} deleted ${data}`, true);
    } catch (err) {
      AppLogger.error(`Error deleting bucket ${bucketName}, ${err}`, true);
    }

    return true;
  }
}
