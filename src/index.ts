import CreateProject from "./commands/new/index.js";
import DestroyProject from "./commands/destroy/index.js";

export const COMMANDS = {
  new: CreateProject,
  destroy: DestroyProject,
};
