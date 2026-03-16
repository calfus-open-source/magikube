import { AppLogger } from '../../logger/appLogger.js';

interface VpcEntry {
  name: string;
  cidr_blocks?: string[];
}

interface ModuleEntry {
  name: string;
}

export function updateProjectConfigArrays(
  config: { [key: string]: unknown },
  moduleType: string,
  moduleName: string,
  cidrBlock?: string,
) {
  const modules = (config.modules || {}) as Record<string, unknown>;
  config.modules = modules;

  // Handle VPC logic with nested structure
  if (moduleType === 'vpc') {
    if (!Array.isArray(modules.vpc)) {
      modules.vpc = [];
    }

    const vpcArray = modules.vpc as VpcEntry[];
    const existing = vpcArray.find((mod: VpcEntry) => mod.name === moduleName);
    if (!existing) {
      const newVpc: VpcEntry = { name: moduleName };
      if (cidrBlock) newVpc['cidr_blocks'] = [cidrBlock];
      vpcArray.push(newVpc);
    } else if (cidrBlock && !existing.cidr_blocks?.includes(cidrBlock)) {
      existing.cidr_blocks = existing.cidr_blocks || [];
      existing.cidr_blocks.push(cidrBlock);
    }

    // Sync root-level vpcNames and cidr_blocks
    config.vpcNames = Array.isArray(config.vpcNames) ? config.vpcNames : [];
    if (!(config.vpcNames as string[]).includes(moduleName)) {
      (config.vpcNames as string[]).push(moduleName);
    }

    config.cidr_blocks = Array.isArray(config.cidr_blocks)
      ? config.cidr_blocks
      : [];
    const allCidrBlocks = vpcArray.flatMap(
      (v: VpcEntry) => v.cidr_blocks || [],
    );
    config.cidr_blocks = Array.from(
      new Set([...(config.cidr_blocks as string[]), ...allCidrBlocks]),
    );
  }

  // Handle other modules (stored inside `modules` as objects)
  else {
    if (!Array.isArray(modules[moduleType])) {
      modules[moduleType] = [];
    }

    const moduleArray = modules[moduleType] as ModuleEntry[];
    const alreadyExists = moduleArray.some(
      (mod: ModuleEntry) => mod.name === moduleName,
    );

    if (!alreadyExists) {
      moduleArray.push({ name: moduleName });
    }

    // Remove flat module array from root level if it was added previously
    if (Array.isArray(config[moduleType])) {
      delete config[moduleType];
    }
  }
}

export function deleteArrayProperty(
  serviceNamesArray: string[],
  serviceNameToRemove: string,
) {
  if (
    serviceNamesArray &&
    Array.isArray(serviceNamesArray) &&
    serviceNameToRemove
  ) {
    const index = serviceNamesArray.indexOf(serviceNameToRemove);
    if (index !== -1) {
      serviceNamesArray.splice(index, 1);
      AppLogger.info(
        `Removed ${serviceNameToRemove} from service_names array.`,
        true,
      );
    } else {
      AppLogger.info(
        `${serviceNameToRemove} not found in service_names array.`,
        true,
      );
    }
  } else {
    AppLogger.warn(
      `service_names array is missing or invalid, or service_Name is not provided.`,
      true,
    );
  }
}
