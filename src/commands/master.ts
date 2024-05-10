import {Args, Command, Flags} from '@oclif/core'
import { prompt } from '@oclif/core/lib/cli-ux/prompt.js';

export default class BuildMasterServer extends Command {
  static description = 'Build a master server';

  async run() {
    const specs = await this.getSpecs();
    this.log('Building master server with specs:', specs);
    // Add logic to build master server
  }

  async getSpecs() {
    const cpu = await prompt('Enter CPU cores: ');
    const memory = await prompt('Enter memory (in GB): ');
    const storage = await prompt('Enter storage (in GB): ');

    return { cpu, memory, storage };
  }
}
