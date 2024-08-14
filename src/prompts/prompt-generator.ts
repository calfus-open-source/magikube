import SystemConfig from "../config/system.js";
import { AppLogger } from "../logger/appLogger.js";
import { Environment, CloudProvider, VersionControl, Colours } from './constants.js';

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
    // Validate the input
    validate: function(input: string) {
      const awsRegions = ['us-east-1', 'us-east-2', 'us-west-1',
                          'us-west-2', 'af-south-1', 'ap-east-1', 'ap-south-1', 'ap-northeast-3',
                          'ap-northeast-2', 'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1',
                          'ca-central-1', 'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-south-1',
                          'eu-west-3', 'eu-north-1', 'me-south-1', 'sa-east-1'];
      if (awsRegions.includes(input)) {
          return true;
      } else {
          return `${Colours.boldText}${Colours.redColor}\n Invalid Region. Please enter existing region.${Colours.colorReset}`;
      }
  },
  },
  {
    choices: ["eks-fargate", "eks-nodegroup"],
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
      VersionControl.GITHUB,
      // VersionControl.CODECOMMIT,
      VersionControl.BITBUCKET,
    ],
    default:
      VersionControl.GITHUB ||
      SystemConfig.getInstance().getConfig().source_code_repository,
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
  {
    type: 'input',
    name: 'git_user_name',
    message: 'What is your git user name?',
    default:
      process.env.GIT_USER_NAME ||
      SystemConfig.getInstance().getConfig().git_user_name,
  }
];

const codeCommitPrompts: any[] = [
  {
    message: "Enter Name for Frontend Repo: ",
    name: "frontend_repo_codecommit",
    type: "input",
    default: "frontend_app"
  },
  {
    message: "Enter Name for Backend Repo: ",
    name: "backend_repo_codecommit",
    type: "input",
    default: "backend_app"
  },
];

const domainPrompt: any[] = [
  {
    message: "Enter the Domain Name: ",
    name: "domain",
    type: "input",
    validate: (input: string) => {
      if (!input || input.trim() === "") {
        return "Domain name is required.";
      }
      return true;
    }
  }
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

  getLifecycles(environment: Environment): any[] {
    return environment === Environment.PRODUCTION
      ? productionPrompts
      : nonProductionPrompts;
  }

  getCloudProviderPrompts(cloudProvider: CloudProvider): any[] {
    if (cloudProvider === CloudProvider.AWS) {
      return awsPrompts;
    }
    else {
      // Handle unknown cloud providers or invalid input
      AppLogger.error(`\n ${Colours.greenColor}${Colours.boldText} ${cloudProvider.toUpperCase()} ${Colours.colorReset}${Colours.boldText}support is coming soon... \n`, true);
      process.exit(1);
  }
  }


  getClusterPrompts(clusterType: string): any[] {
    return clusterType === "k8s" ? k8sPrompts : [];
  }

  getVersionControlPrompts(versionControl: string): any[] {
    if (versionControl === VersionControl.GITHUB) {
      return githubPrompts;
    }
    else if (versionControl === VersionControl.CODECOMMIT) {
      return [];
    }
    else {
      // Handle unknown cloud providers or invalid input
      console.error(`\n ${Colours.greenColor}${Colours.boldText} ${versionControl.toUpperCase()} ${Colours.colorReset}${Colours.boldText}support is coming soon... \n`);
      process.exit(1);
    }
  }

  getDomainPrompt(): any[] {
    return domainPrompt;
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
          // ApplicationType.NEST,
          // ApplicationType.NODE,
        ],
        message: "Select a backend application type:",
        name: "backend_app_type",
        type: "list",
      },
    ];
  }
}
