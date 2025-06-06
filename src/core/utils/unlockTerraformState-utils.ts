import * as fs from 'fs';
import path from 'path';
import { executeCommandWithRetry } from './executeCommandWithRetry-utils.js';
import { execSync } from 'child_process';
import { AppLogger } from '../../logger/appLogger.js';
 
export async function runTerraformUnlockCommands(projectPath:string, project_config:any ) {
  try {
    const infrastructurePath = path.join(projectPath, 'infrastructure');
    const terraformStateFile = path.join(infrastructurePath, '.terraform', 'terraform.tfstate');
    // Check if the Terraform state file exists and read it
    if (fs.existsSync(terraformStateFile)) {
      const terraformState = JSON.parse(fs.readFileSync(terraformStateFile, 'utf-8'));
      const dynamodbTable = terraformState.backend.config.dynamodb_table;
      // Export AWS_PROFILE
      await executeCommandWithRetry(`export AWS_PROFILE=${project_config.awsProfile}`, { cwd: infrastructurePath }, 1);
      await executeCommandWithRetry(`terraform init -backend-config=${project_config.environment}-config.tfvars`, { cwd: infrastructurePath }, 1);
      // Fetch Lock ID from DynamoDB
      const lockIdCommand = `aws dynamodb scan --table-name ${dynamodbTable} --filter-expression "attribute_exists(LockID)" --region ${terraformState.backend.config.region} | jq -r '.Items[] | select(.Info.S != null) | .Info.S | fromjson | .ID'`;
      const lockId = execSync(lockIdCommand, { cwd: projectPath, stdio: 'pipe' }).toString().trim();
      if (lockId) {
        // Initialize Terraform and force unlock
        await executeCommandWithRetry(`terraform force-unlock ${lockId}`, { cwd: infrastructurePath }, 1);
      } 
    } else {
      throw new Error(`Terraform state file not found: ${terraformStateFile}`);
    }
  } catch (error) {
    AppLogger.error(`Error running Terraform unlock commands:${error}`, true);
    throw error;
  }
}