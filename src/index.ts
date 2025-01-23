import CreateProject from "./commands/new/index.js";
import DestroyProject from "./commands/destroy/index.js"; 
import RestartProject from "./commands/restart/index.js";  
import NewModule from "./commands/subCommands/submodule-command/index.js";

export const COMMANDS = {
  new: CreateProject,
  destroy: DestroyProject,
  resume: RestartProject,
  module: NewModule,
};