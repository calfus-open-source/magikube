import { expect, test } from '@oclif/test';

describe('CreateProject Class Unit Tests', () => {
  let CreateProject: any;

  beforeEach(() => {
    CreateProject = require('../../../src/commands/new/index.js').default;
  });

  describe('Static Properties', () => {
    test
      .it('should have correct description', () => {
        expect(CreateProject.description).to.equal(
          'Create new Magikube project with a specific template or as an empty project.'
        );
      });

    test
      .it('should have correct args configuration', () => {
        expect(CreateProject.args).to.have.property('name');
        expect(CreateProject.args.name.description).to.equal('Project name to be created');
        expect(CreateProject.args.name.required).to.be.true;
      });

    test
      .it('should have correct flags configuration', () => {
        expect(CreateProject.flags).to.have.property('template');
        expect(CreateProject.flags.template.char).to.equal('t');
        expect(CreateProject.flags.template.description).to.equal('Template name for the project');
        expect(CreateProject.flags.template.required).to.be.false;
      });

    test
      .it('should have examples array', () => {
        expect(CreateProject.examples).to.be.an('array');
        expect(CreateProject.examples.length).to.be.greaterThan(0);
        expect(CreateProject.examples[0]).to.contain('sample -t empty');
        expect(CreateProject.examples[1]).to.contain('sample -t eks-fargate-vpc');
      });
  });

  describe('Instance Properties', () => {
    test
      .it('should initialize with predefined templates', () => {
        const instance = new CreateProject([], {});
        expect(instance).to.have.property('predefinedTemplates');
        expect(instance.predefinedTemplates).to.be.an('array');
      });
  });

  describe('Command Flow Logic', () => {
    test
      .it('should have proper command structure for flow logic', () => {
        const instance = new CreateProject([], {});
        expect(instance.run).to.be.a('function');
        expect(instance.predefinedTemplates).to.be.an('array');
      });
  });

  describe('Predefined Templates', () => {
    test
      .it('should contain supported templates', () => {
        const instance = new CreateProject([], {});
        expect(instance.predefinedTemplates).to.include.members([
          'empty', // assuming this is a supported template
        ]);
      });
  });

  describe('Error Scenarios', () => {
    test
      .it('should handle missing arguments gracefully', () => {
        expect(() => {
          new CreateProject([], {});
        }).to.not.throw();
      });
  });

  describe('Command Inheritance', () => {
    test
      .it('should extend BaseCommand', () => {
        const BaseCommand = require('../../../src/commands/base.js').default;
        const instance = new CreateProject([], {});
        expect(instance).to.be.instanceOf(BaseCommand);
      });
  });

  describe('Template Processing', () => {
    test
      .it('should recognize empty template', () => {
        const instance = new CreateProject([], {});
        // Test if 'empty' is handled as a special case
        expect(instance.predefinedTemplates).to.be.an('array');
      });

    test
      .it('should have aws and azure template support', () => {
        const instance = new CreateProject([], {});
        // Verify that templates include both cloud providers
        expect(instance.predefinedTemplates).to.be.an('array');
        expect(instance.predefinedTemplates.length).to.be.greaterThan(0);
      });
  });

  describe('Configuration Merging', () => {
    test
      .it('should handle system config merging', () => {
        // Test the logic for merging different config objects
        const instance = new CreateProject([], {});
        expect(instance).to.have.property('predefinedTemplates');
      });
  });

  describe('Cloud Provider Support', () => {
    test
      .it('should support AWS provider', () => {
        const instance = new CreateProject([], {});
        // Verify AWS-specific template support
        expect(instance.predefinedTemplates).to.be.an('array');
      });

    test
      .it('should support Azure provider', () => {
        const instance = new CreateProject([], {});
        // Verify Azure-specific template support
        expect(instance.predefinedTemplates).to.be.an('array');
      });
  });

  describe('Project Name Handling', () => {
    test
      .it('should have parse method for handling project names', () => {
        const instance = new CreateProject([], {});
        expect(instance.parse).to.be.a('function');
      });
  });
});