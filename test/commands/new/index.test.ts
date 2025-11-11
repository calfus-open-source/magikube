import { expect, test } from '@oclif/test';

describe('new', () => {
  describe('CLI Arguments Validation', () => {
    test
      .command(['new'])
      .catch(error => {
        expect(error.message).to.contain('Missing 1 required arg');
      })
      .it('shows error when no project name provided');

    test
      .stdout()
      .command(['new', '--help'])
      .it('shows help information', ctx => {
        expect(ctx.stdout).to.contain('Create new Magikube project');
      });
  });

  describe('Template Flag', () => {
    test
      .stdout()
      .command(['new', 'testproject', '--template', 'invalid-template'])
      .catch(() => {
        // Test for invalid template handling - command should exit
      })
      .it('handles invalid template gracefully');
  });

  describe('Input Validation Tests', () => {
    test
      .command(['new', 'ab'])
      .exit(1)
      .it('rejects project names that are too short');

    test
      .command(['new', 'verylongprojectname'])
      .exit(1)
      .it('rejects project names that are too long');

    test
      .command(['new', '123invalid'])
      .exit(1)
      .it('rejects project names starting with numbers');

    test
      .command(['new', 'invalid_'])
      .exit(1)
      .it('rejects project names ending with underscore');

    test
      .command(['new', 'destroy'])
      .exit(1)
      .it('rejects restricted project names');

    test
      .command(['new', 'new'])
      .exit(1)
      .it('rejects "new" as project name');
  });

  describe('Command Structure', () => {
    test
      .it('should have correct command configuration', () => {
        const CreateProject = require('../../../src/commands/new/index.js').default;
        expect(CreateProject.description).to.contain('Create new Magikube project');
        expect(CreateProject.args.name.description).to.equal('Project name to be created');
        expect(CreateProject.args.name.required).to.be.true;
        expect(CreateProject.flags.template.char).to.equal('t');
      });
  });

  describe('Examples', () => {
    test
      .it('should have correct examples', () => {
        const CreateProject = require('../../../src/commands/new/index.js').default;
        expect(CreateProject.examples).to.be.an('array');
        expect(CreateProject.examples.length).to.be.greaterThan(0);
      });
  });
});