//Create AWS IAM policies and user groups
//Read liquid templates for different IAM policies and user groups and create them in the AWS account.

import BaseProject from "../base-project.js";
import {
  IAMClient,
  CreatePolicyCommand,
  DeletePolicyCommand,
  CreateGroupCommand,
  DeleteGroupCommand,
  AttachGroupPolicyCommand,
  DetachGroupPolicyCommand,
} from "@aws-sdk/client-iam";

import * as fs from "fs";
import { join } from "path";
import SystemConfig from "../../config/system.js";
import AWSAccount from "./aws-account.js";
import { AppLogger } from "../../logger/appLogger.js";

export default class AWSPolicies {

    static async create(
        project: BaseProject,
        region: string,
        accessKeyId: string,
        secretAccessKey: string
    ): Promise<boolean> {

        const iamClient: IAMClient = new IAMClient({
            region: region,
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
            },
        });

        const account = await AWSAccount.getAccountId(accessKeyId, secretAccessKey, region);
        AppLogger.debug(`Working with AWS Account Number:, ${account}`);

        const createPolicy = async (policyName: string, policyDocument: string) => {
            try {
                const data = await iamClient.send(new CreatePolicyCommand({
                    PolicyName: policyName,
                    PolicyDocument: policyDocument
                }));
                AppLogger.info(`Policy ${policyName} created, ${JSON.stringify(data)}`);
            } catch (err) {
                AppLogger.error(`Error creating policy ${policyName}, ${err}`, true);
            }
        };

        const createGroup = async (groupName: string) => {
            try {
                const data = await iamClient.send(new CreateGroupCommand({
                    GroupName: groupName
                }));
                AppLogger.info(`Group ${groupName} created, ${JSON.stringify(data)}`);
            } catch (err) {
                AppLogger.error(`Error creating group ${groupName}, ${err}`, true);
            }
        };

        const attachGroupPolicy = async (groupName: string, policyArn: string) => {
            try {
                const data = await iamClient.send(new AttachGroupPolicyCommand({
                    GroupName: groupName,
                    PolicyArn: policyArn
                }));
                AppLogger.info(`Policy ${policyArn} attached to group ${groupName} ${JSON.stringify(data)}`);
            } catch (err) {
                AppLogger.error(`Error attaching policy ${policyArn} to group ${groupName}, ${err}`, true);
            }
        };

        //Get list of filenames in a directory
        const files = fs.readdirSync(join(new URL('.', import.meta.url).pathname, '../../templates/aws/policies'));

        for (const file of files) {
            const policyName = `${SystemConfig.getInstance().getConfig().project_name}-${file.split('.')[0]}`;
            AppLogger.info(`Creating policy: ${policyName}`, true);
            const policyDocument = await project.generateContent(`../templates/aws/policies/${file}`);
            await createPolicy(policyName, policyDocument);
            await createGroup(policyName);
            await attachGroupPolicy(policyName, `arn:aws:iam::${account}:policy/${policyName}`);
        }
        
        return true;
    }

    static async delete(
        project: BaseProject,
        region: string,
        accessKeyId: string,
        secretAccessKey: string
    ): Promise<boolean> {
        //Delete all the policies and user groups created

        const iamClient: IAMClient = new IAMClient({
            region: region,
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
            },
        });
        
        const account = await AWSAccount.getAccountId(accessKeyId, secretAccessKey, region);
        AppLogger.debug(account);

        //Get list of filenames in a directory
        const files = fs.readdirSync(join(new URL('.', import.meta.url).pathname, '../../templates/aws/policies'));

        for (const file of files) {
            const policyName = `${SystemConfig.getInstance().getConfig().project_name}-${file.split('.')[0]}`;
            AppLogger.info(`Deleting policy: ${policyName}`);
            try {
                const data = await iamClient.send(new DetachGroupPolicyCommand({
                    GroupName: policyName,
                    PolicyArn: `arn:aws:iam::${account}:policy/${policyName}`
                }));
                AppLogger.info(`Policy ${policyName} detached, ${JSON.stringify(data)}`);
            } catch (err) {
                AppLogger.error(`Error detaching policy ${policyName}, ${err}`, true);
            }
            try {
                const data = await iamClient.send(new DeleteGroupCommand({
                    GroupName: policyName
                }));
                AppLogger.info(`Group ${policyName} deleted, ${JSON.stringify(data)}`);
            } catch (err) {
                AppLogger.error(`Error deleting group ${policyName}, ${err}`, true);
            }
            try {
                const data = await iamClient.send(new DeletePolicyCommand({
                    PolicyArn: `arn:aws:iam::${account}:policy/${policyName}`
                }));
                AppLogger.info(`Policy ${policyName} created, ${JSON.stringify(data)}`);
            } catch (err) {
                AppLogger.error(`Error creating policy ${policyName}, ${err}`, true);
            }
        }
        
        return true;
    }   
}

