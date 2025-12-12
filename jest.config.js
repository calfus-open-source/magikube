export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  globals: {
    "ts-jest": {
      useESM: true,
      tsconfig: {
        module: "es2022",
      },
    },
  },

  // Correct mapping for ESM .js extensions
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^(\\.{1,2}/.*)\\.ts$': '$1',
  },

  // 📊 Coverage settings
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/index.ts",
    "!src/commands/base.ts",
    "!src/commands/create.ts",
    "!src/constants.ts",
    "!src/core/constants/**",
    "!src/prompts/**",
    "!src/core/gitops/**",
    "!src/core/argocd/**",
    "!src/core/code-repository/**",
    "!src/core/interface.ts",
    "!src/core/aws/aws-eks-fargate.ts",
    "!src/core/aws/aws-microservice.ts",
    "!src/core/aws/aws-submodules.ts",
    "!src/core/aws/aws-eks-nodegroup.ts",
    "!src/core/aws/aws-k8s.ts",
    "!src/core/aws/aws-template-project.ts",

  ],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        isolatedModules: true,
        useESM: true
      }
    ]
  },
  coverageReporters: ["text", "lcov"],
};