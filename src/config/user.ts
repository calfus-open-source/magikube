import fs from 'fs';
import { ProjectConfig } from '../core/interface.js';

class UserConfig {
  private config: ProjectConfig = {};

  load(path: string): void {
    //load JSON from system.json form the path into this.config
    const data = fs.readFileSync(path, 'utf8');
    this.config = JSON.parse(data);
  }

  getConfig(): ProjectConfig {
    return this.config;
  }

  exists(path: string): boolean {
    return fs.existsSync(path);
  }
}

export default UserConfig;
