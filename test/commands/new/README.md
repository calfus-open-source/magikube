# CreateProject Command Unit Tests

This directory contains comprehensive unit tests for the `CreateProject` command (`src/commands/new/index.ts`).

## Test Structure

### 1. **index.test.ts** - Main CLI Interface Tests
- CLI argument validation
- Template flag handling
- Input validation integration
- Command structure validation
- Help and examples testing

### 2. **validation.test.ts** - Input Validation Function Tests
- `validateUserInput()` function testing
- `validateRestrictedInputs()` function testing
- Regex pattern validation
- Error message formatting
- Edge cases for project name validation

### 3. **class.test.ts** - CreateProject Class Unit Tests
- Static properties validation
- Instance properties testing
- Command inheritance verification
- Template processing logic
- Configuration merging tests

### 4. **integration.test.ts** - Integration Tests
- AWS provider flow integration
- Azure provider flow integration
- Empty template creation flow
- Multi-step project creation
- Error recovery scenarios
- Performance and memory testing

### 5. **utilities.test.ts** - Utility Functions and Configuration Tests
- System configuration validation
- Constants and templates testing
- Mock utility functions
- Configuration object structure
- Module loading verification

### 6. **comprehensive.test.ts** - Comprehensive Test Suite
- Test coverage validation
- Smoke tests
- Critical path testing
- Regression tests
- Edge case handling
- Performance validation
- Cross-platform compatibility

## Test Coverage

The test suite covers:

✅ **Input Validation**
- Project name format validation (3-8 chars, lowercase, alphanumeric + underscore)
- Restricted command name prevention
- Invalid character handling
- Length validation

✅ **CLI Interface**
- Argument parsing
- Flag handling (`--template`, `--help`)
- Error message display
- Help text generation

✅ **Template Processing**
- Empty template creation
- Predefined template handling
- AWS/Azure specific templates
- Template validation

✅ **Cloud Provider Flows**
- AWS account setup and validation
- Azure login and authentication
- Provider-specific configuration
- Resource group creation

✅ **Error Handling**
- Graceful error recovery
- Process exit handling
- User-friendly error messages
- Logging integration

✅ **Configuration Management**
- System config merging
- User input processing
- Environment-specific settings
- Credential handling

✅ **Integration Scenarios**
- End-to-end project creation flow
- Multi-step provisioning
- Health check validation
- File system operations

## Running Tests

```bash
# Run all CreateProject tests
npm test -- --grep "CreateProject|new"

# Run specific test files
npm test test/commands/new/index.test.ts
npm test test/commands/new/validation.test.ts
npm test test/commands/new/class.test.ts
npm test test/commands/new/integration.test.ts
npm test test/commands/new/utilities.test.ts
npm test test/commands/new/comprehensive.test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode for development
npm test -- --watch
```

## Test Patterns Used

### 1. **oclif Test Framework**
```typescript
import { expect, test } from '@oclif/test';

test
  .command(['new', 'validname'])
  .it('should accept valid project names');
```

### 2. **Error Handling Tests**
```typescript
test
  .command(['new', 'invalid-name'])
  .exit(1)
  .it('should reject invalid names');
```

### 3. **Mocking External Dependencies**
```typescript
test
  .stub(process, 'exit', sandbox.stub())
  .command(['new', 'testapp'])
  .it('should handle process exit gracefully');
```

### 4. **Integration Testing**
```typescript
test
  .timeout(10000)
  .stub(console, 'error', sandbox.stub())
  .command(['new', 'integrationtest'])
  .catch(error => {
    expect(error.message).to.not.contain('is invalid');
  })
  .it('should pass validation in integration scenarios');
```

## Key Test Scenarios

### Valid Project Names
- `test`, `test123`, `test_app`, `myapp`, `web_app`

### Invalid Project Names
- `ab` (too short)
- `verylongname` (too long)
- `1test` (starts with number)
- `test_` (ends with underscore)
- `Test` (uppercase letters)
- `test-app` (contains hyphen)

### Restricted Names
- `new`, `destroy`, `resume` (command names)

### Template Types
- `empty` (minimal project)
- `eks-fargate-vpc` (AWS EKS)
- `aks-basic` (Azure AKS)

## Mock Dependencies

The tests mock the following external dependencies:
- File system operations (`fs`)
- Process exit calls
- Console error output
- AWS account validation
- Azure authentication
- Terraform project creation
- Template cloning
- Health check services

## Performance Expectations

- Validation should complete within 5 seconds
- Memory usage should not exceed 100MB during testing
- No memory leaks between test runs
- Concurrent validation calls should not cause deadlocks

## Maintenance Notes

- Tests are designed to be deterministic and repeatable
- Mock all external dependencies to avoid side effects
- Use appropriate timeouts for integration tests
- Keep test data separate from production constants
- Update tests when adding new templates or validation rules

## Contributing

When adding new functionality to the CreateProject command:

1. Add unit tests for new validation rules
2. Update integration tests for new flows
3. Add edge case tests for boundary conditions
4. Ensure backward compatibility tests pass
5. Update this README with new test scenarios