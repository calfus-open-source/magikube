export enum Environment {
  PRODUCTION = "production",
  NON_PRODUCTION = "non-production",
}

export enum CloudProvider {
  AWS = "aws",
  GCP = "gcp",
  AZURE = "azure",
  ON_PREMISES = "on-premises",
}

export enum Colours {
  colorReset = "\x1b[0m",
  redColor = "\x1b[31m",
  greenColor = "\x1b[32m",
  boldText = "\x1b[1m",
}

export enum VersionControl {
  GITHUB = "github",
  CODECOMMIT = "codecommit",
  // BITBUCKET = "bitbucket",
}
