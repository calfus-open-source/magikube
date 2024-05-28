import SystemConfig from "../config/system.js";

enum Environment {
  PRODUCTION = "production",
  NON_PRODUCTION = "non-production",
}

enum CloudProvider {
  AWS = "aws",
  GCP = "gcp",
  AZURE = "azure",
  ON_PREMISES = "on-premises",
}

enum VersionControl {
  GITHUB = "github",
  CODECOMMIT = "codecommit",
  BITBUCKET = "bitbucket",
}

const productionPrompts: any[] = [
  {
    choices: ["production", "sandbox"],
    message: "Select Lifecycle(s):",
    name: "lifecycle",
    type: "checkbox",
  },
];

const nonProductionPrompts: any[] = [
  {
    choices: ["dev", "test", "uat"],
    message: "Select Lifecycle(s):",
    name: "lifecycle",
    type: "checkbox",
  },
];

const awsPrompts: any[] = [
  {
    message: "Select a Region: ",
    name: "aws_region",
    default: process.env.AWS_REGION || SystemConfig.getInstance().getConfig().aws_region,
    type: "input",
  },
  {
    choices: ["eks-fargate", "eks-nodegroup", "k8s"],
    message: "Select a Cluster Type:",
    name: "cluster_type",
    type: "list",
  },
  {
    message: "Enter AWS Access Key ID: ",
    name: "aws_access_key_id",
    type: "input",
    default: process.env.AWS_ACCESS_KEY_ID || SystemConfig.getInstance().getConfig().aws_access_key_id,
  },
  {
    message: "Enter AWS Secret Access Key: ",
    name: "aws_secret_access_key",
    type: "password",
    default: process.env.AWS_SECRET_ACCESS_KEY || SystemConfig.getInstance().getConfig().aws_secret_access_key,
  },
  {
    message: "Source code repository: ",
    name: "source_code_repository",
    type: "list",
    choices: [ VersionControl.CODECOMMIT, VersionControl.GITHUB, VersionControl.BITBUCKET ],
    default: VersionControl.CODECOMMIT || SystemConfig.getInstance().getConfig().source_code_repository,
  },
];

const githubPrompts: any[] = [
  {
    message: "Enter GitHub Organization Name: ",
    name: "github_owner",
    type: "input",
    default: process.env.GITHUB_OWNER || SystemConfig.getInstance().getConfig().github_owner,
  },
  {
    message: "Enter GitHub Access Token: ",
    name: "github_access_token",
    type: "password",
    default: process.env.GITHUB_ACCESS_TOKEN || SystemConfig.getInstance().getConfig().github_access_token,
  },
];

export default class PropmtGenerator {
  getCloudProvider(): any[] {
    return [
      {
        choices: [
          CloudProvider.AWS,
          CloudProvider.GCP,
          CloudProvider.AZURE,
          CloudProvider.ON_PREMISES,
        ],
        message: "Select a Cloud Provider:",
        name: "cloud_provider",
        type: "list",
      },
    ];
  }

  getEnvironment(): any[] {
    return [
      {
        choices: [Environment.NON_PRODUCTION, Environment.PRODUCTION],
        message: "Select an Environment:",
        name: "environment",
        type: "list",
      },
    ];
  }

  getLifecycles(environment: Environment): any[] {
    return environment === Environment.PRODUCTION
      ? productionPrompts
      : nonProductionPrompts;
  }

  getCloudProviderPrompts(cloudProvider: CloudProvider): any[] {
    return cloudProvider === CloudProvider.AWS ? awsPrompts : [];
  }

  getVersionControlPrompts(versionControl: string): any[] {
    return versionControl === VersionControl.GITHUB ? githubPrompts : [];
  }
}
