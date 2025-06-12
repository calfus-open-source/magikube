import CreateProject from "./commands/new/index.js";
import DestroyProject from "./commands/destroy/index.js"; 
import RestartProject from "./commands/restart/index.js";  
import NewModule from "./commands/subCommands/module-command/index.js";
import Microservice from "./commands/subCommands/service-command/index.js";

export const COMMANDS = {
  new: CreateProject,
  destroy: DestroyProject,
  resume: RestartProject,
  module: NewModule,
  create: Microservice,
};