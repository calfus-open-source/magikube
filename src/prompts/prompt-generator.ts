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
    default:
      process.env.AWS_REGION ||
      SystemConfig.getInstance().getConfig().aws_region,
    type: "input",
  },
  {
    choices: ["eks-fargate", "eks-nodegroup", "k8s"],
    message: "Select a Cluster Type:",
    name: "cluster_type",
    type: "list",
  },
  {
    message: "Enter AWS profile to use: ",
    name: "aws_profile",
    type: "input",
    default: "sample",
  },
  {
    message: "Source code repository: ",
    name: "source_code_repository",
    type: "list",
    choices: [
      VersionControl.CODECOMMIT,
      VersionControl.GITHUB,
      VersionControl.BITBUCKET,
    ],
    default:
      VersionControl.CODECOMMIT ||
      SystemConfig.getInstance().getConfig().source_code_repository,
  },
];

const awsCreds: any[] = [
  {
    message: "Enter AWS Access Key ID: ",
    name: "aws_access_key_id",
    type: "input",
    default:
      process.env.AWS_ACCESS_KEY_ID ||
      SystemConfig.getInstance().getConfig().aws_secret_access_key,

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

const k8sPrompts: any[] = [
  {
    message: "Enter the type of worker instance: ",
    name: "instance_type",
    type: "input",
    default: "t3.micro",
  },
  {
    message: "Enter the number of master nodes: ",
    name: "master_nodes_count",
    type: "input",
    default: 1,
  },
  {
    message: "Enter the type of worker instance: ",
    name: "instance_type",
    type: "input",
    default: "t3.micro",
  },
  {
    message: "Enter the number of worker nodes: ",
    name: "worker_nodes",
    type: "input",
    default: 1,
  },
];

const githubPrompts: any[] = [
  {
    message: "Enter GitHub Organization Name: ",
    name: "github_owner",
    type: "input",
    default:
      process.env.GITHUB_OWNER ||
      SystemConfig.getInstance().getConfig().github_owner,
  },
  {
    message: "Enter GitHub Access Token: ",
    name: "github_access_token",
    type: "password",
    default:
      process.env.GITHUB_ACCESS_TOKEN ||
      SystemConfig.getInstance().getConfig().github_access_token,
  },
];

enum ApplicationType {
  REACT = "react",
  NEXT = "next",
  NEST = "nest",
  NODE_EXPRESS = "node-express",
  NODE = "node",
}

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

  getAWSCredentials(): any[] {
    return awsCreds;
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
    return clusterType === "k8s" ? k8sPrompts : [];
  }

  getVersionControlPrompts(versionControl: string): any[] {
    return versionControl === VersionControl.GITHUB ? githubPrompts : [];
  }

  getFrontendApplicationType(): any[] {
    return [
      {
        choices: [
          ApplicationType.REACT,
          ApplicationType.NEXT,
        ],
        message: "Select a frontend application type:",
        name: "frontend_app_type",
        type: "list",
      },
    ];
  }

  getBackendApplicationType(): any[] {
    return [
      {
        choices: [
          ApplicationType.NODE_EXPRESS,
          ApplicationType.NEST,
          ApplicationType.NODE,
        ],
        message: "Select a backend application type:",
        name: "backend_app_type",
        type: "list",
      },
    ];
  }

  getFrontendAppName(): any[] {
    return [
      {
        type: 'input',
        name: 'frontend_app_name',
        message: 'What is your frontend app name?',
        default: 'my-app-ui',
      },
    ];
  }

  getBackendAppName(): any[] {
    return [
      {
        type: 'input',
        name: 'backend_app_name',
        message: 'What is your backend app name?',
        default: 'my-app-backend',
      },
    ];
  }

  getOrganizationName(): any[] {
    return [
      {
        type: 'input',
        name: 'organization_name',
        message: 'What is your git organization name?',
        default: 'calfus-test-org',
      },
    ];
  }

  getGitUserName(): any[] {
    return [
      {
        type: 'input',
        name: 'git_user_name',
        message: 'What is your git user name?',
        default: 'sanketcalfus',
      },
    ];
  }

  getAppRouterPrompts(): any[] {
    return [
      {
        message: "Would you like to use App Router? (recommended)",
        name: "app_router",
        type: "confirm",
        default: false,
      },
    ];
  }

  getFrontendPrompts(): any[] {
    return [
      {
        message: "Would you like to create frontend application? (recommended)",
        name: "frontend_app",
        type: "confirm",
        default: false,
      },
    ];
  }

  getBackendPrompts(): any[] {
    return [
      {
        message: "Would you like to create backend application? (recommended)",
        name: "backend_app",
        type: "confirm",
        default: false,
      },
    ];
  }
}
