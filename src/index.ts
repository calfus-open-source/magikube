import CreateProject from "./commands/new/index.js";  // Regular project creation command
import DestroyProject from "./commands/destroy/index.js";  // Command to destroy a project
import RestartProject from "./commands/restart/index.js";  // Command to restart a project
import CreateEmptyProject from "./commands/subCommands/customTemplates-command/index.js";


export const COMMANDS = {
  new: CreateProject,  
  createEmpty: CreateEmptyProject,  
  destroy: DestroyProject,
  restart: RestartProject, 
};