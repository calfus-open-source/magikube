import * as fs from 'fs';
import path from 'path';
import { executeCommandWithRetry } from '../common-functions/execCommands.js';
import { execSync } from 'child_process';
 
export async function runTerraformUnlockCommands(projectPath:string, awsProfile:string) {
  try {
    const infrastructurePath = path.join(projectPath, 'infrastructure');
    const terraformStateFile = path.join(infrastructurePath, '.terraform', 'terraform.tfstate');
    console.log(fs.existsSync(terraformStateFile))
    console.log(fs.existsSync(infrastructurePath))
    // Check if the Terraform state file exists and read it
    if (fs.existsSync(terraformStateFile)) {
      const terraformState = JSON.parse(fs.readFileSync(terraformStateFile, 'utf-8'));
      console.log(terraformState,"<<<<<<<<terraformState")
      const dynamodbTable = terraformState.backend.config.dynamodb_table;
 
      // Export AWS_PROFILE
      console.log(awsProfile )
      await executeCommandWithRetry(`export AWS_PROFILE=${awsProfile}`, { cwd: infrastructurePath }, 1);
      await executeCommandWithRetry(`terraform init -backend-config=non-prod-config.tfvars`, { cwd: infrastructurePath }, 1);
      // Fetch Lock ID from DynamoDB
      const lockIdCommand = `aws dynamodb scan --table-name ${dynamodbTable} --filter-expression "attribute_exists(LockID)" --region ${terraformState.backend.config.region} | jq -r '.Items[] | select(.Info.S != null) | .Info.S | fromjson | .ID'`;
      console.log(lockIdCommand);
      const lockId = execSync(lockIdCommand, { cwd: projectPath, stdio: 'pipe' }).toString().trim();
      console.log(lockId, "<<<<<,lockId");
      if (lockId) {
        // Initialize Terraform and force unlock
        await executeCommandWithRetry(`terraform force-unlock ${lockId}`, { cwd: infrastructurePath }, 1);
      } else {
        throw new Error('Failed to retrieve Lock ID from DynamoDB.');
      }
    } else {
      throw new Error(`Terraform state file not found: ${terraformStateFile}`);
    }
  } catch (error) {
    console.error('Error running Terraform unlock commands:', error);
    throw error;
  }
}