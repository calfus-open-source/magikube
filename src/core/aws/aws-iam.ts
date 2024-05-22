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
        console.log(account);

        const createPolicy = async (policyName: string, policyDocument: string) => {
            try {
                const data = await iamClient.send(new CreatePolicyCommand({
                    PolicyName: policyName,
                    PolicyDocument: policyDocument
                }));
                project.command.log(`Policy ${policyName} created`, data);
            } catch (err) {
                project.command.error(`Error creating policy ${policyName}, ${err}`);
            }
        };

        const createGroup = async (groupName: string) => {
            try {
                const data = await iamClient.send(new CreateGroupCommand({
                    GroupName: groupName
                }));
                project.command.log(`Group ${groupName} created`, data);
            } catch (err) {
                project.command.error(`Error creating group ${groupName}, ${err}`);
            }
        };

        const attachGroupPolicy = async (groupName: string, policyArn: string) => {
            try {
                const data = await iamClient.send(new AttachGroupPolicyCommand({
                    GroupName: groupName,
                    PolicyArn: policyArn
                }));
                project.command.log(`Policy ${policyArn} attached to group ${groupName}`, data);
            } catch (err) {
                project.command.error(`Error attaching policy ${policyArn} to group ${groupName}, ${err}`);
            }
        };

        //Get list of filenames in a directory
        const files = fs.readdirSync(join(new URL('.', import.meta.url).pathname, '../../templates/aws/policies'));

        for (const file of files) {
            const policyName = `${SystemConfig.getInstance().getConfig().project_name}-${file.split('.')[0]}`;
            project.command.log(`Creating policy: ${policyName}`);
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
        console.log(account);

        //Get list of filenames in a directory
        const files = fs.readdirSync(join(new URL('.', import.meta.url).pathname, '../../templates/aws/policies'));

        for (const file of files) {
            const policyName = `${SystemConfig.getInstance().getConfig().project_name}-${file.split('.')[0]}`;
            project.command.log(`Deleting policy: ${policyName}`);
            try {
                const data = await iamClient.send(new DetachGroupPolicyCommand({
                    GroupName: policyName,
                    PolicyArn: `arn:aws:iam::${account}:policy/${policyName}`
                }));
                project.command.log(`Policy ${policyName} detached`, data);
            } catch (err) {
                project.command.error(`Error detaching policy ${policyName}, ${err}`);
            }
            try {
                const data = await iamClient.send(new DeleteGroupCommand({
                    GroupName: policyName
                }));
                project.command.log(`Group ${policyName} deleted`, data);
            } catch (err) {
                project.command.error(`Error deleting group ${policyName}, ${err}`);
            }
            try {
                const data = await iamClient.send(new DeletePolicyCommand({
                    PolicyArn: `arn:aws:iam::${account}:policy/${policyName}`
                }));
                project.command.log(`Policy ${policyName} created`, data);
            } catch (err) {
                project.command.error(`Error creating policy ${policyName}, ${err}`);
            }
        }
        
        return true;
    }   
}

