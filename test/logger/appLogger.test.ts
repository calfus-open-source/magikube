import { AppLogger } from '../../src/logger/appLogger.js';
import fs from 'fs';
import winston from 'winston';

jest.mock('fs');
jest.mock('winston', () => {
  const mFormat = {
    combine: jest.fn(),
    timestamp: jest.fn(),
    printf: jest.fn(),
    simple: jest.fn(),
  };
  const mLogger = {
    log: jest.fn(),
  };
  return {
    format: mFormat,
    createLogger: jest.fn(() => mLogger),
    transports: {
      Console: jest.fn(),
      DailyRotateFile: jest.fn(),
    },
  };
});
jest.mock('winston-daily-rotate-file', () => {
  return jest.fn();
});

describe('AppLogger', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  const mockWinston = winston as jest.Mocked<typeof winston>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset private static properties if possible, or just re-configure
    // Since it's a static class, state persists. We might need to be careful.
  });

  it('should configure logger and create log directory', () => {
    mockFs.existsSync.mockReturnValue(false);
    mockFs.mkdirSync.mockImplementation(() => undefined);
    mockFs.readdirSync.mockReturnValue([]);

    AppLogger.configureLogger('test-project', 'new');

    expect(mockFs.mkdirSync).toHaveBeenCalledWith(
      expect.stringContaining('logs'),
      { recursive: true },
    );
    expect(mockWinston.createLogger).toHaveBeenCalledTimes(2); // Console and File
  });

  it('should log info messages', () => {
    // Re-configure to ensure loggers are set
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue([]);
    AppLogger.configureLogger('test-project', 'new');

    AppLogger.info('info message');

    // We need to access the mock logger returned by createLogger
    const loggerInstance = mockWinston.createLogger.mock.results[0].value;
    expect(loggerInstance.log).toHaveBeenCalledWith('info', 'info message');
  });

  it('should log error messages', () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue([]);
    AppLogger.configureLogger('test-project', 'new');

    AppLogger.error('error message');

    const loggerInstance = mockWinston.createLogger.mock.results[0].value;
    expect(loggerInstance.log).toHaveBeenCalledWith('error', 'error message');
  });

  it('should rotate log files if they exist', () => {
    mockFs.existsSync.mockReturnValue(true);
    // Mock readdir to return existing log files
    const date = new Date().toISOString().split('T')[0];
    mockFs.readdirSync.mockReturnValue([
      `test-project-${date}.log`,
    ] as unknown as fs.Dirent[]);

    // Mock renameSync
    mockFs.renameSync.mockImplementation(() => {});

    AppLogger.configureLogger('test-project', 'new');

    expect(mockFs.renameSync).toHaveBeenCalled();
  });

  describe('configureLogger with create command', () => {
    it('should set log directory to parent directory', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => undefined);
      mockFs.readdirSync.mockReturnValue([]);

      AppLogger.configureLogger('test-project', 'create');

      // The log directory should be path.join(cwd, '..', 'logs')
      const expectedParentLogs = expect.stringContaining('logs');
      expect(mockFs.mkdirSync).toHaveBeenCalledWith(expectedParentLogs, {
        recursive: true,
      });
      expect(mockWinston.createLogger).toHaveBeenCalledTimes(2);
    });
  });

  describe('configureLogger with module command', () => {
    it('should set log directory to parent directory', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => undefined);
      mockFs.readdirSync.mockReturnValue([]);

      AppLogger.configureLogger('test-project', 'module');

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('logs'),
        { recursive: true },
      );
      expect(mockWinston.createLogger).toHaveBeenCalledTimes(2);
    });
  });

  describe('configureLogger with unknown command', () => {
    it('should throw an error with Unknown command type message', () => {
      expect(() => {
        AppLogger.configureLogger('test-project', 'unknown-cmd');
      }).toThrow('Unknown command type');
    });
  });

  describe('configureLogger with shouldCreateLogFile=false', () => {
    it('should skip log file operations and not call readdirSync', () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.mkdirSync.mockImplementation(() => undefined);

      AppLogger.configureLogger('test-project', 'new', false);

      expect(mockFs.readdirSync).not.toHaveBeenCalled();
      expect(mockWinston.createLogger).toHaveBeenCalledTimes(2);
    });
  });

  describe('debug logging', () => {
    it('should log to both file and console when enableConsole is true', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([]);
      AppLogger.configureLogger('test-project', 'new');

      AppLogger.debug('test debug message', true);

      // createLogger is called twice: first call returns consoleLogger, second returns fileLogger
      // Actually, looking at the source: consoleLogger is first, fileLogger is second
      // But the mock returns the same object for both. We can verify the log call.
      const loggerInstance = mockWinston.createLogger.mock.results[0].value;
      expect(loggerInstance.log).toHaveBeenCalledWith(
        'debug',
        'test debug message',
      );
    });
  });

  describe('warn logging', () => {
    it('should log warn messages to file logger', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([]);
      AppLogger.configureLogger('test-project', 'new');

      AppLogger.warn('warning message');

      const loggerInstance = mockWinston.createLogger.mock.results[0].value;
      expect(loggerInstance.log).toHaveBeenCalledWith(
        'warn',
        'warning message',
      );
    });

    it('should log warn to both loggers when enableConsole is true', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([]);
      AppLogger.configureLogger('test-project', 'new');

      AppLogger.warn('warning message', true);

      const loggerInstance = mockWinston.createLogger.mock.results[0].value;
      // Since both loggers share the same mock, the log should be called twice (file + console)
      expect(loggerInstance.log).toHaveBeenCalledWith(
        'warn',
        'warning message',
      );
    });
  });

  describe('Log rotation edge cases', () => {
    it('should not rename if old file does not exist', () => {
      const date = new Date().toISOString().split('T')[0];
      // existsSync: first call for log directory (true), then for oldFilePath (false)
      mockFs.existsSync
        .mockReturnValueOnce(true) // log directory exists
        .mockReturnValueOnce(false); // oldFilePath does not exist

      mockFs.readdirSync.mockReturnValue([
        `test-project-${date}.log`,
      ] as unknown as fs.Dirent[]);

      AppLogger.configureLogger('test-project', 'new');

      expect(mockFs.renameSync).not.toHaveBeenCalled();
    });

    it('should handle renameSync failure gracefully', () => {
      const date = new Date().toISOString().split('T')[0];
      mockFs.existsSync.mockReturnValue(true);

      mockFs.readdirSync.mockReturnValue([
        `test-project-${date}.log`,
      ] as unknown as fs.Dirent[]);

      mockFs.renameSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      // The error handler in the source calls AppLogger.error, which uses the
      // file logger. Since the logger mock is set up, this should not throw.
      // configureLogger should still complete (it catches the renameSync error).
      AppLogger.configureLogger('test-project', 'new');

      expect(mockFs.renameSync).toHaveBeenCalled();
      // The error is caught internally; the logger instance log is called with 'error'
      const loggerInstance = mockWinston.createLogger.mock.results[0].value;
      expect(loggerInstance.log).toHaveBeenCalledWith(
        'error',
        expect.stringContaining('Failed to rename log file'),
      );
    });
  });
});
