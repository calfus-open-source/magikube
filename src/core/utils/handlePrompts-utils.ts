import inquirer, { Answers } from "inquirer";
import CredentialsPrompts from "../../prompts/credentials-prompts.js";
import PromptGenerator from "../../prompts/prompt-generator.js";
import { v4 as uuidv4 } from "uuid";

export async function handlePrompts(args: any, flags: any): Promise<Answers> {
  let responses: Answers = {
    project_name: args.name,
    project_id: uuidv4(),
    dryrun: flags.dryrun || false,
  };

  const promptGenerator = new PromptGenerator();
  const credentialsPrompts = new CredentialsPrompts();

  // Cloud Provider Prompt
  for (const prompt of promptGenerator.getCloudProvider()) {
    const resp = await inquirer.prompt(prompt);
    responses = { ...responses, ...resp };

    // Cloud Provider Specific Prompts
    for (const cloudPrompt of promptGenerator.getCloudProviderPrompts(resp["cloud_provider"])) {
      const cloudResp = await inquirer.prompt(cloudPrompt);
      responses = { ...responses, ...cloudResp };
    }

    // repositories Prompts
    for (const cloudPrompt of promptGenerator.getRepositories()) {
      const codeRepository = await inquirer.prompt(cloudPrompt);
      responses = { ...responses, ...codeRepository };
    }

    // Credentials Prompt
    const credentialPrompts = credentialsPrompts.getCredentialsPrompts(resp["cloud_provider"], responses);
    if (credentialPrompts.length > 0) {
      for (const prompt of credentialPrompts) {
        const credentialResp = await inquirer.prompt(prompt);
        responses = { ...responses, ...credentialResp };
      }
      credentialsPrompts.saveCredentials(responses);
    }

    // Version Control Prompts
    for (const vcPrompt of promptGenerator.getVersionControlPrompts(responses["source_code_repository"])) {
      const vcResp = await inquirer.prompt(vcPrompt);
      responses = { ...responses, ...vcResp };
    }

    // Environment Prompts
    for (const envPrompt of promptGenerator.getEnvironment()) {
      const envResp = await inquirer.prompt(envPrompt);
      responses = { ...responses, ...envResp };

      // Lifecycle Prompts
      for (const lifecyclePrompt of promptGenerator.getLifecycles(envResp["environment"])) {
        const lifecycleResp = await inquirer.prompt(lifecyclePrompt);
        responses = { ...responses, ...lifecycleResp };
      }
    }

    // Domain Prompt
    for (const domainPrompt of promptGenerator.getDomainPrompt()) {
      const domainResp = await inquirer.prompt(domainPrompt);
      responses = { ...responses, ...domainResp };
    }
  }

  // Frontend and Backend Prompts
  for (const frontendPrompt of promptGenerator.getFrontendApplicationType()) {
    const frontendResp = await inquirer.prompt(frontendPrompt);
    responses = { ...responses, ...frontendResp };
  }

  for (const backendPrompt of promptGenerator.getBackendApplicationType()) {
    const backendResp = await inquirer.prompt(backendPrompt);
    responses = { ...responses, ...backendResp };
  }

  return responses;
}
