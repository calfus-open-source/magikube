import { Command, Flags } from '@oclif/core';
import { prompt } from '@oclif/core/lib/cli-ux/prompt.js';
import BuildMasterServer from './master.js';
import BuildWorkerServer from './worker.js';

export default class BuildCluster extends Command {
  static description = 'Build a new cluster with the basic setup files';

  static flags = {
    help: Flags.help({ char: 'h' }),
  };

  async run() {
    const buildServer = await prompt('Do you really want to build a master server? (yes/no) ');

    if (buildServer.toLowerCase() === 'yes') {
      await new BuildMasterServer([], this.config).run();
      await new BuildWorkerServer([], this.config).run();
    } else {
      console.log("The basic server can be provisioned too!")
    }
  }
}
