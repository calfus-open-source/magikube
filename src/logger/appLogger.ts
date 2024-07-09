import { LoggerFactory } from './loggerFactory.js';
import fs from 'fs';
import path from 'path';
import 'winston-daily-rotate-file';
import winston from 'winston';

export class AppLogger {
  private static logger: any;
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

    this.logger = LoggerFactory.create(loggerTransports);
  }

  public static debug(value: any) {
    this.logger.log('debug', value);
  }

  public static error(value: any) {
    this.logger.log('error', value);
  }

  public static warn(value: any) {
    this.logger.log('warn', value);
  }

  public static info(value: any) {
    this.logger.log('info', value);
  }
}