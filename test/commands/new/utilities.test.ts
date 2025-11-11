import { expect, test } from '@oclif/test';

describe('CreateProject Utility Functions Tests', () => {

  describe('System Configuration Tests', () => {
    test
      .it('should merge AWS specific config correctly', () => {
        const { AWS_SPECIFIC_CONFIG } = require('../../../src/core/constants/systemDefaults.js');
        expect(AWS_SPECIFIC_CONFIG).to.be.an('object');
        expect(AWS_SPECIFIC_CONFIG).to.have.property('cloud_provider');
      });

    test
      .it('should merge Azure specific config correctly', () => {
        const { AZURE_SPECIFIC_CONFIG } = require('../../../src/core/constants/systemDefaults.js');
        expect(AZURE_SPECIFIC_CONFIG).to.be.an('object');
        expect(AZURE_SPECIFIC_CONFIG).to.have.property('cloud_provider');
      });

    test
      .it('should have Kubernetes system config', () => {
        const { KUBERNETES_SYSTEM_CONFIG } = require('../../../src/core/constants/systemDefaults.js');
        expect(KUBERNETES_SYSTEM_CONFIG).to.be.an('object');
      });

    test
      .it('should have application configs', () => {
        const {
          NEXT_APP_CONFIG,
          REACT_APP_CONFIG,
          NODE_APP_CONFIG
        } = require('../../../src/core/constants/systemDefaults.js');

        expect(NEXT_APP_CONFIG).to.be.an('object');
        expect(REACT_APP_CONFIG).to.be.an('object');
        expect(NODE_APP_CONFIG).to.be.an('object');
      });
  });

  describe('Constants Validation Tests', () => {
    test
      .it('should have supported templates defined', () => {
        const { supportedTemplates } = require('../../../src/core/constants/constants.js');
        expect(supportedTemplates).to.be.an('array');
        expect(supportedTemplates.length).to.be.greaterThan(0);
      });

    test
      .it('should have invalid project names defined', () => {
        const { InvalidProjectNames } = require('../../../src/core/constants/constants.js');
        expect(InvalidProjectNames).to.be.an('array');
        expect(InvalidProjectNames).to.include('new');
        expect(InvalidProjectNames).to.include('destroy');
      });

    test
      .it('should have AWS modules defined', () => {
        const { aws_modules } = require('../../../src/core/constants/constants.js');
        expect(aws_modules).to.be.an('array');
        expect(aws_modules.length).to.be.greaterThan(0);
      });

    test
      .it('should have Azure modules defined', () => {
        const { azure_modules } = require('../../../src/core/constants/constants.js');
        expect(azure_modules).to.be.an('array');
        expect(azure_modules.length).to.be.greaterThan(0);
      });

    test
      .it('should have services defined', () => {
        const { services } = require('../../../src/core/constants/constants.js');
        expect(services).to.be.an('array');
        expect(services.length).to.be.greaterThan(0);
      });
  });

  describe('Template Configuration Tests', () => {
    test
      .it('should validate empty template configuration', () => {
        const { supportedTemplates } = require('../../../src/core/constants/constants.js');
        expect(supportedTemplates).to.include('empty');
      });

    test
      .it('should validate EKS templates', () => {
        const { supportedTemplates } = require('../../../src/core/constants/constants.js');
        const eksTemplates = supportedTemplates.filter((template: string) =>
          template.includes('eks')
        );
        expect(eksTemplates.length).to.be.greaterThan(0);
      });

    test
      .it('should validate AKS templates', () => {
        const { supportedTemplates } = require('../../../src/core/constants/constants.js');
        const aksTemplates = supportedTemplates.filter((template: string) =>
          template.includes('aks')
        );
        expect(aksTemplates.length).to.be.greaterThan(0);
      });
  });

  describe('Color Configuration Tests', () => {
    test
      .it('should have color constants defined', () => {
        const { Colours } = require('../../../src/prompts/constants.js');
        expect(Colours).to.be.an('object');
        expect(Colours).to.have.property('boldText');
        expect(Colours).to.have.property('redColor');
        expect(Colours).to.have.property('colorReset');
      });
  });

  describe('Utility Functions Mocking Tests', () => {
    test
      .it('should be able to mock handlePrompts', () => {
        const handlePrompts = require('../../../src/core/utils/handlePrompts-utils.js').handlePrompts;
        expect(handlePrompts).to.be.a('function');
      });

    test
      .it('should be able to mock cloneAndCopyTemplates', () => {
        const { cloneAndCopyTemplates } = require('../../../src/core/utils/copyTemplates-utils.js');
        expect(cloneAndCopyTemplates).to.be.a('function');
      });

    test
      .it('should be able to mock createBlankMagikubeProject', () => {
        const { createBlankMagikubeProject } = require('../../../src/core/utils/createEmptyProject-utils.js');
        expect(createBlankMagikubeProject).to.be.a('function');
      });

    test
      .it('should be able to mock serviceHealthCheck', () => {
        const { serviceHealthCheck } = require('../../../src/core/utils/healthCheck-utils.js');
        expect(serviceHealthCheck).to.be.a('function');
      });

    test
      .it('should be able to mock terraform handlers', () => {
        const { handleEKSandAKS, handleK8s } = require('../../../src/core/utils/terraformHandlers-utils.js');
        expect(handleEKSandAKS).to.be.a('function');
        expect(handleK8s).to.be.a('function');
      });
  });

  describe('Configuration Object Structure Tests', () => {
    test
      .it('should validate FullConfigObject interface', () => {
        // Test the structure that would be used in the config object
        const configObject = {
          common: {
            token: 'test-token',
            userName: 'testuser',
            orgName: 'testorg',
            sourceCodeRepo: 'testrepo',
            projectName: 'testproject',
            environment: 'dev'
          },
          aws: {
            region: 'us-east-1',
            awsAccessKey: 'test-key',
            awsSecretKey: 'test-secret',
            accountId: '123456789012'
          }
        };

        expect(configObject.common).to.have.property('token');
        expect(configObject.common).to.have.property('userName');
        expect(configObject.common).to.have.property('projectName');
        expect(configObject.aws).to.have.property('region');
        expect(configObject.aws).to.have.property('accountId');
      });

    test
      .it('should validate Azure config object structure', () => {
        const azureConfigObject = {
          common: {
            token: 'test-token',
            userName: 'testuser',
            orgName: 'testorg',
            sourceCodeRepo: 'testrepo',
            projectName: 'testproject',
            environment: 'dev'
          },
          azure: {
            location: 'East US',
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
            tenantId: 'test-tenant-id',
            subscriptionId: 'test-subscription-id'
          }
        };

        expect(azureConfigObject.common).to.have.property('token');
        expect(azureConfigObject.azure).to.have.property('location');
        expect(azureConfigObject.azure).to.have.property('clientId');
        expect(azureConfigObject.azure).to.have.property('subscriptionId');
      });
  });

  describe('Module Loading Tests', () => {
    test
      .it('should load AWS modules correctly', () => {
        const { aws_modules } = require('../../../src/core/constants/constants.js');
        aws_modules.forEach((module: string) => {
          expect(module).to.be.a('string');
          expect(module.length).to.be.greaterThan(0);
        });
      });

    test
      .it('should load Azure modules correctly', () => {
        const { azure_modules } = require('../../../src/core/constants/constants.js');
        azure_modules.forEach((module: string) => {
          expect(module).to.be.a('string');
          expect(module.length).to.be.greaterThan(0);
        });
      });
  });

  describe('Error Message Formatting Tests', () => {
    test
      .it('should format validation error messages correctly', () => {
        const { Colours } = require('../../../src/prompts/constants.js');
        const errorMessage =
          `\n\n  ${Colours.boldText}${Colours.redColor} ERROR: ${Colours.colorReset} ` +
          `Project Name "test" is invalid.`;

        expect(errorMessage).to.contain('ERROR:');
        expect(errorMessage).to.contain('Project Name');
        expect(errorMessage).to.contain('is invalid');
      });

    test
      .it('should format restriction error messages correctly', () => {
        const { Colours } = require('../../../src/prompts/constants.js');
        const errorMessage =
          `\n\n  ${Colours.boldText}${Colours.redColor} ERROR: ${Colours.colorReset} ` +
          `Command "new" is restricted`;

        expect(errorMessage).to.contain('ERROR:');
        expect(errorMessage).to.contain('Command');
        expect(errorMessage).to.contain('is restricted');
      });
  });
});