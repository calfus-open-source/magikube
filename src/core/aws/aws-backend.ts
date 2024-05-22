// Create S3 bucket for storing terraform state
// Create a new S3 bucket in the AWS account to store the terraform state. The bucket name should be unique in the AWS region.

import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import BaseProject from "../base-project.js";

export default class AWSBackend {
  static async create(
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
        project.command.log(`Bucket ${bucketName} already exists`);
        console.log(`Bucket ${bucketName} already exists`);
        return false;
      }
      const data = await s3Client.send(
        new CreateBucketCommand({ Bucket: bucketName })
      );
      project.command.log(`Bucket ${bucketName} created`, data);
    } catch (err) {
      project.command.error(`Error creating bucket ${bucketName}, ${err}`);
    }

    return true;
  }
}
