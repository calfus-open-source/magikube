import CreateProject from "./commands/new/index.js";
import DestroyProject from "./commands/destroy/index.js"; 
import RestartProject from "./commands/restart/index.js";  
import CustomTemplatesProject from "./commands/subCommands/customTemplates-command/index.js";
import NewModule from "./commands/subCommands/submodule-command/index.js";

export const COMMANDS = {
  new: CreateProject,
  destroy: DestroyProject,
  restart: RestartProject,
  new_sub: CustomTemplatesProject,
  new_module: NewModule,
};