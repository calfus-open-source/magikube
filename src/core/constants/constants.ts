export const modules = [
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


export const services =[
    "policy",
    "terraform-init",
    "terraform-apply",
    "auth-service",
    "keycloak",
    "my-node-app",
    "react", 
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

