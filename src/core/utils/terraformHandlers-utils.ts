import { updateStatusFile } from "./statusUpdater-utils.js"; // Adjust the import path as necessary
import { execSync } from "child_process";
import { services, modules } from "../../core/constants/constants.js";
import { AppLogger } from "../../logger/appLogger.js";
import { ManageRepository } from "../manage-repository.js";
import { playbooks } from "../../core/constants/constants.js";

export const handleEKS = async (
  projectName: string,
  responses: any,
  terraform: any,
  setupGitopsServiceStatus: any,
  configObject: any
) => {
  await new Promise((resolve) => setTimeout(resolve, 15000));
  await terraform?.runTerraformInit(
    process.cwd() + "/" + projectName + "/infrastructure",
    `${responses["environment"]}-config.tfvars`,
    projectName
  );
  let allModulesAppliedSuccessfully = true;

  for (const module of modules) {
    try {
      updateStatusFile(projectName, module, "fail");
      updateStatusFile(projectName, "terraform-apply", "fail");
      AppLogger.info(`Starting Terraform apply for module: ${module}`, true);
      await terraform?.runTerraformApply(
        process.cwd() + "/" + projectName + "/infrastructure",
        module,
        "terraform.tfvars"
      );
      AppLogger.debug(`Successfully applied Terraform for module: ${module}`);
      updateStatusFile(projectName, module, "success");
    } catch (error) {
      AppLogger.error(
        `Error applying Terraform for module: ${module}, ${error}`,
        true
      );
      allModulesAppliedSuccessfully = false;
      updateStatusFile(projectName, module, "fail");
      updateStatusFile(projectName, "terraform-apply", "fail");
    }
  }

  if (setupGitopsServiceStatus) {
    configObject.appName = `${responses.environment}`;
    configObject.appType = "gitops";
    await ManageRepository.pushCode(configObject);
  }

  if (allModulesAppliedSuccessfully) {
    updateStatusFile(projectName, "terraform-apply", "success");
  } else {
    updateStatusFile(projectName, "terraform-apply", "fail");
  }
};

export const handleK8s = async (
  projectName: string,
  responses: any,
  terraform: any,
  setupGitopsServiceStatus: any,
  configObject: any
) => {
  await new Promise((resolve) => setTimeout(resolve, 20000));
  await terraform?.runTerraformInit(
    process.cwd() + "/" + projectName + "/infrastructure",
    `${responses["environment"]}-config.tfvars`,
    projectName
  );
  await terraform?.runTerraformApply(
    process.cwd() + "/" + projectName + "/infrastructure"
  );

  try {
    AppLogger.info("AWS export command executing... ", true);
    execSync(`export AWS_PROFILE=${responses.aws_profile}`, {
      cwd: `${process.cwd()}/${projectName}/templates/aws/ansible/environments`,
      stdio: "inherit",
    });
    AppLogger.info("AWS export command executed.", true);
  } catch (error) {
    AppLogger.error("AWS export command NOT executed", true);
  }

  if (setupGitopsServiceStatus) {
    configObject.appName = `${responses.environment}`;
    configObject.appType = "gitops";
    await ManageRepository.pushCode(configObject);
  }

  terraform?.startSSHProcess();
  const projectPath = `${process.cwd()}/${projectName}`;
  for (const playbook of playbooks) {
    await terraform?.runAnsiblePlaybook(playbook, projectPath);
  }

  const masterIP = await terraform?.getMasterIp(
    process.cwd() + "/" + projectName + "/infrastructure"
  );
  await terraform?.editKubeConfigFile(
    process.cwd() +
      "/" +
      projectName +
      "/templates/aws/ansible/config/" +
      masterIP +
      "/etc/kubernetes/admin.conf"
  );
  terraform?.stopSSHProcess();
};
