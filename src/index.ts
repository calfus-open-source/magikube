import CreateProject from "./commands/new/index.js";
import DestroyProject from "./commands/destroy/index.js";
import CreateCluster from "./commands/new/cluster.js";
import CreateService from "./commands/new/service.js";
import DestroyCluster from "./commands/destroy/cluster.js";
import DestroyService from "./commands/destroy/service.js";

export const COMMANDS = {
  new: CreateProject,
  'new:cluster': CreateCluster,
  'new:service': CreateService,
  destroy: DestroyProject,
  'destroy:cluster': DestroyCluster,
  'destroy:service': DestroyService,
};
