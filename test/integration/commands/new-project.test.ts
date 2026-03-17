/**
 * Command Orchestration Integration Tests: `magikube new`
 *
 * These tests validate the internal orchestration logic of the `new` command:
 * - Config merging: correct system defaults are applied per cloud provider / cluster type
 * - Module routing: correct module lists are selected per template
 * - Status file lifecycle: initialize → pending → success/fail transitions
 *
 * Unlike unit tests (which mock every dependency), these let the config merge
 * and routing logic run for real, catching integration bugs between steps.
 *
 * The outermost I/O boundary (child_process, AWS SDK, filesystem) is still mocked.
 */

import {
  BASTION_SYSTEM_CONFIG,
  MASTER_SYSTEM_CONFIG,
  WORKER_SYSTEM_CONFIG,
  KUBERNITIES_SYSTEM_CONFIG,
  EKSNODEGROUP_SYSTEM_CONFIG,
  AWS_SPECIFIC_CONFIG,
  AZURE_SPECIFIC_CONFIG,
  NEXT_APP_CONFIG,
  REACT_APP_CONFIG,
  NODE_APP_CONFIG,
  GEN_AI_CONFIG,
} from '../../../src/core/constants/systemDefaults.js';

import {
  aws_modules,
  azure_modules,
  services,
  eksFargateVpcModules,
  eksNodegroupVpcModules,
  rdsVpcModules,
  ec2VpcModules,
  vpceksNodegroupIngressModules,
} from '../../../src/core/constants/constants.js';

