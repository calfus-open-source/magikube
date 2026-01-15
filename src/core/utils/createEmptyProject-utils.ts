import { Answers } from 'inquirer';
import { AppLogger } from '../../logger/appLogger.js';
import { join } from 'path';
import fs from 'fs';

export async function createEmptyMagikubeProject(
  projectName: string,
  responses: Answers,
) {
  const projectPath = join(process.cwd(), projectName);
  createFolder(projectPath);
  const projectConfigFile = join(projectPath, '.magikube');
  AppLogger.debug(`Creating project '${projectName}' in the path`, true);
  fs.writeFileSync(projectConfigFile, JSON.stringify(responses, null, 4));
  AppLogger.info(
    `Created .magikube folder with configurations for empty project: ${projectName}`,
    true,
  );
}

function createFolder(projectPath: string) {
  if (fs.existsSync(projectPath)) {
    AppLogger.debug(`Folder '${projectPath}' already exists in the path`);
  } else {
    AppLogger.debug(`Creating folder '${projectPath}' in the path`);
    fs.mkdirSync(projectPath);
  }
}
