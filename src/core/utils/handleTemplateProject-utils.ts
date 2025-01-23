import SystemConfig from "../../config/system.js";
import { AppLogger } from "../../logger/appLogger.js";
import AWSAccount from "../aws/aws-account.js";
import { executeCommandWithRetry } from "./executeCommandWithRetry-utils.js";
import {
  ec2VpcModules,
  eksFargateVpcModules,
  eksNodegroupVpcModules,
  rdsVpcModules,
  services,
  vpceksNodegroupIngressModules,
} from "../constants/constants.js";
import TemplateTerraformProject from "../templatesTerraform-projects.js";
import {
  initializeStatusFile,
  updateStatusFile,
} from "./statusUpdater-utils.js";
import { modules } from "../constants/constants.js";
import { dotMagikubeConfig } from "./projectConfigReader-utils.js";
import { handlePrompts } from "./handlePrompts-utils.js";
import { cloneAndCopyTemplates } from "./copyTemplates-utils.js";

export async function handleTemplateFlag(args:any, commandName?:any ,template?:any) {
  const responses = dotMagikubeConfig(args.name, process.cwd());
  const moduleType = "";
  const domain =
    template === "vpc-rds-nodegroup-acm-ingress"
      ? await handlePrompts(args, commandName, template, moduleType)
      : null;

  await cloneAndCopyTemplates(commandName);
  AppLogger.debug(
    `Creating new magikube project namedddddd '${args.name}' in the current directory`,
    true
  );
  const projectName = args.name;
  if (template) {
    responses.template = template;
    responses.command = commandName;
    responses.project_name = projectName;
    if (domain) responses.domain_name = domain.domain;
  }
  SystemConfig.getInstance().mergeConfigs(responses);
  const projectConfig = SystemConfig.getInstance().getConfig();
  const terraform = await TemplateTerraformProject.getProject(commandName);
  AppLogger.info(`Using template '${template}' for project setup.`, true);
  initializeStatusFile(projectName, modules, services);
  const {
    aws_region: region,
    aws_access_key_id: awsAccessKey,
    aws_secret_access_key: awsSecretKey,
    environment: environment,
  } = projectConfig;
  const accountId = await AWSAccount.getAccountId(
    awsAccessKey,
    awsSecretKey,
    region
  );
  SystemConfig.getInstance().mergeConfigs({ accountId: accountId });
  if (terraform) {
    await terraform.createProject(projectName, process.cwd());
    if (responses["cloud_provider"] === "aws") {
      await terraform.AWSProfileActivate(responses["aws_profile"]);
    }
    await new Promise((resolve) => setTimeout(resolve, 15000));
    await terraform?.runTerraformInit(
      process.cwd() + "/" + projectName + "/infrastructure",
      `${responses["environment"]}-config.tfvars`,
      projectName
    );
    const modules: any =
      projectConfig.template === "eks-fargate-vpc"
        ? eksFargateVpcModules
        : projectConfig.template === "eks-nodegroup-vpc"
        ? eksNodegroupVpcModules
        : projectConfig.template === "rds-vpc"
        ? rdsVpcModules
        : projectConfig.template === "ec2-vpc"
        ? ec2VpcModules
        : projectConfig.template === "vpc-rds-nodegroup-acm-ingress"
        ? vpceksNodegroupIngressModules
        : undefined;
    let allModulesAppliedSuccessfully = true;
    for (const module of modules) {
      const moduleName = "";
      try {
       
        updateStatusFile(projectName, "terraform-apply", "fail");
        AppLogger.info(`Starting Terraform apply for module: ${module}`, true);
        if (
          projectConfig.template == "ec2-vpc" ||
          projectConfig.template === "rds-vpc"
        ) {
          await executeCommandWithRetry(
            "terraform apply -auto-approve",
            { cwd: `${process.cwd()}/${projectName}/infrastructure` },
            1
          );
          updateStatusFile(projectName, "terraform-apply", "success");
          AppLogger.info(
            `Starting Terraform apply for module: ${module}`,
            true
          );
        } else {
          await terraform?.runTerraformApply(
            process.cwd() + "/" + projectName + "/infrastructure",
            module,
            moduleName,
            "terraform.tfvars"
          );
        }
        AppLogger.debug(
          `Successfully applied Terraform for module: ${module}`,
          true
        );
        updateStatusFile(projectName, module, "success");
      } catch (error) {
        AppLogger.error(`Error applying Terraform for module: ${error}`, true);
        allModulesAppliedSuccessfully = false;
        updateStatusFile(projectName, "terraform-apply", "fail");
      }
    }
    if (allModulesAppliedSuccessfully) {
      updateStatusFile(projectName, "terraform-apply", "success");
    } else {
      updateStatusFile(projectName, "terraform-apply", "fail");
    }
  }
}
