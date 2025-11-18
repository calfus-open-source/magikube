export const aws_modules = [
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

export const azure_modules = [
  "module.vnet",
  "module.nsg",
  "module.bastion",
  "module.kv", 
  "module.agw",
  "module.k8s_common",
  "module.acr",
  "module.aks",
  "module.sql_server",
  "module.gitops",
  "module.repository",
];

export const aws_destroy_modules = [
  "module.rds",
  "module.environment",
  "module.argo",
  "module.ingress-controller",
  "module.repository",
  "module.gitops",
  "module.ecr-repo",
  "module.acm",
  "module.eks",
  "module.vpc",
];

export const azure_destroy_modules = [
  "module.repository",
  "module.gitops",
  "module.sql_server",
  "module.aks",
  "module.acr",
  "module.k8s_common",
  "module.agw",
  "module.bastion",
  "module.kv",
  "module.nsg",
  "module.vnet",
];

export const singleModules = ["module.vpc", "module.eks", "module.rds", "module.acm"];

export const InvalidProjectNames = ["vpc", "rds", "eks", "acm", "ecr"]

export const services =[
    "policy",
    "terraform-init",
    "terraform-apply",
    "auth-service",
    "keycloak",
    "my-node-app",
    "my-genAI-app",
    "gitops"
];

export const playbooks = [ 'create-k8s-cluster.yml','configure-k8s-cluster.yml','create-ingress-controller.yml','nginx.yml','ecr-helper.yml'];

export const supportedTemplates = [
    "eks-fargate-vpc",
    "eks-nodegroup-vpc",
    "rds-vpc",
    "ec2-vpc",
    "vpc-rds-nodegroup-acm-ingress",
];

export const eksFargateVpcModules = ["module.vpc", "module.eks"];

export const eksNodegroupVpcModules = ["module.vpc", "module.eks"];

export const rdsVpcModules = ["module.vpc"];

export const ec2VpcModules = ["module.vpc", "module.ec2"];

export const vpceksNodegroupIngressModules = [
    "module.vpc",
    "module.eks",
    "module.acm",
    "module.ingress-controller"
];

export const awsSupportedRegions = [
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

export const azureSupportedRegions = [
  "eastus",
  "eastus2",
  "westus",
  "westus2",
  "westus3",
  "centralus",
  "northcentralus",
  "southcentralus",
  "westcentralus",
  "canadacentral",
  "canadaeast",
  "brazilsouth",
  "northeurope",
  "westeurope",
  "uksouth",
  "ukwest",
  "francecentral",
  "francesouth",
  "germanywestcentral",
  "norwayeast",
  "switzerlandnorth",
  "swedencentral",
  "eastasia",
  "southeastasia",
  "japaneast",
  "japanwest",
  "australiaeast",
  "australiasoutheast",
  "centralindia",
  "southindia",
  "westindia",
  "koreacentral",
  "koreasouth",
  "uaenorth",
  "southafricanorth",
];
