import { AppLogger } from '../../logger/appLogger.js';
import { executeCommandWithRetry } from './executeCommandWithRetry-utils.js';
import { deleteArrayProperty } from './updateDotMagikube-utils.js';

export async function deleteMicroservice(resp: any, createdServiceResp: any) {
  try {
    const repoName = `${resp.project_name}-${createdServiceResp.service_Name}-app`;
    const team = `${createdServiceResp.service_Name}-team`;
    AppLogger.info(`Starting deletion process for ${repoName}...`, true);

    // Step 1: Remove the repository from the team
    const deleteTeamCommand = `curl -X DELETE \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${resp.github_access_token}" \
            -H "X-GitHub-Api-Version: 2022-11-28" \
            "https://api.github.com/orgs/${resp.github_owner}/teams/${team}/repos/${resp.github_owner}/${repoName}"`;

    AppLogger.info(
      `Removing team association: ${team} from repo: ${repoName}`,
      true,
    );
    await executeCommandWithRetry(deleteTeamCommand, { cwd: process.cwd() }, 1);
    AppLogger.info(`Team ${team} removed from ${repoName}.`, true);

    // Step 2: Delete the repository
    const deleteRepoCommand = `curl -X DELETE \
            -H "Accept: application/vnd.github+json" \
            -H "Authorization: Bearer ${resp.github_access_token}" \
            -H "X-GitHub-Api-Version: 2022-11-28" \
            "https://api.github.com/repos/${resp.github_owner}/${repoName}"`;

    AppLogger.info(`Deleting repository: ${repoName}`, true);
    await executeCommandWithRetry(deleteRepoCommand, { cwd: process.cwd() }, 1);
    AppLogger.info(`Repository ${repoName} deleted successfully.`, true);
    deleteArrayProperty(resp.service_names, createdServiceResp.service_Name);
    return resp;
  } catch (error) {
    AppLogger.error(
      `An error occurred while deleting ${createdServiceResp.service_Name} service: ${error}`,
      true,
    );
  }
}
