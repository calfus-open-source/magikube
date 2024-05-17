const cloudProviderPrompts: any[] = [
  {
    choices: ["aws", "gcp", "azure", "on-premises"],
    message: "Select a Cloud Provider:",
    name: "cloud_provider",
    type: "list",
  },
];

export default cloudProviderPrompts;
