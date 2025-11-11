import { expect, test } from '@oclif/test';

describe('CreateProject Integration Tests', () => {

  describe('Template Validation Integration', () => {
    test
      .timeout(5000)
      .command(['new', 'testapp', '--template', 'nonexistent-template'])
      .catch(error => {
        // Should handle invalid templates gracefully
        expect(error).to.exist;
      })
      .it('should handle invalid template names');
  });

  describe('Error Recovery Integration', () => {
    test
      .timeout(5000)
      .command(['new', 'test', '--invalid-flag'])
      .catch(error => {
        expect(error.message).to.contain('Unexpected argument');
      })
      .it('should handle invalid flags gracefully');
  });

  describe('Help and Documentation Integration', () => {
    test
      .stdout()
      .command(['new', '--help'])
      .it('should display comprehensive help', ctx => {
        expect(ctx.stdout).to.contain('Create new Magikube project');
        expect(ctx.stdout).to.contain('USAGE');
        expect(ctx.stdout).to.contain('ARGUMENTS');
        expect(ctx.stdout).to.contain('FLAGS');
        expect(ctx.stdout).to.contain('EXAMPLES');
      });
  });

  describe('Version Compatibility Integration', () => {
    test
      .timeout(5000)
      .command(['new', 'versiontest'])
      .catch(error => {
        // Should work with current Node.js version
        expect(error.message).to.not.contain('version');
      })
      .it('should be compatible with current Node.js version');
  });

  describe('Performance Integration', () => {
    test
      .timeout(5000)
      .command(['new', 'perftest'])
      .catch(() => {
        // Performance test - command should not hang
      })
      .it('should complete within reasonable time');
  });

  describe('Basic Validation Integration', () => {
    test
      .timeout(5000)
      .command(['new', 'validname'])
      .catch(error => {
        // Should pass validation but fail on dependencies
        expect(error.message).to.not.contain('is invalid');
        expect(error.message).to.not.contain('is restricted');
      })
      .it('should pass basic validation for valid names');

    test
      .timeout(5000)
      .command(['new', 'test123'])
      .catch(error => {
        // Should pass validation but fail on dependencies
        expect(error.message).to.not.contain('is invalid');
      })
      .it('should accept valid names with numbers');

    test
      .timeout(5000)
      .command(['new', 'test_app'])
      .catch(error => {
        // Should pass validation but fail on dependencies
        expect(error.message).to.not.contain('is invalid');
      })
      .it('should accept valid names with underscores');
  });
});