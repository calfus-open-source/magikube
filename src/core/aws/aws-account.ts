import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

export default class AWSAccount {
    static async getAccountId(accessKeyId: string, secretAccessKey: string, region: string): Promise<string| undefined> {
        const stsClient = new STSClient({
            region: region,
            credentials: {
                accessKeyId: accessKeyId,
                secretAccessKey: secretAccessKey,
            },
        });

        const command = new GetCallerIdentityCommand({});
        const response = await stsClient.send(command);

        return response.Account;
    }
}