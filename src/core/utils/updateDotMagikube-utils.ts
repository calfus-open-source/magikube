// Helper function to update array properties in .magikube file
export function updateDotMagikubeArrayProperty(config: { [x: string]: any[]; }, property: string, value: string) {
  if (!Array.isArray(config[property])) {
    config[property] = config[property] ? [config[property]] : [];
  }
  if (!config[property].includes(value)) {
    config[property].push(value);
  }
}