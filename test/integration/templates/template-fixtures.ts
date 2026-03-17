/**
 * Shared fixture configs for template rendering integration tests.
 *
 * These mirror the ProjectConfig objects that magikube passes to LiquidJS
 * when rendering templates from the infrastructure-templates repo.
 * If a template variable is renamed or removed in either repo,
 * snapshot tests will fail — catching drift before users hit it.
 */

/** Minimal AWS EKS-Fargate project config */
export const AWS_EKS_FARGATE_CONFIG = {
  project_name: 'testproj',
  environment: 'dev',
  cloud_provider: 'aws',
  aws_region: 'us-east-1',
  aws_access_key_id: 'AKIAIOSFODNN7EXAMPLE',
  aws_secret_access_key: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  accountId: '123456789012',
  aws_profile: 'default',
  aws_vpc_cidr: '10.0.0.0/16',
  aws_az_count: '2',
  aws_eks_cluster_version: '1.30',
  aws_eks_module_version: '20.20.0',
  aws_vpc_module_version: '5.5.1',
  aws_load_balancer_controller_version: '1.8.0',
  cluster_type: 'eks-fargate',
  source_code_repository: 'github',
  github_owner: 'test-org',
  github_access_token: 'ghp_test_token_placeholder',
  git_user_name: 'test-user',
  frontend_app_type: 'react',
  backend_app_type: 'node-express',
  react_app_name: 'my-react-app',
  node_app_name: 'my-node-app',
  command: 'new',
  terraform_version: '1.8.2',
  github_provider_version: '~> 6.0',
  aws_provider_version: '5.58.0',
  argocd_helm_version: '6.0.6',
  // KUBERNITIES_SYSTEM_CONFIG defaults
  ebs_vol_size: '100G',
  service_cidr: '192.168.0.0/17',
  pod_network_cidr: '192.168.128.0/17',
  kube_version: '1.29',
  kube_cni_version: '1.2.0-00',
  disk_size: '100G',
  kube_reserved_cpu: '100m',
  kube_reserved_memory: '300Mi',
  system_reserved_cpu: '100m',
  system_reserved_memory: '200Mi',
  eviction_memory_threshold: '100Mi',
};

/** AWS EKS-Nodegroup config (adds nodegroup-specific defaults) */
export const AWS_EKS_NODEGROUP_CONFIG = {
  ...AWS_EKS_FARGATE_CONFIG,
  cluster_type: 'eks-nodegroup',
  node_host_ami_owner: '099720109477',
  node_host_ami_name: 'ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*',
  node_host_ami_virtualization_type: 'hvm',
  node_instance_type: 't3.medium',
  node_desired_size: '2',
  node_max_size: '3',
  node_min_size: '2',
  ebs_volume_size: '100',
  ebs_volume_type: 'gp2',
};

/** AWS K8S (EC2-based) config */
export const AWS_K8S_CONFIG = {
  ...AWS_EKS_FARGATE_CONFIG,
  cluster_type: 'k8s',
  bastion_host_ami_owner: '099720109477',
  bastion_host_ami_name:
    'ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*',
  bastion_host_ami_virtualization_type: 'hvm',
  bastion_instance_type: 't3.micro',
  bastion_instance_count: '1',
  master_host_ami_owner: '099720109477',
  master_host_ami_name:
    'ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*',
  master_host_ami_virtualization_type: 'hvm',
  master_instance_type: 't3.medium',
  master_instance_count: '1',
  worker_host_ami_owner: '099720109477',
  worker_host_ami_name:
    'ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*',
  worker_host_ami_virtualization_type: 'hvm',
  worker_instance_type: 't3.medium',
  worker_instance_count: '2',
};

/** Minimal Azure AKS project config */
export const AZURE_AKS_CONFIG = {
  project_name: 'testproj',
  environment: 'dev',
  cloud_provider: 'azure',
  azure_location: 'eastus',
  azure_client_id: '00000000-0000-0000-0000-000000000000',
  azure_client_secret: 'test-secret-placeholder',
  azure_tenant_id: '11111111-1111-1111-1111-111111111111',
  azure_subscription_id: '22222222-2222-2222-2222-222222222222',
  resource_group_name: 'testproj-rg',
  azure_aks_cluster_version: '1.30',
  azure_provider_version: '4.0.0',
  azure_aks_module_version: '1.0.0',
  azure_load_balancer_controller_version: '1.8.0',
  source_code_repository: 'github',
  github_owner: 'test-org',
  github_access_token: 'ghp_test_token_placeholder',
  git_user_name: 'test-user',
  frontend_app_type: 'react',
  backend_app_type: 'node-express',
  react_app_name: 'my-react-app',
  node_app_name: 'my-node-app',
  command: 'new',
  terraform_version: '1.8.2',
  github_provider_version: '~> 6.0',
  argocd_helm_version: '6.0.6',
};
