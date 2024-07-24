
import SystemConfig from "../config/system.js";
import AWSProfile from "../core/aws/aws-profile.js";
import { CloudProvider } from './constants.js';
import { AppLogger } from '../logger/appLogger.js';

const awsCreds: any[] = [
    {
      message: "Enter AWS Access Key ID: ",
      name: "aws_access_key_id",
      type: "input",
      default:
        process.env.AWS_ACCESS_KEY_ID ||
        SystemConfig.getInstance().getConfig().aws_access_key_id,  
    },
    {
      message: "Enter AWS Secret Access Key: ",
      name: "aws_secret_access_key",
      type: "password",
      default:
        process.env.AWS_SECRET_ACCESS_KEY ||
        SystemConfig.getInstance().getConfig().aws_secret_access_key,
    },
  ];

export default class CredentialsPrompts {
    getCredentialsPrompts(cloudProvider: string, responses: any): any[] {
        if (cloudProvider === CloudProvider.AWS) {
            const profiles = AWSProfile.getProfiles();
            if ( profiles.some( (profile: { profileName: any; }) => profile.profileName === responses['aws_profile'] )) {
                // AWS profile exists and set the keys from the file
                AppLogger.debug(`AWS Profile "${responses['aws_profile']}" exists`);
                responses['aws_access_key_id'] = profiles.find((profile: { profileName: any; }) => profile.profileName === responses['aws_profile']).awsAccessKey;
                responses['aws_secret_access_key'] = profiles.find((profile: { profileName: any; }) => profile.profileName === responses['aws_profile']).awsSecretAccessKey;
            } else {
                return awsCreds;
            }
        } 

        return [];
    }

    saveCredentials(responses: any) {
        if (responses['cloud_provider'] == CloudProvider.AWS) {
            AWSProfile.addProfile(responses['aws_profile'], responses['aws_access_key_id'], responses['aws_secret_access_key']);
        }
    }
}
