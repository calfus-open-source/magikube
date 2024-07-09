import {transports, createLogger} from 'winston';
import 'winston-daily-rotate-file';

export class LoggerFactory {
  private static createConsoleTransport(options: object) {
    return new transports.Console(options);
  }

  private static createFileRotateTransport(options: object) {
    return new transports.DailyRotateFile(options);
  }

  private static getLoggerTransports(loggerTransports: any) {
    return loggerTransports.map((transport: any) => {
      const {type, options} = transport;

      switch (type) {
        case 'console':
          return this.createConsoleTransport(options);
        case 'file-rotate':
          return this.createFileRotateTransport(options);
      }
    });
  }

  public static create(loggerTransports: object[]) {
    return createLogger({
      level: process.env.DROP_LOGS === 'true' ? 'info' : 'debug',
      transports: this.getLoggerTransports(loggerTransports),
      exitOnError: false,
    });
  }
}