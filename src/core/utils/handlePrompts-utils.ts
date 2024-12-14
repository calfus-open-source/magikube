import inquirer, { Answers } from "inquirer";
import CredentialsPrompts from "../../prompts/credentials-prompts.js";
import PromptGenerator from "../../prompts/prompt-generator.js";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";

export async function handlePrompts(
  args: any,
  commandName?: any,
  template?: string,
  moduleType?: string
): Promise<Answers> {
  let responses: any =
    template === undefined
      ? {
          project_name: args.name,
          project_id: uuidv4(),
        }
      : undefined;
  const promptGenerator = new PromptGenerator();
  const credentialsPrompts = new CredentialsPrompts();
  if (commandName === "new_template") {
    if (commandName === "new_template" && template == undefined) {
      for (const prompt of promptGenerator.getCloudProvider()) {
        const resp = await inquirer.prompt(prompt);
        responses = { ...responses, ...resp };
      }

      for (const regionPrompt of promptGenerator.getRegion()) {
        const regionResp = await inquirer.prompt(regionPrompt);
        responses = { ...responses, ...regionResp };
      }

      for (const regionPrompt of promptGenerator.getAwsProfile()) {
        const regionResp = await inquirer.prompt(regionPrompt);
        responses = { ...responses, ...regionResp };
      }

      const credentialPrompts = credentialsPrompts.getCredentialsPrompts(
        responses["cloud_provider"],
        responses
      );
      if (credentialPrompts.length > 0) {
        for (const prompt of credentialPrompts) {
          const credentialResp = await inquirer.prompt(prompt);
          responses = { ...responses, ...credentialResp };
        }
        credentialsPrompts.saveCredentials(responses);
      }

      for (const envPrompt of promptGenerator.getEnvironment()) {
        const envResp = await inquirer.prompt(envPrompt);
        responses = { ...responses, ...envResp };
      }
    }

    if (
      commandName === "new_template" &&
      template == "vpc-rds-nodegroup-acm-ingress"
    ) {
      for (const domainPrompt of promptGenerator.getDomainPrompt()) {
        const domainResp = await inquirer.prompt(domainPrompt);
        responses = { ...responses, ...domainResp };
      }
    }
  } else if (commandName === "new_module") {
    if (moduleType === "vpc") {
      for (const cidrPrompt of promptGenerator.getCIDRPrompt()) {
        const cidrResp = await inquirer.prompt(cidrPrompt);
        responses = { ...responses, ...cidrResp };
      }
    }
    if (moduleType === "rds") {
      const project_config = JSON.parse(
        fs.readFileSync(path.join(path.resolve(args), ".magikube"), "utf-8")
      );
      const vpcArray = project_config.moduleName;
      if (
        !vpcArray ||
        vpcArray.length === 0 ||
        vpcArray.every((vpc: any) => vpc === null)
      ) {
        console.error(
          "Error: No valid VPCs found. Please configure VPCs before proceeding with the RDS module."
        );
        process.exit(1);
      }
      for (const vpcPrompt of promptGenerator.getVPCPrompt(vpcArray)) {
        const vpcResp = await inquirer.prompt(vpcPrompt);
        responses = { ...responses, ...vpcResp };
      }
    }

  } else if (commandName === "new") {
    // Continue with the full set of prompts as in the original code
    for (const prompt of promptGenerator.getCloudProvider()) {
      const resp = await inquirer.prompt(prompt);
      responses = { ...responses, ...resp };

      for (const cloudPrompt of promptGenerator.getCloudProviderPrompts(
        resp["cloud_provider"]
      )) {
        const cloudResp = await inquirer.prompt(cloudPrompt);
        responses = { ...responses, ...cloudResp };
      }

      const credentialPrompts = credentialsPrompts.getCredentialsPrompts(
        resp["cloud_provider"],
        responses
      );
      if (credentialPrompts.length > 0) {
        for (const prompt of credentialPrompts) {
          const credentialResp = await inquirer.prompt(prompt);
          responses = { ...responses, ...credentialResp };
        }
        credentialsPrompts.saveCredentials(responses);
      }

      for (const vcPrompt of promptGenerator.getVersionControlPrompts(
        responses["source_code_repository"]
      )) {
        const vcResp = await inquirer.prompt(vcPrompt);
        responses = { ...responses, ...vcResp };
      }

      for (const envPrompt of promptGenerator.getEnvironment()) {
        const envResp = await inquirer.prompt(envPrompt);
        responses = { ...responses, ...envResp };

        for (const lifecyclePrompt of promptGenerator.getLifecycles(
          envResp["environment"]
        )) {
          const lifecycleResp = await inquirer.prompt(lifecyclePrompt);
          responses = { ...responses, ...lifecycleResp };
        }
      }

      for (const domainPrompt of promptGenerator.getDomainPrompt()) {
        const domainResp = await inquirer.prompt(domainPrompt);
        responses = { ...responses, ...domainResp };
      }
    }

    for (const frontendPrompt of promptGenerator.getFrontendApplicationType()) {
      const frontendResp = await inquirer.prompt(frontendPrompt);
      responses = { ...responses, ...frontendResp };
    }

    for (const backendPrompt of promptGenerator.getBackendApplicationType()) {
      const backendResp = await inquirer.prompt(backendPrompt);
      responses = { ...responses, ...backendResp };
    }
  }
  return responses;
}
