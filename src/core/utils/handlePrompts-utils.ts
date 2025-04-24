import inquirer, { Answers } from "inquirer";
import CredentialsPrompts from "../../prompts/credentials-prompts.js";
import PromptGenerator from "../../prompts/prompt-generator.js";
import { v4 as uuidv4 } from "uuid";
import path, { join } from "path";
import fs from "fs";
import { AppLogger } from "../../logger/appLogger.js";
import { dotMagikubeConfig } from "./projectConfigReader-utils.js";

export async function handlePrompts(
  args: any,
  commandName?: any,
  template?: any,
  moduleType?: string,
  serviceName?:string
): Promise<Answers> {
  let responses: any =
    commandName === "module" || commandName === "create"
      ? ""
      : {
          project_name: args.name,
          project_id: uuidv4(),
          template: template,
        };
  const promptGenerator = new PromptGenerator();
  const projectConfigFile = path.join(
    process.cwd(),
    commandName === "module" || commandName === "create"
      ? ""
      : responses.project_name,
    ".magikube"
  );
  let project_config;
  if (fs.existsSync(projectConfigFile)) {
    project_config = JSON.parse(fs.readFileSync(projectConfigFile).toString());
  }
  const credentialsPrompts = new CredentialsPrompts();
  if (commandName === "new") {
    if (commandName === "new" && template === "empty") {
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
    if (commandName === "new" && template === "vpc-rds-nodegroup-acm-ingress") {
      for (const domainPrompt of promptGenerator.getDomainPrompt()) {
        const domainResp = await inquirer.prompt(domainPrompt);
        responses = { ...responses, ...domainResp };
      }
    }
  }
  if (commandName === "module") {
    if (moduleType === "vpc") {
      
      for (const cidrPrompt of promptGenerator.getCIDRPrompt()) {
        const cidrResp = await inquirer.prompt(cidrPrompt);
        responses = { ...responses, ...cidrResp };
      }
    } else if (moduleType === "rds") {
      const vpcArray = project_config.moduleName;
      if (
        !vpcArray ||
        vpcArray.length === 0 ||
        vpcArray.every((vpc: any) => vpc === null)
      ) {
        AppLogger.error("Error: No valid VPCs found. Please configure VPCs before proceeding with the RDS module.", true);
        process.exit(1);
      }
      for (const vpcPrompt of promptGenerator.getVPCPrompt(vpcArray)) {
        const vpcResp = await inquirer.prompt(vpcPrompt);
        responses = { ...responses, ...vpcResp };
      }
    } else if (moduleType === "acm") {
      for (const domainPrompt of promptGenerator.getDomainPrompt()) {
        const domainResp = await inquirer.prompt(domainPrompt);
        responses = { ...responses, ...domainResp };
      }
    }
  } 
  if (commandName === "new" && responses.template === undefined) {
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

    for (const genAIPrompt of promptGenerator.getgenAIApplication()) {
      const genAIResp = await inquirer.prompt(genAIPrompt);
      responses = { ...responses, ...genAIResp };
    }
  }
  if (commandName === "create"){
     const resp = dotMagikubeConfig("", process.cwd());
       for (const microServicePrompts of promptGenerator.getMicroService()) {
         const microServiceResp = await inquirer.prompt(microServicePrompts);
         responses = { ...responses, ...microServiceResp };
       }
    if (responses.service_type === "frontend-service") {
      for (const frontendPrompt of promptGenerator.getFrontendApplicationType()) {
        const frontendResp = await inquirer.prompt(frontendPrompt);
        responses = { ...responses, ...frontendResp };
      }
    }
    if (responses.service_type === "backend-service") {
      for (const backendPrompt of promptGenerator.getBackendApplicationType()) {
        const backendResp = await inquirer.prompt(backendPrompt);
        responses = { ...responses, ...backendResp };
      }
    }
    if (responses.service_type === "gen-ai-service") {
      for (const genAIPrompt of promptGenerator.getgenAIApplication()) {
        const genAIResp = await inquirer.prompt(genAIPrompt);
        responses = { ...responses, ...genAIResp };
      }
    }
    if (!resp.services || resp.services.length === 0) {
      for (const regionPrompt of promptGenerator.getSourceCodeRepositories()) {
        const sourceCodeRepoResp = await inquirer.prompt(regionPrompt);
        responses = { ...responses, ...sourceCodeRepoResp };
      }

      for (const vcPrompt of promptGenerator.getVersionControlPrompts(
        responses["source_code_repository"]
      )) {
        const vcResp = await inquirer.prompt(vcPrompt);
        responses = { ...responses, ...vcResp };
      }
    }  
    
  }
   return responses;
}
