import os from 'os';
import fs from 'fs';
import path from 'path';
import { AppLogger } from '../../logger/appLogger.js';

export default class AWSProfile {
    static getProfiles(): any {
        const credentialsFilePath = `${os.homedir()}/.aws/credentials`;
        AppLogger.debug(`Getting AWS profiles from ${credentialsFilePath}`);

        if (fs.existsSync(credentialsFilePath)) {
          const credentialsFileContent = fs.readFileSync(credentialsFilePath, 'utf8');
          const profileRegex = /\[([^\]]+)\]/g;
          const profiles = [];
          let match;
          while ((match = profileRegex.exec(credentialsFileContent))) {
            const profileName = match[1];
            const profileContent = credentialsFileContent.substring(match.index + match[0].length);
            const awsAccessKey = /aws_access_key_id = (\S+)/.exec(profileContent)?.[1] || '';
            const awsSecretAccessKey = /aws_secret_access_key = (\S+)/.exec(profileContent)?.[1] || '';
            profiles.push({ profileName, awsAccessKey, awsSecretAccessKey });            
          }

          return profiles;
        }

        return [];
    }

    static addProfile(profileName: string, awsAccessKey: string, awsSecretAccessKey: string): void {
        const awsDirectoryPath = path.join(os.homedir(), '.aws');
        const credentialsFilePath = path.join(awsDirectoryPath, 'credentials');
        AppLogger.debug(`Adding AWS profile ${profileName} to ${credentialsFilePath}`);
        
        // Create the .aws directory if it doesn't exist
        if (!fs.existsSync(awsDirectoryPath)) {
          fs.mkdirSync(awsDirectoryPath);
        }
    
        // Create the credentials file if it doesn't exist
        if (!fs.existsSync(credentialsFilePath)) {
          fs.writeFileSync(credentialsFilePath, '');
        }
    
        const credentialsFileContent = fs.readFileSync(credentialsFilePath, 'utf8');
        const newProfile = `\n[${profileName}]\naws_access_key_id = ${awsAccessKey}\naws_secret_access_key = ${awsSecretAccessKey}`;    
        fs.writeFileSync(credentialsFilePath, `${credentialsFileContent}\n${newProfile}`);
    }    
}