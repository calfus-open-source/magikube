import SystemConfig from '../../config/system.js';
import { ProjectConfig } from '../interface.js';
import { AppLogger } from '../../logger/appLogger.js';
import AWSAccount from '../aws/aws-account.js';
import { executeCommandWithRetry } from './executeCommandWithRetry-utils.js';
import {
  ec2VpcModules,
  eksFargateVpcModules,
  eksNodegroupVpcModules,
  rdsVpcModules,
  vpceksNodegroupIngressModules,
} from '../constants/constants.js';
import TemplateTerraformProject from '../templatesTerraform-projects.js';
import BaseCommand from '../../commands/base.js';
import {
  initializeStatusFile,
  updateStatusFile,
} from './statusUpdater-utils.js';
// `modules` is not exported from constants; remove incorrect import
import { dotMagikubeConfig } from './projectConfigReader-utils.js';
import { handlePrompts } from './handlePrompts-utils.js';
import { cloneAndCopyTemplates } from './copyTemplates-utils.js';
import {
  BASTION_SYSTEM_CONFIG,
  MASTER_SYSTEM_CONFIG,
  WORKER_SYSTEM_CONFIG,
  EKSNODEGROUP_SYSTEM_CONFIG,
  KUBERNITIES_SYSTEM_CONFIG,
} from '../constants/systemDefaults.js';

export async function handleTemplateFlag(
  args: { name: string },
  command?: BaseCommand | string,
  template?: string,
) {
  const commandName = typeof command === 'string' ? command : command?.id;
  const currentDir = process.cwd();
  const responses = dotMagikubeConfig(args.name, currentDir);
  if (!responses) {
    throw new Error(
      `Failed to read .magikube configuration for project '${args.name}'`,
    );
  }
  const moduleType = '';
  const domain =
    template === 'vpc-rds-nodegroup-acm-ingress'
      ? await handlePrompts(args, commandName, template, moduleType)
      : null;

  await cloneAndCopyTemplates(commandName, responses.cloud_provider);
  AppLogger.debug(
    `Creating new magikube project named '${args.name}' in the current directory`,
    true,
  );

  const projectName = args.name;

  if (template) {
    responses.template = template;
    responses.command = commandName;
    responses.project_name = projectName;
    if (domain) responses.domain_name = domain.domain;
  }

  //Conditionally using default system config values
  const combinedConfig: ProjectConfig | undefined =
    responses.template === 'eks-fargate-vpc'
      ? { ...KUBERNITIES_SYSTEM_CONFIG, ...responses }
      : responses.template === 'eks-nodegroup-vpc'
        ? {
            ...KUBERNITIES_SYSTEM_CONFIG,
            ...EKSNODEGROUP_SYSTEM_CONFIG,
            ...responses,
          }
        : responses.template === 'rds-vpc'
          ? { ...responses }
          : responses.template === 'ec2-vpc'
            ? {
                ...BASTION_SYSTEM_CONFIG,
                ...MASTER_SYSTEM_CONFIG,
                ...WORKER_SYSTEM_CONFIG,
                ...responses,
              }
            : responses.template === 'vpc-rds-nodegroup-acm-ingress'
              ? {
                  ...EKSNODEGROUP_SYSTEM_CONFIG,
                  ...KUBERNITIES_SYSTEM_CONFIG,
                  ...responses,
                }
              : undefined;
  SystemConfig.getInstance().mergeConfigs(combinedConfig!);

  const projectConfig = SystemConfig.getInstance().getConfig();
  AppLogger.info(
    `Setting up Infrastructure using template :'${template}'.`,
    true,
  );
  const terraform = await TemplateTerraformProject.getProject(
    command as BaseCommand,
  );
  const region = projectConfig.aws_region as string;
  const awsAccessKey = projectConfig.aws_access_key_id as string;
  const awsSecretKey = projectConfig.aws_secret_access_key as string;

  const accountId = await AWSAccount.getAccountId(
    awsAccessKey,
    awsSecretKey,
    region,
  );

  SystemConfig.getInstance().mergeConfigs({ accountId: accountId });

  if (terraform) {
    await terraform.createProject(projectName, currentDir);
    if (responses['cloud_provider'] === 'aws') {
      if (
        'AWSProfileActivate' in terraform &&
        typeof terraform.AWSProfileActivate === 'function'
      ) {
        await terraform.AWSProfileActivate(responses['aws_profile']);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 15000));

    await terraform?.runTerraformInit(
      currentDir + '/' + projectName + '/infrastructure',
      `${responses['environment']}-config.tfvars`,
      projectName,
    );

    const modules: string[] | undefined =
      projectConfig.template === 'eks-fargate-vpc'
        ? eksFargateVpcModules
        : projectConfig.template === 'eks-nodegroup-vpc'
          ? eksNodegroupVpcModules
          : projectConfig.template === 'rds-vpc'
            ? rdsVpcModules
            : projectConfig.template === 'ec2-vpc'
              ? ec2VpcModules
              : projectConfig.template === 'vpc-rds-nodegroup-acm-ingress'
                ? vpceksNodegroupIngressModules
                : undefined;
    let allModulesAppliedSuccessfully = true;

    initializeStatusFile(projectName, modules ?? []);

    for (const module of modules ?? []) {
      const moduleName = '';
      try {
        updateStatusFile(projectName, 'terraform-apply', 'fail');
        updateStatusFile(projectName, module, 'fail');
        AppLogger.info(`Starting Terraform apply for module: ${module}`, true);

        // BOTH CODE PATHS NOW THROW INTO SAME CATCH BLOCK
        if (
          projectConfig.template == 'ec2-vpc' ||
          projectConfig.template === 'rds-vpc'
        ) {
          await executeCommandWithRetry(
            'terraform apply -auto-approve',
            { cwd: `${currentDir}/${projectName}/infrastructure` },
            1,
          );
          updateStatusFile(projectName, 'terraform-apply', 'success');
          AppLogger.info(
            `Starting Terraform apply for module: ${module}`,
            true,
          );
        } else {
          await terraform?.runTerraformApply(
            currentDir + '/' + projectName + '/infrastructure',
            module,
            moduleName,
            'terraform.tfvars',
          );
        }

        AppLogger.debug(
          `Successfully applied Terraform for module: ${module}`,
          true,
        );
        updateStatusFile(projectName, module, 'success');
      } catch (error) {
        // ⭐ THIS WILL NOW ALWAYS EXECUTE FOR ALL TEMPLATE TYPES
        AppLogger.error(
          `Error applying Terraform for module: ${module}: ${error}`,
          true,
        );

        allModulesAppliedSuccessfully = false;
        updateStatusFile(projectName, module, 'fail');
        updateStatusFile(projectName, 'terraform-apply', 'fail');
      }
    }

    if (allModulesAppliedSuccessfully) {
      updateStatusFile(projectName, 'terraform-apply', 'success');
    } else {
      updateStatusFile(projectName, 'terraform-apply', 'fail');
    }
  }
}
