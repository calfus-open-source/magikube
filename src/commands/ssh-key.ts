import {Args, Command, Flags} from '@oclif/core'
import inquirer from 'inquirer';

// Function to get user input
async function get() {
  const userInput = await inquirer.prompt([
      {
          type: 'input',
          name: 'ssh_key_name',
          message: 'Enter SSH Key name:',
      },
      {
          type: 'input',
          name: 'env_files_bucket_name',
          message: 'Enter environment files bucket name:',
      },
      // Add more prompts as needed for other variables
  ]);
  return userInput;
}

export default class SshKey extends Command {
  static override args = {
    file: Args.string({description: 'file to read'}),
  }

  static override description = 'SSH Key is generated throught this command'

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
  ]

  static override flags = {
    // flag with no value (-f, --force)
    force: Flags.boolean({char: 'f'}),
    // flag with a value (-n, --name=VALUE)
    name: Flags.string({char: 'n', description: 'name to print'}),
  }

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(SshKey)

    const name = flags.name ?? 'world'
    this.log(`hello ${name} from /Users/neelshah/Desktop/CalfusIaS/infrastructure/src/commands/ssh-key.ts`)
    if (args.file && flags.force) {
      this.log(`you input --force and --file: ${args.file}`)
    }
  }
}
