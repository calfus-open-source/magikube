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
];

const k8sPrompts: any[] = [
  {
    message: 'Enter the type of worker instance: ',
    name: 'instance_type',
    type: 'input',
    default: 't3.micro',
  },
  {
    message: 'Enter the number of master nodes: ',
    name: 'master_nodes_count',
    type: 'input',
    default: 1,
  },
  {
    message: 'Enter the type of worker instance: ',
    name: 'instance_type',
    type: 'input',
    default: 't3.micro',
  },
  {
    message: 'Enter the number of worker nodes: ',
    name: 'worker_nodes',
    type: 'input',
    default: 1,
  },
];
export default class PromptGenerator {
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

  getClusterPrompts(clusterType: string): any[] {
    return clusterType === 'k8s' ? k8sPrompts : [];
  }
}
