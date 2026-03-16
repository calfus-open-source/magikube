import SystemConfig from '../config/system.js';
import AWSProfile from '../core/aws/aws-profile.js';
import { CloudProvider } from './constants.js';
import { AppLogger } from '../logger/appLogger.js';
import AzureProfile from '../core/azure/azure-profile.js';
import { DistinctQuestion, Answers } from 'inquirer';

const awsCreds: DistinctQuestion[] = [
  {
    message: 'Enter AWS Access Key ID: ',
    name: 'aws_access_key_id',
    type: 'input',
    default:
      process.env.AWS_ACCESS_KEY_ID ||
      SystemConfig.getInstance().getConfig().aws_access_key_id,
  },
  {
    message: 'Enter AWS Secret Access Key: ',
    name: 'aws_secret_access_key',
    type: 'password',
    default:
      process.env.AWS_SECRET_ACCESS_KEY ||
      SystemConfig.getInstance().getConfig().aws_secret_access_key,
  },
];

const azureCreds: DistinctQuestion[] = [
  {
    message: 'Enter Azure Client ID: ',
    name: 'azure_client_id',
    type: 'input',
    default:
      process.env.AZURE_CLIENT_ID ||
      SystemConfig.getInstance().getConfig().azure_client_id,
  },
  {
    message: 'Enter Azure Client Secret: ',
    name: 'azure_client_secret',
    type: 'password',
    default:
      process.env.AZURE_CLIENT_SECRET ||
      SystemConfig.getInstance().getConfig().azure_client_secret,
  },
  {
    message: 'Enter Azure Tenant ID: ',
    name: 'azure_tenant_id',
    type: 'input',
    default:
      process.env.AZURE_TENANT_ID ||
      SystemConfig.getInstance().getConfig().azure_tenant_id,
  },
  {
    message: 'Enter Azure Subscription ID: ',
    name: 'azure_subscription_id',
    type: 'input',
    default:
      process.env.AZURE_SUBSCRIPTION_ID ||
      SystemConfig.getInstance().getConfig().azure_subscription_id,
  },
];

export default class CredentialsPrompts {
  getCredentialsPrompts(
    cloudProvider: string,
    responses: Answers,
  ): DistinctQuestion[] {
    if (cloudProvider === CloudProvider.AWS) {
      const profiles = AWSProfile.getProfiles();
      if (
        profiles.some(
          (profile: { profileName: string }) =>
            profile.profileName === responses['aws_profile'],
        )
      ) {
        // AWS profile exists and set the keys from the file
        AppLogger.debug(`AWS Profile "${responses['aws_profile']}" exists`);
        const matchedProfile = profiles.find(
          (profile: { profileName: string }) =>
            profile.profileName === responses['aws_profile'],
        );
        responses['aws_access_key_id'] = matchedProfile!.awsAccessKey;
        responses['aws_secret_access_key'] = matchedProfile!.awsSecretAccessKey;
      } else {
        return awsCreds;
      }
    } else if (cloudProvider === CloudProvider.AZURE) {
      const profiles = AzureProfile.getProfiles();
      if (
        profiles.some(
          (profile: { profileName: string }) =>
            profile.profileName === responses['azure_profile'],
        )
      ) {
        // Azure profile exists and set the credentials from the file
        AppLogger.debug(`Azure Profile "${responses['azure_profile']}" exists`);
        const profile = profiles.find(
          (profile: { profileName: string }) =>
            profile.profileName === responses['azure_profile'],
        );
        if (!profile) return [];
        responses['azure_client_id'] = profile.clientId;
        responses['azure_client_secret'] = profile.clientSecret;
        responses['azure_tenant_id'] = profile.tenantId;
        responses['azure_subscription_id'] = profile.subscriptionId;
      } else {
        return azureCreds;
      }
    }

    return [];
  }

  saveCredentials(responses: Answers) {
    if (responses['cloud_provider'] == CloudProvider.AWS) {
      AWSProfile.addProfile(
        responses['aws_profile'],
        responses['aws_access_key_id'],
        responses['aws_secret_access_key'],
      );
    } else if (responses['cloud_provider'] == CloudProvider.AZURE) {
      AzureProfile.addProfile(
        responses['azure_profile'],
        responses['azure_client_id'],
        responses['azure_client_secret'],
        responses['azure_tenant_id'],
        responses['azure_subscription_id'],
      );
    }
  }
}
