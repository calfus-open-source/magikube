import fs from 'fs';
import { join } from 'path';

export function dotMagikubeConfig(name: any, path: string) {
  const projectPath = join(path);
  const projectConfigFile = join(projectPath, name, '.magikube');
  if (fs.existsSync(projectConfigFile)) {
    return JSON.parse(fs.readFileSync(projectConfigFile).toString());
  }

  return null;
}
