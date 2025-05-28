import { AppLogger } from "../../logger/appLogger.js";

// Helper function to update array properties in .magikube file
export function updateArrayProperty(config: { [x: string]: any[]; }, property: string, value: string) {
  if (!Array.isArray(config[property])) {
    config[property] = config[property] ? [config[property]] : [];
  }
  if (!config[property].includes(value)) {
    config[property].push(value);
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