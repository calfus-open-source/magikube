import fs from "fs";
import { join } from "path";

export function dotMagikubeConfig(name: any, path: string) {
  const projectPath = join(path);
  console.log(projectPath, "<<<<<<<projectPath");
  const projectConfigFile = join(projectPath, name, ".magikube");
  console.log(projectConfigFile, "<<<<<<projectConfigFile");
  if (fs.existsSync(projectConfigFile)) {
    return JSON.parse(fs.readFileSync(projectConfigFile).toString());
  }

  return null;
}
