export const awsModules = [
    "module.vpc",
    "module.eks",
    "module.acm",
    "module.ecr-repo",
    "module.gitops",
    "module.repository",
    "module.ingress-controller",
    "module.argo",
    "module.environment"
];

export const gcpModules = [
  "module.vpc", // Virtual Private Cloud
  "module.gke", // Google Kubernetes Engine
  "module.ssl-certificates", // SSL Certificates
  "module.artifact-registry", // Artifact Registry (equivalent to ECR)
  "module.gitops", // GitOps (e.g., ArgoCD configurations)
  "module.cloud-source-repository", // Google Cloud Source Repository
  "module.ingress-controller", // Ingress Controller
  "module.argo", // ArgoCD or workflows
  "module.environment", // Custom environment configurations
];

export const azureModules = [

];

export const getServices = (frontendAppType: string) => [
    "policy",
    "terraform-init",
    "terraform-apply",
    "auth-service",
    "keycloak",
    "my-node-app",
    frontendAppType, 
    "gitops"
];

  export const awsRegions = [
    "us-east-1",
    "us-east-2",
    "us-west-1",
    "us-west-2",
    "af-south-1",
    "ap-east-1",
    "ap-south-1",
    "ap-northeast-3",
    "ap-northeast-2",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-northeast-1",
    "ca-central-1",
    "eu-central-1",
    "eu-west-1",
    "eu-west-2",
    "eu-south-1",
    "eu-west-3",
    "eu-north-1",
    "me-south-1",
    "sa-east-1",
  ];

export const gcpRegions = [
  "africa-south1-a",
  "africa-south1-b",
  "africa-south1-c",
  "asia-east1-a",
  "asia-east1-b",
  "asia-east1-c",
  "asia-east2-1",
  "asia-east2-b",
  "asia-east2-c",
  "asia-northeast1-a",
  "asia-northeast1-b",
  "asia-northeast1-c",
  "asia-northeast2-a",
  "asia-northeast2-b",
  "asia-northeast2-c",
  "asia-northeast3-a",
  "asia-northeast3-b",
  "asia-northeast3-c",
  "asia-south1-a",
  "asia-south1-b",
  "asia-south1-c",
  "asia-south2-a",
  "asia-south2-b",
  "asia-south3-a",
  "asia-southeast1-a",
  "asia-southeast1-b",
  "asia-southeast1-c",
  "asia-southeast2-a",
  "asia-southeast2-b",
  "asia-southeast2-c",
  "australia-southeast1-a",
  "australia-southeast1-b",
  "australia-southeast1-c",
  "australia-southeast2-a",
  "australia-southeast2-b",
  "australia-southeast2-c",
  "europe-central2-a",
  "europe-central2-b",
  "europe-central2-c",
  "europe-north1-a",
  "europe-north1-b",
  "europe-north1-c",
  "europe-southwest1-a",
  "europe-southwest1-b",
  "europe-southwest1-c",
  "europe-west1-b",
  "europe-west1-c",
  "europe-west1-d",
  "europe-west10-a",
  "europe-west10-b",
  "europe-west10-c",
  "europe-west12-a",
  "europe-west12-b",
  "europe-west12-c",
  "europe-west2-a",
  "europe-west2-b",
  "europe-west2-b",
  "europe-west2-c",
  "europe-west3-a",
  "europe-west3-b",
  "europe-west3-c",
];
