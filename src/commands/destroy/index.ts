// import {Args, Flags} from '@oclif/core';
// import BaseCommand from '../base.js';
// import TerraformProject from '../../core/terraform-project.js';
// import SystemConfig from '../../config/system.js';
// import * as fs from 'fs';
// import path from 'path';
// import { AppLogger } from '../../logger/appLogger.js';
// import { executeCommandWithRetry } from '../../core/common-functions/execCommands.js';
// import { execSync } from 'child_process';
// import { readStatusFile } from '../../core/utils/statusUpdater-utils.js';
// import { readProjectConfig } from '../../core/utils/magikubeConfigreader.js';

// export default class DestroyProject extends BaseCommand {  
//   static args = {
//     name: Args.string({description: 'Project name to be destroyed', required: true}),
//   };

//   static flags = {
//     dryrun: Flags.boolean({char: 'd', description: 'Simulates execution of the command, showing what would happen without making any real changes to the system.'})
//   };

//   static description = 'Destroy magikube project';

//   static examples = [
//     `<%= config.bin %> <%= command.id %> sample 
// Destroying magikube project named 'sample' in the current directory`,
//   ];

//   async readTerraformState(projectPath: string): Promise<any> {
//     const terraformStateFile = path.join(projectPath, 'infrastructure', '.terraform', 'terraform.tfstate');
//     if (fs.existsSync(terraformStateFile)) {
//       return JSON.parse(fs.readFileSync(terraformStateFile, 'utf-8'));
//     } else {
//       console.error(`Terraform state file not found: ${terraformStateFile}`);
//       return null;
//     }
//   }

//   async run(): Promise<void> {
//     const {args, flags} = await this.parse(DestroyProject);
//     const projectPath = path.join(process.cwd(), args.name);
//     const infrastructurePath = path.join(projectPath, 'infrastructure');
//     AppLogger.configureLogger(args.name, false);
//     const responses = readProjectConfig(args.name, process.cwd())
//     const readFile = readStatusFile(args.name);
//     console.log(readFile, "<<<<<<<<readfile")
//     console.log(readFile.services["terraform-apply"],"+++++++++++++")
//     const res = await this.readTerraformState(projectPath);
//     if (!res) return;
//     const dynamodbTable = res.backend.config.dynamodb_table;
//     responses.dryrun = flags.dryrun || false;

//     AppLogger.debug(`Destroying magikube project named '${args.name}' in the current directory`);
//     SystemConfig.getInstance().mergeConfigs(responses);
//     AppLogger.debug(`Config: ${JSON.stringify(SystemConfig.getInstance().getConfig(), null, 4)}`);

//     const terraform = await TerraformProject.getProject(this);
//     if (terraform && responses.cloud_provider === 'aws') {
//       if (readFile.services["terraform-apply"] === "pending" || readFile.services["terraform-apply"] === "fail") {
//         // Export AWS_PROFILE
//         await executeCommandWithRetry(`export AWS_PROFILE=${responses.aws_profile}`, { cwd: infrastructurePath }, 1);

//         // Fetch Lock ID from DynamoDB
//         const lockIdCommand = `aws dynamodb scan --table-name ${dynamodbTable} --filter-expression "attribute_exists(LockID)" --region ${responses.aws_region} | jq -r '.Items[] | select(.Info.S != null) | .Info.S | fromjson | .ID'`;
//         console.log(lockIdCommand)
//         const lockId = execSync(lockIdCommand, { cwd: projectPath, stdio: 'pipe' }).toString().trim();
//         console.log(lockId, "lockId")
//         if (lockId) {
//           // Initialize Terraform and force unlock
//           await executeCommandWithRetry(`terraform init -backend-config=non-prod-config.tfvars`, { cwd: infrastructurePath }, 1);
//           await executeCommandWithRetry(`terraform force-unlock ${lockId}`, { cwd: infrastructurePath }, 1);
//         } else {
//           console.error();
//           AppLogger.error('Failed to retrieve Lock ID from DynamoDB.', true)
//           return;
//         }

//         // Activate AWS profile if required
//         await terraform.AWSProfileActivate(responses.aws_profile);
//       }
//       // Destroy the project
//       // await terraform.AWSProfileActivate(responses.aws_profile);
//       await terraform.destroyProject(args.name, process.cwd());
//     } else {
//       AppLogger.error('Terraform project initialization failed or unsupported cloud provider.',true)
//     }
//   }
// }


import { Args, Flags } from '@oclif/core';
import BaseCommand from '../base.js';
import TerraformProject from '../../core/terraform-project.js';
import SystemConfig from '../../config/system.js';
import { AppLogger } from '../../logger/appLogger.js';
import { readStatusFile } from '../../core/utils/statusUpdater-utils.js';
import { readProjectConfig } from '../../core/utils/magikubeConfigreader.js';
import { runTerraformUnlockCommands } from '../../core/utils/unlockTerraformState-utils.js';
import path from 'path';


export default class DestroyProject extends BaseCommand {  
  static args = {
    name: Args.string({ description: 'Project name to be destroyed', required: true }),
  };

  static flags = {
    dryrun: Flags.boolean({ char: 'd', description: 'Simulates execution of the command, showing what would happen without making any real changes to the system.' })
  };

  static description = 'Destroy magikube project';

  static examples = [
    `<%= config.bin %> <%= command.id %> sample 
Destroying magikube project named 'sample' in the current directory`,
  ];

  async run(): Promise<void> {
    const { args, flags } = await this.parse(DestroyProject);
    const projectPath = path.join(process.cwd(), args.name);
    AppLogger.configureLogger(args.name, false);
    const responses = readProjectConfig(args.name, process.cwd());
    const readFile = readStatusFile(args.name);
    console.log(readFile, "<<<<<<<<readfile");
    console.log(readFile.services["terraform-apply"], "+++++++++++++");

    responses.dryrun = flags.dryrun || false;
    AppLogger.debug(`Destroying magikube project named '${args.name}' in the current directory`);
    SystemConfig.getInstance().mergeConfigs(responses);
    AppLogger.debug(`Config: ${JSON.stringify(SystemConfig.getInstance().getConfig(), null, 4)}`);

    const terraform = await TerraformProject.getProject(this);
    if (terraform && responses.cloud_provider === 'aws') {
      if (readFile.services["terraform-apply"] === "pending" || readFile.services["terraform-apply"] === "fail") {
        // Use the common function to unlock Terraform
        await runTerraformUnlockCommands(projectPath, responses.aws_profile);
      }

      // Destroy the project
      await terraform.destroyProject(args.name, process.cwd());
    } else {
      AppLogger.error('Terraform project initialization failed or unsupported cloud provider.', true);
    }
  }
}

