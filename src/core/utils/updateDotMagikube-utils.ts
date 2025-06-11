import { AppLogger } from "../../logger/appLogger.js";

// Helper function to update array properties in .magikube file
export function updateProjectConfigArrays(
  config: { [key: string]: any },
  moduleType: string,
  moduleName: string,
  cidrBlock?: string
) {
  // Handle VPC logic with nested structure
  if (moduleType === "vpc") {
    config.modules = config.modules || {};

    if (!Array.isArray(config.modules.vpc)) {
      config.modules.vpc = [];
    }

    let existing = config.modules.vpc.find(
      (mod: any) => mod.name === moduleName
    );
    if (!existing) {
      const newVpc:any = { name: moduleName };
      if (cidrBlock) newVpc["cidr_blocks"] = [cidrBlock];
      config.modules.vpc.push(newVpc);
    } else if (cidrBlock && !existing.cidr_blocks?.includes(cidrBlock)) {
      existing.cidr_blocks = existing.cidr_blocks || [];
      existing.cidr_blocks.push(cidrBlock);
    }

    // Sync root-level vpcNames and cidr_blocks
    config.vpcNames = Array.isArray(config.vpcNames) ? config.vpcNames : [];
    if (!config.vpcNames.includes(moduleName)) {
      config.vpcNames.push(moduleName);
    }

    config.cidr_blocks = Array.isArray(config.cidr_blocks)
      ? config.cidr_blocks
      : [];
    const allCidrBlocks = config.modules.vpc.flatMap(
      (v: any) => v.cidr_blocks || []
    );
    config.cidr_blocks = Array.from(
      new Set([...config.cidr_blocks, ...allCidrBlocks])
    );
  }

  // Handle flat array modules (like service_names, services, etc.)
  else {
    config[moduleType] = Array.isArray(config[moduleType])
      ? config[moduleType]
      : [];
    if (!config[moduleType].includes(moduleName)) {
      config[moduleType].push(moduleName);
    }
  }
}



export function deleteArrayProperty(serviceNamesArray:any[], serviceNameToRemove:string) {
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
        true
      );
    } else {
      AppLogger.info(
        `${serviceNameToRemove} not found in service_names array.`,
        true
      );
    }
  } else {
    AppLogger.warn(
      `service_names array is missing or invalid, or service_Name is not provided.`,
      true
    );
  }
}