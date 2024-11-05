import CreateProject from "./commands/new/index.js";
import DestroyProject from "./commands/destroy/index.js";
import RestartProject from "./commands/restart/index.js";
import NewModule from "./commands/subcommands/index.js"; // Import the NewModule command

export const COMMANDS = {
  new: CreateProject,
  destroy: DestroyProject,
  restart: RestartProject,
  newModule: NewModule,  // Add NewModule to the COMMANDS object
};
