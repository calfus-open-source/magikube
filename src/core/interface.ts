export interface CommonConfig {
  token: string;
  userName: string;
  orgName: string;
  sourceCodeRepo: string;
  projectName: string;
  environment: string;
  appName?: string;
  appType?: string;
}

export interface AWSConfig {
  region: string;
  awsAccessKey: string;
  awsSecretKey: string;
  accountId?: string;
}

export interface AzureConfig {
  location: string;
  clientId: string;
  clientSecret: string;
  tenantId: string;
  subscriptionId: string;
}

export interface FullConfigObject {
  common: CommonConfig;
  aws?: AWSConfig;
  azure?: AzureConfig;
}

export interface AppTypeMap {
  [key: string]: {
    appNameKey: string;
    appTypeKey: string;
    createAppFunction: (config: CommonConfig) => Promise<boolean>;
  };
}
