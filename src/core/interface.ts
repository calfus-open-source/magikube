export interface ConfigObject {
    token?: string;
    userName: string;
    orgName: string;
    sourceCodeRepo: string;
    region: string;
    projectName: string;
    appName?: string;
    appType?: string;
    awsAccessKey?: string;
    awsSecretKey?: string;
    getEnvironment?: string;
}

export interface AppTypeMap {
    [key: string]: {
      appNameKey: string;
      appTypeKey: string;
      createAppFunction: (config: ConfigObject) => Promise<boolean>;
    };
}