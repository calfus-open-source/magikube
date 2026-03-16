import { EventEmitter } from 'events';

/**
 * Terraform Mock Utilities
 *
 * Centralized utilities for mocking Terraform spawn() processes in tests.
 * Provides factory functions to create mock processes with EventEmitter-based
 * stdout/stderr streams for simulating Terraform CLI behavior.
 */

/** Mock process shape returned by createMockTerraformProcess */
export interface MockTerraformProcess extends EventEmitter {
  stdout: EventEmitter;
  stderr: EventEmitter;
}

/**
 * Creates a mock Terraform process with EventEmitter-based stdout/stderr streams.
 * This is the standard pattern for mocking child_process.spawn() in Terraform tests.
 *
 * @returns Mock process object with stdout, stderr, and event emitters
 */
export function createMockTerraformProcess(): MockTerraformProcess {
  const mockProcess = new EventEmitter() as MockTerraformProcess;
  mockProcess.stdout = new EventEmitter();
  mockProcess.stderr = new EventEmitter();
  return mockProcess;
}

/**
 * Simulates a successful Terraform operation by emitting a close event with exit code 0.
 *
 * @param mockProcess - The mock process created by createMockTerraformProcess()
 * @param delay - Delay in milliseconds before emitting close event (default: 10ms)
 * @param stdoutData - Optional stdout data to emit before closing
 */
export function simulateTerraformSuccess(
  mockProcess: MockTerraformProcess,
  delay: number = 10,
  stdoutData?: string,
): void {
  setTimeout(() => {
    if (stdoutData) {
      mockProcess.stdout.emit('data', stdoutData);
    }
    mockProcess.emit('close', 0);
  }, delay);
}

/**
 * Simulates a Terraform error by emitting stderr data and/or non-zero exit code.
 *
 * @param mockProcess - The mock process created by createMockTerraformProcess()
 * @param options - Error simulation options
 * @param options.stderrData - Error message to emit on stderr
 * @param options.exitCode - Non-zero exit code (default: 1)
 * @param options.delay - Delay in milliseconds before emitting events (default: 10ms)
 * @param options.emitClose - Whether to emit close event after stderr (default: false for AWS immediate rejection, true for Azure)
 */
export function simulateTerraformError(
  mockProcess: MockTerraformProcess,
  options: {
    stderrData?: string;
    exitCode?: number;
    delay?: number;
    emitClose?: boolean;
  } = {},
): void {
  const {
    stderrData = 'Terraform error',
    exitCode = 1,
    delay = 10,
    emitClose = false,
  } = options;

  setTimeout(() => {
    if (stderrData) {
      mockProcess.stderr.emit('data', stderrData);
    }
    if (emitClose) {
      mockProcess.emit('close', exitCode);
    }
  }, delay);
}

/**
 * Simulates Terraform progress by emitting stdout data with resource creation patterns.
 * Useful for testing progress bar tracking and stdout parsing.
 *
 * @param mockProcess - The mock process created by createMockTerraformProcess()
 * @param options - Progress simulation options
 * @param options.resourceCount - Number of resources to simulate creating/destroying
 * @param options.pattern - Pattern to use ('creation' or 'destruction')
 * @param options.delay - Delay in milliseconds before emitting data (default: 10ms)
 * @param options.includeClose - Whether to emit close(0) after progress (default: true)
 */
export function simulateTerraformProgress(
  mockProcess: MockTerraformProcess,
  options: {
    resourceCount?: number;
    pattern?: 'creation' | 'destruction';
    delay?: number;
    includeClose?: boolean;
  } = {},
): void {
  const {
    resourceCount = 1,
    pattern = 'creation',
    delay = 10,
    includeClose = true,
  } = options;

  setTimeout(() => {
    if (pattern === 'creation') {
      for (let i = 1; i <= resourceCount; i++) {
        const output = `module.resource_${i}: Creating...\nmodule.resource_${i}: Creation complete after ${i}s [id=resource-${i}-id]\n`;
        mockProcess.stdout.emit('data', output);
      }
    } else if (pattern === 'destruction') {
      // First emit plan summary
      mockProcess.stdout.emit('data', `Plan: ${resourceCount} to destroy.\n`);

      // Then emit destruction completion for each resource
      for (let i = 1; i <= resourceCount; i++) {
        const output = `module.resource_${i}: Destroying... [id=resource-${i}-id]\nmodule.resource_${i}: Destruction complete after ${i}s\n`;
        mockProcess.stdout.emit('data', output);
      }
    }

    if (includeClose) {
      mockProcess.emit('close', 0);
    }
  }, delay);
}

/**
 * Simulates a spawn error (e.g., command not found) by emitting an error event.
 *
 * @param mockProcess - The mock process created by createMockTerraformProcess()
 * @param errorMessage - Error message (default: 'spawn ENOENT')
 * @param delay - Delay in milliseconds before emitting error (default: 10ms)
 */
export function simulateSpawnError(
  mockProcess: MockTerraformProcess,
  errorMessage: string = 'spawn ENOENT',
  delay: number = 10,
): void {
  setTimeout(() => {
    mockProcess.emit('error', new Error(errorMessage));
  }, delay);
}

/**
 * Helper to assert spawn() was called with expected Terraform arguments.
 *
 * @param mockSpawn - The mocked spawn function (from jest.mock('child_process'))
 * @param expectedArgs - Expected arguments array or partial matcher
 * @param expectedOptions - Expected spawn options (cwd, stdio, etc.)
 */
export function assertTerraformSpawnCalled(
  mockSpawn: jest.Mock,
  expectedArgs?: string[],
  expectedOptions?: Record<string, unknown>,
): void {
  expect(mockSpawn).toHaveBeenCalledWith(
    'terraform',
    expectedArgs ? expect.arrayContaining(expectedArgs) : expect.any(Array),
    expectedOptions || expect.any(Object),
  );
}

/**
 * Helper to create a fully configured mock process with automatic success simulation.
 * This is a convenience wrapper that combines createMockTerraformProcess() and simulateTerraformSuccess().
 *
 * @param stdoutData - Optional stdout data to emit
 * @param delay - Delay before completing (default: 10ms)
 * @returns Configured mock process that will auto-complete successfully
 */
export function createSuccessfulMockProcess(
  stdoutData?: string,
  delay: number = 10,
): MockTerraformProcess {
  const mockProcess = createMockTerraformProcess();
  simulateTerraformSuccess(mockProcess, delay, stdoutData);
  return mockProcess;
}

/**
 * Helper to create a fully configured mock process with automatic error simulation.
 * This is a convenience wrapper that combines createMockTerraformProcess() and simulateTerraformError().
 *
 * @param stderrData - Error message to emit
 * @param exitCode - Non-zero exit code (default: 1)
 * @param delay - Delay before emitting error (default: 10ms)
 * @param emitClose - Whether to emit close event (default: false)
 * @returns Configured mock process that will fail
 */
export function createFailingMockProcess(
  stderrData?: string,
  exitCode: number = 1,
  delay: number = 10,
  emitClose: boolean = false,
): MockTerraformProcess {
  const mockProcess = createMockTerraformProcess();
  simulateTerraformError(mockProcess, {
    stderrData,
    exitCode,
    delay,
    emitClose,
  });
  return mockProcess;
}
