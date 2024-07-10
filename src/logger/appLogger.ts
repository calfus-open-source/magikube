import { LoggerGenerator } from './LoggerGenerator.js';
import fs from 'fs';
import path from 'path';
import 'winston-daily-rotate-file';
import winston, { createLogger } from 'winston';

export class AppLogger {
  private static fileLogger: any;
  private static consoleLogger: any;
  private static logDirectory = path.join(process.cwd(), 'logs');

  private static createLogFolderIfNotExists() {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory);
    }
  }

  public static configureLogger() {
    this.createLogFolderIfNotExists();
    const loggerTransports = [
      {
        type: 'console',
        options: {
          format: winston.format.combine(
              winston.format.simple(),
              winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
              winston.format.printf((info) => {
                return `${(info.level).toUpperCase()}${info.level.length < 5 ? '  ' : ' '}: ${info.message}`;
              })
          ),
        },
      },
      {
        type: 'file-rotate',
        options: {
          format: winston.format.combine(
              winston.format.simple(),
              winston.format.timestamp({format: 'YYYY-MM-DDTHH:mm:ss'}),
              winston.format.printf((info) => {
                return `${info.timestamp}: ${(info.level).toUpperCase()}${info.level.length < 5 ? '  ' : ' '}: ${info.message}`;
              })
          ),
          filename: path.join(this.logDirectory, 'magikube-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          maxSize: '1g',
        },
      },
    ];

    this.consoleLogger = createLogger({
      level: process.env.DROP_LOGS === 'true' ? 'info' : 'debug',
      transports: LoggerGenerator.createConsoleTransport(loggerTransports[0].options),
      exitOnError: false,
    })

    this.fileLogger = createLogger({
      level: process.env.DROP_LOGS === 'true' ? 'info' : 'debug',
      transports: LoggerGenerator.createFileRotateTransport(loggerTransports[1].options),
      exitOnError: false,
    })
  }

  public static debug(value: any, enableConsole: boolean = false) {
    this.fileLogger.log('debug', value);
    if (enableConsole) {
      this.consoleLogger.log('debug', value);
    }
  }

  public static error(value: any, enableConsole: boolean = false) {
    this.fileLogger.log('error', value);
    if (enableConsole) {
      this.consoleLogger.log('error', value);
    }
  }

  public static warn(value: any, enableConsole: boolean = false) {
    this.fileLogger.log('warn', value);
    if (enableConsole) {
      this.consoleLogger.log('warn', value);
    }
  }

  public static info(value: any, enableConsole: boolean = false) {
    this.fileLogger.log('info', value);
    if (enableConsole) {
      this.consoleLogger.log('info', value);
    }
  }
}