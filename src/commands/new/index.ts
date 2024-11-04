import { Args, Flags } from "@oclif/core";
import BaseCommand from "../base.js";
import { Answers } from "inquirer";
import TerraformProject from "../../core/terraform-project.js";
import SystemConfig from "../../config/system.js";
import { AppLogger } from "../../logger/appLogger.js";
import CreateApplication from "../../core/setup-application.js";
import { ConfigObject } from "../../core/interface.js";
import * as fs from "fs";
import { initializeStatusFile, readStatusFile } from "../../core/utils/statusUpdater-utils.js";
import AWSAccount from "../../core/aws/aws-account.js";
import { serviceHealthCheck } from "../../core/utils/healthCheck-utils.js";
import { handlePrompts } from "../../core/utils/handlePrompts-utils.js";
import { cloneAndCopyTemplates } from "../../core/utils/copyTemplates-utils.js";
import { getServices, modules } from "../../core/constants/constants.js";
import { handleEKS, handleK8s} from "../../core/utils/terraformHandlers-utils.js";
import { setupAndPushServices } from "../../core/utils/setupAndPushService-utils.js";
import path, { join } from "path";
import { Colours } from "../../prompts/constants.js";

function validateUserInput(input: string): void {
  const pattern = /^(?=.{3,8}$)(?!.*_$)[a-z][a-z0-9]*(?:_[a-z0-9]*)?$/;
  if (pattern.test(input)) {
    console.log("Input is valid.");
  } else {
    console.error(`\n \n  ${Colours.boldText}${Colours.redColor} ERROR: ${Colours.colorReset} Project Name "${Colours.boldText}${input}${Colours.colorReset}" is invalid. It must start with an alphabet, must include only lowercase alphabets, numbers, or underscores, length of string must be [3-8] and must not end with an underscore. \n \n`);
    process.exit(1);
  }
}

export default class CreateProject extends BaseCommand {
    static args = {
        name: Args.string({
            description: "Project name to be created",
            required: true,
        }),
    };

    static flags = {
        empty: Flags.boolean({
            char: "t",
            description: "Creates an empty project without any templates or services.",
        }),
    };

    static description = "Create a new magikube project";
    
    static examples = [
        `<%= config.bin %> <%= command.id %> sample`,
        `Creating a new magikube project named 'sample' in the current directory`,
        `<%= config.bin %> <%= command.id %> sample -t`,
        `Creating an empty magikube project named 'sample'`,
    ];

    async run(): Promise<void> {
        const { args, flags } = await this.parse(CreateProject);
        // Validate the project name
        validateUserInput(args.name);

        // Set up logger for the project
        AppLogger.configureLogger(args.name);
        AppLogger.info("Logger Started ...");

        // Check if the empty flag is set   
        if (flags.empty) {
            AppLogger.info("Creating an empty project...", true);
            const responses: Answers = await handlePrompts(args, flags)
            SystemConfig.getInstance().mergeConfigs(responses)   
            const projectConfig = SystemConfig.getInstance().getConfig();
            const projectFolderPath = path.join(process.cwd(), args.name)
            const projectConfigFile = join(`${process.cwd()}/${args.name}`, '.magikube');    
            AppLogger.debug(`Creating project '${args.name}' in the path`, true)
          if (!fs.existsSync(projectFolderPath)) {
              fs.mkdirSync(projectFolderPath, { recursive: true }); 
          }
              fs.writeFileSync(projectConfigFile, JSON.stringify(projectConfig, null, 4));
              process.exit(0); 
        }
       
      try {
        let responses: Answers = await handlePrompts(args, flags);
        await cloneAndCopyTemplates();
        AppLogger.debug(`Creating new magikube project named '${args.name}' in the current directory`)
        SystemConfig.getInstance().mergeConfigs(responses);

        // Get the project name from the command line arguments
        const projectName = args.name;
        const terraform = await TerraformProject.getProject(this);
        const projectConfig = SystemConfig.getInstance().getConfig();
        let command: BaseCommand | undefined;
        const createApp = new CreateApplication(command as BaseCommand, projectConfig)
        const services = getServices(responses["frontend_app_type"]);
        initializeStatusFile(projectName, modules, services);
        const status =  await readStatusFile(projectName)
        const {
          github_access_token: token,
          git_user_name: userName,
          github_owner: orgName,
          source_code_repository: sourceCodeRepo,
          aws_region: region,
          aws_access_key_id: awsAccessKey,
          aws_secret_access_key: awsSecretKey,
          environment: environment,
        } = projectConfig;

        const configObject: ConfigObject = {
          token,
          userName,
          orgName,
          sourceCodeRepo,
          region,
          projectName,
          awsAccessKey,
          awsSecretKey,
          environment,
        };
        const accountId = await AWSAccount.getAccountId(awsAccessKey, awsSecretKey, region);
        SystemConfig.getInstance().mergeConfigs({ accountId: accountId });
        
        
        const setupGitopsServiceStatus = await createApp.setupGitops( projectConfig);

        if (terraform) {
          await terraform.createProject(projectName, process.cwd());
          if (responses['cloud_provider'] === 'aws') {
            await terraform.AWSProfileActivate(responses['aws_profile']);
          }
          if (responses["cluster_type"] === "eks-fargate" || responses["cluster_type"] === "eks-nodegroup") {
          await handleEKS(projectName, responses, terraform, setupGitopsServiceStatus, configObject);
          }
          if (responses["cluster_type"] === "k8s") {
              await handleK8s(projectName, responses, terraform, setupGitopsServiceStatus, configObject);
          }
        
          await setupAndPushServices(status, projectConfig, configObject)
        }

        createApp.MoveFiles(projectName);
        
        await serviceHealthCheck(args, responses, projectConfig);
        process.exit(0);

      }catch (error) {
              AppLogger.error(`An error occurred during the setup process: ${error}`, true);
              process.exit(1);
          }
      }
  }
