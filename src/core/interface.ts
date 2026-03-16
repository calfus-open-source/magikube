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

export interface AzureSubscriptionInfo {
  Name: string;
  SubscriptionId: string;
  TenantId: string;
  State: string;
}

export interface AzureAccountInfo {
  Name: string;
  SubscriptionId: string;
  TenantId: string;
}

export interface AzureProfileEntry {
  profileName: string;
  clientId: string;
  clientSecret: string;
  tenantId: string;
  subscriptionId: string;
  state?: string;
}

export interface ProjectConfig {
  [key: string]:
    | string
    | string[]
    | boolean
    | number
    | undefined
    | ProjectConfig;
}

export interface AppTypeMap {
  [key: string]: {
    appNameKey: string;
    appTypeKey: string;
    createAppFunction: (config: CommonConfig) => Promise<boolean>;
  };
}
