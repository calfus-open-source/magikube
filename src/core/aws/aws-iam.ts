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
  CreateUserCommand,
  DeleteUserCommand,
  AddUserToGroupCommand,
  RemoveUserFromGroupCommand,
  CreateServiceSpecificCredentialCommand,
  ListServiceSpecificCredentialsCommand,
  DeleteServiceSpecificCredentialCommand
} from "@aws-sdk/client-iam";
import * as fs from "fs";
import SystemConfig from "../../config/system.js";
import AWSAccount from "./aws-account.js";
import { AppLogger } from "../../logger/appLogger.js";
import { readStatusFile, updateStatusFile } from "../utils/statusUpdater-utils.js";
import { join } from "path";


export default class AWSPolicies {

    static async create(
        project: BaseProject,
        region: string,
        accessKeyId: string,
        secretAccessKey: string,
        projectName:string
    ): Promise<boolean> {

        const iamClient: IAMClient = new IAMClient({
            region: region,
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
            },
        });
        const account = await AWSAccount.getAccountId(accessKeyId, secretAccessKey, region);
        AppLogger.debug(`Working with AWS Account Number: ${account}`);

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

        const createUser = async (userName: string) => {
            try {
                const data = await iamClient.send(new CreateUserCommand({
                    UserName: userName
                }));
                AppLogger.info(`User ${userName} created, ${JSON.stringify(data)}`);
            } catch (err) {
                AppLogger.error(`Error creating user ${userName}, ${err}`, true);
            }
        };

        const addUserToGroup = async (userName: string, groupName: string) => {
            try {
                const data = await iamClient.send(new AddUserToGroupCommand({
                    UserName: userName,
                    GroupName: groupName
                }));
                AppLogger.info(`User ${userName} added to group ${groupName}, ${JSON.stringify(data)}`);
            } catch (err) {
                AppLogger.error(`Error adding user ${userName} to group ${groupName}, ${err}`, true);
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

        // const status = await readStatusFile(projectName)
        const readFile = readStatusFile(projectName);
        if (readFile.services["policy"] === "pending" || readFile.services["policy"] === "fail") {
            const files = fs.readdirSync(join(new URL('.', import.meta.url).pathname, '../../templates/aws/policies'));
            try{
                for (const file of files) {
                const policyName = `${projectName}-${file.split('.')[0]}`;
                AppLogger.info(`Creating policy, user, group and adding the user to the group: ${policyName}`, true);
                const policyDocument = await project.generateContent(`../templates/aws/policies/${file}`);
                await createPolicy(policyName, policyDocument);
                await createGroup(policyName);
                await attachGroupPolicy(policyName, `arn:aws:iam::${account}:policy/${policyName}`);
                await createUser(policyName);
                await addUserToGroup(policyName, policyName);
                AppLogger.info(`Policy ${policyName} created successfully`, true);
                updateStatusFile(projectName, "policy", "success");
            }
            }catch(error){
                AppLogger.error(`Error in creating the polic`, true);
                updateStatusFile(projectName, "policy", "fail");
                process.exit(1);
            }
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
        AppLogger.debug(`Working with AWS Account Number: ${account}`);

        //Get list of filenames in a directory
        const files = fs.readdirSync(join(new URL('.', import.meta.url).pathname, '../../templates/aws/policies'));

        for (const file of files) {
            const policyName = `${SystemConfig.getInstance().getConfig().project_name}-${file.split('.')[0]}`;
            AppLogger.info(`Deleting policy, user, group and adding the user to the group: ${policyName}`, true);

            // Detach policy from group
            try {
                const data = await iamClient.send(new DetachGroupPolicyCommand({
                    GroupName: policyName,
                    PolicyArn: `arn:aws:iam::${account}:policy/${policyName}`
                }));
                AppLogger.info(`Policy ${policyName} detached from group, ${JSON.stringify(data)}`);
            } catch (err) {
                AppLogger.error(`Error detaching policy ${policyName} from group, ${err}`, true);
            }

            // Remove user from group
            try {
                const data = await iamClient.send(new RemoveUserFromGroupCommand({
                    UserName: policyName,
                    GroupName: policyName
                }));
                AppLogger.info(`User ${policyName} removed from group, ${JSON.stringify(data)}`);
            } catch (err) {
                AppLogger.error(`Error removing user ${policyName} from group, ${err}`, true);
            }

            // For gitops user, delete HTTPS Git credentials
            if (file.split('.')[0] === "gitops" && SystemConfig.getInstance().getConfig().source_code_repository === "codecommit") {
                try {
                    const listResult = await iamClient.send(new ListServiceSpecificCredentialsCommand({
                        UserName: policyName
                    }));

                    for (const credential of listResult.ServiceSpecificCredentials || []) {
                        await iamClient.send(new DeleteServiceSpecificCredentialCommand({
                            UserName: policyName,
                            ServiceSpecificCredentialId: credential.ServiceSpecificCredentialId
                        }));
                        AppLogger.info(`Deleted Git credentials for user ${policyName}`);
                    }
                } catch (err) {
                    AppLogger.error(`Error deleting Git credentials for user ${policyName}: ${err}`, true);
                }
            }

            // Delete the user
            try {
                const data = await iamClient.send(new DeleteUserCommand({
                    UserName: policyName
                }));
                AppLogger.info(`User ${policyName} deleted, ${JSON.stringify(data)}`);
            } catch (err) {
                AppLogger.error(`Error deleting user ${policyName}, ${err}`, true);
            }

            // Delete the group
            try {
                const data = await iamClient.send(new DeleteGroupCommand({
                    GroupName: policyName
                }));
                AppLogger.info(`Group ${policyName} deleted, ${JSON.stringify(data)}`);
            } catch (err) {
                AppLogger.error(`Error deleting group ${policyName}, ${err}`, true);
            }

            // Delete the policy
            try {
                const data = await iamClient.send(new DeletePolicyCommand({
                    PolicyArn: `arn:aws:iam::${account}:policy/${policyName}`
                }));
                AppLogger.info(`Policy ${policyName} deleted, ${JSON.stringify(data)}`);
            } catch (err) {
                AppLogger.error(`Error deleting policy ${policyName}, ${err}`, true);
            }
        }
        return true;
    }
}