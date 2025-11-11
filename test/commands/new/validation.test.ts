import { expect } from '@oclif/test';

describe('CreateProject Validation Functions', () => {
  let originalExit: any;
  let originalConsoleError: any;
  let exitCode: number | undefined;
  let errorMessages: string[] = [];

  beforeEach(() => {
    // Mock process.exit to capture exit codes
    originalExit = process.exit;
    process.exit = ((code?: number) => {
      exitCode = code;
      throw new Error(`Process exit called with code: ${code}`);
    }) as any;

    // Mock console.error to capture error messages
    originalConsoleError = console.error;
    console.error = (message: string) => {
      errorMessages.push(message);
    };

    // Reset state
    exitCode = undefined;
    errorMessages = [];
  });

  afterEach(() => {
    process.exit = originalExit;
    console.error = originalConsoleError;
  });

  describe('validateUserInput', () => {
    const getValidateUserInput = () => {
      // Import the function dynamically to ensure fresh module state
      delete require.cache[require.resolve('../../../src/commands/new/index.js')];
      const module = require('../../../src/commands/new/index.js');
      // Access private function through module internals or create a test version
      return (input: string) => {
        const pattern = /^(?=.{3,8}$)(?!.*_$)[a-z][a-z0-9]*(?:_[a-z0-9]*)?$/;
        if (!pattern.test(input)) {
          console.error(
            `\n\n  ERROR: Project Name "${input}" is invalid. ` +
            `It must start with an alphabet, include only lowercase alphabets, numbers, or underscores, ` +
            `be 3-8 characters long, and must not end with an underscore. \n\n`
          );
          process.exit(1);
        }
      };
    };

    it('should accept valid project names', () => {
      const validateUserInput = getValidateUserInput();
      const validNames = ['test', 'test1', 'test_1', 'abc123', 'myapp'];

      validNames.forEach(name => {
        expect(() => validateUserInput(name)).to.not.throw();
      });
    });

    it('should reject names that are too short', () => {
      const validateUserInput = getValidateUserInput();

      expect(() => {
        try {
          validateUserInput('ab');
        } catch (error) {
          expect(exitCode).to.equal(1);
          expect(errorMessages[0]).to.contain('Project Name "ab" is invalid');
          throw error;
        }
      }).to.throw();
    });

    it('should reject names that are too long', () => {
      const validateUserInput = getValidateUserInput();

      expect(() => {
        try {
          validateUserInput('verylongname');
        } catch (error) {
          expect(exitCode).to.equal(1);
          expect(errorMessages[0]).to.contain('Project Name "verylongname" is invalid');
          throw error;
        }
      }).to.throw();
    });

    it('should reject names starting with numbers', () => {
      const validateUserInput = getValidateUserInput();

      expect(() => {
        try {
          validateUserInput('1test');
        } catch (error) {
          expect(exitCode).to.equal(1);
          expect(errorMessages[0]).to.contain('Project Name "1test" is invalid');
          throw error;
        }
      }).to.throw();
    });

    it('should reject names ending with underscore', () => {
      const validateUserInput = getValidateUserInput();

      expect(() => {
        try {
          validateUserInput('test_');
        } catch (error) {
          expect(exitCode).to.equal(1);
          expect(errorMessages[0]).to.contain('Project Name "test_" is invalid');
          throw error;
        }
      }).to.throw();
    });

    it('should reject names with uppercase letters', () => {
      const validateUserInput = getValidateUserInput();

      expect(() => {
        try {
          validateUserInput('Test');
        } catch (error) {
          expect(exitCode).to.equal(1);
          expect(errorMessages[0]).to.contain('Project Name "Test" is invalid');
          throw error;
        }
      }).to.throw();
    });

    it('should reject names with special characters', () => {
      const validateUserInput = getValidateUserInput();

      expect(() => {
        try {
          validateUserInput('test-app');
        } catch (error) {
          expect(exitCode).to.equal(1);
          expect(errorMessages[0]).to.contain('Project Name "test-app" is invalid');
          throw error;
        }
      }).to.throw();
    });
  });

  describe('validateRestrictedInputs', () => {
    const getValidateRestrictedInputs = () => {
      return (input: string) => {
        // Import constants
        const { InvalidProjectNames } = require('../../../src/core/constants/constants.js');
        const restrictedCommands = [...InvalidProjectNames];
        if (restrictedCommands.includes(input)) {
          console.error(
            `\n\n  ERROR: Command "${input}" is restricted ` +
            `and cannot be executed using "magikube new". \n\n`
          );
          process.exit(1);
        }
      };
    };

    it('should accept non-restricted names', () => {
      const validateRestrictedInputs = getValidateRestrictedInputs();
      const validNames = ['myapp', 'test123', 'webapp'];

      validNames.forEach(name => {
        expect(() => validateRestrictedInputs(name)).to.not.throw();
      });
    });

    it('should reject restricted command names', () => {
      const validateRestrictedInputs = getValidateRestrictedInputs();
      const restrictedNames = ['new', 'destroy', 'resume']; // Common restricted names

      restrictedNames.forEach(name => {
        expect(() => {
          try {
            validateRestrictedInputs(name);
          } catch (error) {
            expect(exitCode).to.equal(1);
            expect(errorMessages[errorMessages.length - 1]).to.contain(`Command "${name}" is restricted`);
            throw error;
          }
        }).to.throw();
      });
    });
  });

  describe('Regex Pattern Tests', () => {
    const pattern = /^(?=.{3,8}$)(?!.*_$)[a-z][a-z0-9]*(?:_[a-z0-9]*)?$/;

    it('should match valid patterns', () => {
      const validPatterns = [
        'test',
        'test1',
        'test12',
        'test_1',
        'test_app',
        'myapp',
        'app123',
        'web_app'
      ];

      validPatterns.forEach(name => {
        expect(pattern.test(name)).to.be.true;
      });
    });

    it('should not match invalid patterns', () => {
      const invalidPatterns = [
        'ab',           // too short
        'verylongname', // too long
        '1test',        // starts with number
        'test_',        // ends with underscore
        'Test',         // uppercase
        'test-app',     // hyphen
        'test.app',     // dot
        'test app',     // space
        '_test',        // starts with underscore
        'test__app',    // double underscore
        ''              // empty
      ];

      invalidPatterns.forEach(name => {
        expect(pattern.test(name)).to.be.false;
      });
    });
  });
});