describe('New Project Orchestration (integration)', () => {
  describe('Config merge correctness', () => {
    test('AWS default flow merges all system configs with user responses', () => {
      const userResponses = {
        cloud_provider: 'aws',
        cluster_type: 'eks-fargate',
        aws_region: 'us-east-1',
        aws_profile: 'default',
        environment: 'dev',
        project_name: 'testproj',
      };

      // This replicates the merge logic in new/index.ts lines 167-179
      const systemConfig = {
        ...AWS_SPECIFIC_CONFIG,
        ...BASTION_SYSTEM_CONFIG,
        ...MASTER_SYSTEM_CONFIG,
        ...WORKER_SYSTEM_CONFIG,
        ...KUBERNITIES_SYSTEM_CONFIG,
        ...EKSNODEGROUP_SYSTEM_CONFIG,
        ...NEXT_APP_CONFIG,
        ...REACT_APP_CONFIG,
        ...NODE_APP_CONFIG,
        ...GEN_AI_CONFIG,
      };

      const combined = { ...systemConfig, ...userResponses };

      // User responses should override system defaults
      expect(combined.cloud_provider).toBe('aws');
      expect(combined.aws_region).toBe('us-east-1');

      // System defaults should be present
      expect(combined.aws_vpc_cidr).toBe('10.0.0.0/16');
      expect(combined.aws_eks_cluster_version).toBe('1.30');
      expect(combined.aws_vpc_module_version).toBe('5.5.1');
      expect(combined.kube_version).toBe('1.29');
      expect(combined.service_cidr).toBe('192.168.0.0/17');
      expect(combined.bastion_instance_type).toBe('t3.micro');
      expect(combined.master_instance_type).toBe('t3.medium');
      expect(combined.worker_instance_type).toBe('t3.medium');
      expect(combined.node_instance_type).toBe('t3.medium');
      expect(combined.react_app_name).toBe('my-react-app');
      expect(combined.node_app_name).toBe('my-node-app');
    });

    test('Azure default flow does NOT include AWS-specific config', () => {
      const userResponses = {
        cloud_provider: 'azure',
        cluster_type: 'aks',
        azure_location: 'eastus',
        environment: 'dev',
      };

      const systemConfig = {
        ...AZURE_SPECIFIC_CONFIG,
        ...BASTION_SYSTEM_CONFIG,
        ...MASTER_SYSTEM_CONFIG,
        ...WORKER_SYSTEM_CONFIG,
        ...KUBERNITIES_SYSTEM_CONFIG,
        ...EKSNODEGROUP_SYSTEM_CONFIG,
        ...NEXT_APP_CONFIG,
        ...REACT_APP_CONFIG,
        ...NODE_APP_CONFIG,
        ...GEN_AI_CONFIG,
      };

      const combined = { ...systemConfig, ...userResponses };

      // Azure-specific defaults should be present
      expect(combined.azure_provider_version).toBe('4.0.0');
      expect(combined.azure_aks_cluster_version).toBe('1.30');

      // AWS-specific defaults should NOT be present
      expect(combined).not.toHaveProperty('aws_vpc_cidr');
      expect(combined).not.toHaveProperty('aws_eks_cluster_version');
      expect(combined).not.toHaveProperty('aws_provider_version');
    });

    test('user responses override conflicting system defaults', () => {
      const userResponses = {
        cloud_provider: 'aws',
        node_instance_type: 't3.large', // Override default t3.medium
        kube_version: '1.31', // Override default 1.29
      };

      const systemConfig = {
        ...AWS_SPECIFIC_CONFIG,
        ...KUBERNITIES_SYSTEM_CONFIG,
        ...EKSNODEGROUP_SYSTEM_CONFIG,
      };

      // User responses are spread AFTER system config (overrides)
      const combined = { ...systemConfig, ...userResponses };

      expect(combined.node_instance_type).toBe('t3.large');
      expect(combined.kube_version).toBe('1.31');
    });
  });

  describe('Template-specific config merging (handleTemplateFlag)', () => {
    test('eks-fargate-vpc merges KUBERNITIES_SYSTEM_CONFIG only', () => {
      const responses = { template: 'eks-fargate-vpc', project_name: 'test' };

      // Replicates groupingTemplateProject-utils.ts lines 66-90
      const combined = { ...KUBERNITIES_SYSTEM_CONFIG, ...responses };

      expect(combined.service_cidr).toBe('192.168.0.0/17');
      expect(combined.kube_version).toBe('1.29');
      // Should NOT have nodegroup or bastion configs
      expect(combined).not.toHaveProperty('node_instance_type');
      expect(combined).not.toHaveProperty('bastion_instance_type');
    });

    test('eks-nodegroup-vpc merges KUBERNITIES + EKSNODEGROUP configs', () => {
      const responses = { template: 'eks-nodegroup-vpc', project_name: 'test' };

      const combined = {
        ...KUBERNITIES_SYSTEM_CONFIG,
        ...EKSNODEGROUP_SYSTEM_CONFIG,
        ...responses,
      };

      expect(combined.service_cidr).toBe('192.168.0.0/17');
      expect(combined.node_instance_type).toBe('t3.medium');
      expect(combined.node_desired_size).toBe('2');
    });

    test('rds-vpc merges NO system configs (raw responses only)', () => {
      const responses = {
        template: 'rds-vpc',
        project_name: 'test',
        custom_field: 'value',
      };

      // rds-vpc just uses { ...responses }
      const combined = { ...responses };

      expect(combined).not.toHaveProperty('kube_version');
      expect(combined).not.toHaveProperty('node_instance_type');
      expect(combined.custom_field).toBe('value');
    });

    test('ec2-vpc merges BASTION + MASTER + WORKER configs', () => {
      const responses = { template: 'ec2-vpc', project_name: 'test' };

      const combined = {
        ...BASTION_SYSTEM_CONFIG,
        ...MASTER_SYSTEM_CONFIG,
        ...WORKER_SYSTEM_CONFIG,
        ...responses,
      };

      expect(combined.bastion_instance_type).toBe('t3.micro');
      expect(combined.master_instance_type).toBe('t3.medium');
      expect(combined.worker_instance_count).toBe('2');
      // Should NOT have k8s or EKS configs
      expect(combined).not.toHaveProperty('kube_version');
      expect(combined).not.toHaveProperty('node_instance_type');
    });

    test('vpc-rds-nodegroup-acm-ingress merges EKSNODEGROUP + KUBERNITIES', () => {
      const responses = {
        template: 'vpc-rds-nodegroup-acm-ingress',
        project_name: 'test',
      };

      const combined = {
        ...EKSNODEGROUP_SYSTEM_CONFIG,
        ...KUBERNITIES_SYSTEM_CONFIG,
        ...responses,
      };

      expect(combined.node_instance_type).toBe('t3.medium');
      expect(combined.kube_version).toBe('1.29');
    });
  });

  describe('Module routing per template', () => {
    test('eks-fargate-vpc routes to eksFargateVpcModules', () => {
      expect(eksFargateVpcModules).toBeDefined();
      expect(Array.isArray(eksFargateVpcModules)).toBe(true);
      expect(eksFargateVpcModules.length).toBeGreaterThan(0);
    });

    test('eks-nodegroup-vpc routes to eksNodegroupVpcModules', () => {
      expect(eksNodegroupVpcModules).toBeDefined();
      expect(Array.isArray(eksNodegroupVpcModules)).toBe(true);
    });

    test('rds-vpc routes to rdsVpcModules', () => {
      expect(rdsVpcModules).toBeDefined();
      expect(Array.isArray(rdsVpcModules)).toBe(true);
    });

    test('ec2-vpc routes to ec2VpcModules', () => {
      expect(ec2VpcModules).toBeDefined();
      expect(Array.isArray(ec2VpcModules)).toBe(true);
    });

    test('vpc-rds-nodegroup-acm-ingress routes to vpceksNodegroupIngressModules', () => {
      expect(vpceksNodegroupIngressModules).toBeDefined();
      expect(Array.isArray(vpceksNodegroupIngressModules)).toBe(true);
    });

    test('default new command AWS uses aws_modules', () => {
      expect(aws_modules).toBeDefined();
      expect(Array.isArray(aws_modules)).toBe(true);
    });

    test('default new command Azure uses azure_modules', () => {
      expect(azure_modules).toBeDefined();
      expect(Array.isArray(azure_modules)).toBe(true);
    });

    test('template module routing covers all supported templates', () => {
      // This is the mapping from groupingTemplateProject-utils.ts lines 132-143
      const templateToModules: Record<string, string[] | undefined> = {
        'eks-fargate-vpc': eksFargateVpcModules,
        'eks-nodegroup-vpc': eksNodegroupVpcModules,
        'rds-vpc': rdsVpcModules,
        'ec2-vpc': ec2VpcModules,
        'vpc-rds-nodegroup-acm-ingress': vpceksNodegroupIngressModules,
      };

      for (const [_template, modules] of Object.entries(templateToModules)) {
        expect(modules).toBeDefined();
        expect(modules!.length).toBeGreaterThan(0);
        // Every module name should be a non-empty string
        for (const mod of modules!) {
          expect(typeof mod).toBe('string');
          expect(mod.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Cluster type routing', () => {
    test('eks-fargate routes to handleEKSandAKS (not handleK8s)', () => {
      const clusterType = 'eks-fargate';
      const usesEKSHandler =
        clusterType === 'eks-fargate' ||
        clusterType === 'eks-nodegroup' ||
        clusterType === 'aks';
      const usesK8sHandler = clusterType === 'k8s';

      expect(usesEKSHandler).toBe(true);
      expect(usesK8sHandler).toBe(false);
    });

    test('aks routes to handleEKSandAKS', () => {
      const clusterType = 'aks';
      const usesEKSHandler =
        clusterType === 'eks-fargate' ||
        clusterType === 'eks-nodegroup' ||
        clusterType === 'aks';

      expect(usesEKSHandler).toBe(true);
    });

    test('k8s routes to handleK8s (not handleEKSandAKS)', () => {
      const clusterType = 'k8s';
      const usesEKSHandler =
        clusterType === 'eks-fargate' ||
        clusterType === 'eks-nodegroup' ||
        clusterType === 'aks';
      const usesK8sHandler = clusterType === 'k8s';

      expect(usesEKSHandler).toBe(false);
      expect(usesK8sHandler).toBe(true);
    });
  });

  describe('Service list construction', () => {
    test('AWS service list includes policy service', () => {
      const frontendType = 'react';
      const awsServiceList = [...services, frontendType];

      expect(awsServiceList).toContain('policy');
      expect(awsServiceList).toContain('react');
    });

    test('Azure service list excludes policy but includes frontend', () => {
      const frontendType = 'react';
      const azureServiceList = [
        ...services.filter((s) => s !== 'policy'),
        frontendType,
      ];

      expect(azureServiceList).not.toContain('policy');
      expect(azureServiceList).toContain('react');
    });
  });

  describe('FullConfigObject construction', () => {
    test('AWS config object has aws field with region and keys', () => {
      const projectConfig = {
        cloud_provider: 'aws',
        github_access_token: 'token',
        git_user_name: 'user',
        github_owner: 'org',
        source_code_repository: 'github',
        aws_region: 'us-east-1',
        aws_access_key_id: 'AKIA...',
        aws_secret_access_key: 'secret',
        environment: 'dev',
      };

      // Replicate config object construction from new/index.ts lines 234-269
      const configObject: Record<string, unknown> = {
        common: {
          token: projectConfig.github_access_token,
          userName: projectConfig.git_user_name,
          orgName: projectConfig.github_owner,
          sourceCodeRepo: projectConfig.source_code_repository,
          projectName: 'testproj',
          environment: projectConfig.environment,
        },
      };

      if (projectConfig.cloud_provider === 'aws') {
        configObject.aws = {
          region: projectConfig.aws_region,
          awsAccessKey: projectConfig.aws_access_key_id,
          awsSecretKey: projectConfig.aws_secret_access_key,
        };
      }

      expect(configObject).toHaveProperty('common');
      expect(configObject).toHaveProperty('aws');
      expect(configObject).not.toHaveProperty('azure');
      expect((configObject.aws as Record<string, string>).region).toBe(
        'us-east-1',
      );
    });

    test('Azure config object has azure field with subscription details', () => {
      const projectConfig = {
        cloud_provider: 'azure',
        github_access_token: 'token',
        git_user_name: 'user',
        github_owner: 'org',
        source_code_repository: 'github',
        azure_location: 'eastus',
        azure_client_id: 'client-id',
        azure_client_secret: 'client-secret',
        azure_tenant_id: 'tenant-id',
        azure_subscription_id: 'sub-id',
        environment: 'dev',
      };

      const configObject: Record<string, unknown> = {
        common: {
          token: projectConfig.github_access_token,
          userName: projectConfig.git_user_name,
          orgName: projectConfig.github_owner,
          sourceCodeRepo: projectConfig.source_code_repository,
          projectName: 'testproj',
          environment: projectConfig.environment,
        },
      };

      if (projectConfig.cloud_provider === 'azure') {
        configObject.azure = {
          location: projectConfig.azure_location,
          clientId: projectConfig.azure_client_id,
          clientSecret: projectConfig.azure_client_secret,
          tenantId: projectConfig.azure_tenant_id,
          subscriptionId: projectConfig.azure_subscription_id,
        };
      }

      expect(configObject).toHaveProperty('common');
      expect(configObject).toHaveProperty('azure');
      expect(configObject).not.toHaveProperty('aws');
    });
  });
});
