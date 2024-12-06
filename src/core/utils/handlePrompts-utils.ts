import inquirer, { Answers } from "inquirer";
import CredentialsPrompts from "../../prompts/credentials-prompts.js";
import PromptGenerator from "../../prompts/prompt-generator.js";
import { v4 as uuidv4 } from "uuid";

export async function handlePrompts(args: any, flags: any, commandName?: any, moduleType?: any): Promise<Answers> {
  let responses: Answers = {
    project_name: args.name,
    project_id: uuidv4(),
  };
  const promptGenerator = new PromptGenerator();
  const credentialsPrompts = new CredentialsPrompts();
  if (commandName === "new_sub") { // it is for the templating or -t command scenario
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
    
    const credentialPrompts = credentialsPrompts.getCredentialsPrompts(responses["cloud_provider"], responses );
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
  else if(commandName === "new_module"){ // it is for the individual module scenario
    if(moduleType === "vpc"){
      for (const cidrPrompt of promptGenerator.getCIDRPrompt()) {
        const cidrResp = await inquirer.prompt(cidrPrompt);
        responses = { ...responses, ...cidrResp };
      }
    }
    else if(moduleType === "rds"){

    }
    else if(moduleType === "acm"){

    }
    else{

    }
  } 
  else {
      // Continue with the full set of prompts as in the original code
      for (const prompt of promptGenerator.getCloudProvider()) {
        const resp = await inquirer.prompt(prompt);
        responses = { ...responses, ...resp };

        for (const cloudPrompt of promptGenerator.getCloudProviderPrompts(resp["cloud_provider"])) {
          const cloudResp = await inquirer.prompt(cloudPrompt);
          responses = { ...responses, ...cloudResp };
        }

        const credentialPrompts = credentialsPrompts.getCredentialsPrompts(resp["cloud_provider"], responses);
        if (credentialPrompts.length > 0) {
          for (const prompt of credentialPrompts) {
            const credentialResp = await inquirer.prompt(prompt);
            responses = { ...responses, ...credentialResp };
          }
          credentialsPrompts.saveCredentials(responses);
        }

        for (const vcPrompt of promptGenerator.getVersionControlPrompts(responses["source_code_repository"])) {
          const vcResp = await inquirer.prompt(vcPrompt);
          responses = { ...responses, ...vcResp };
        }

        for (const envPrompt of promptGenerator.getEnvironment()) {
          const envResp = await inquirer.prompt(envPrompt);
          responses = { ...responses, ...envResp };

          for (const lifecyclePrompt of promptGenerator.getLifecycles(envResp["environment"])) {
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
