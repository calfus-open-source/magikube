import {transports, createLogger} from 'winston';
import 'winston-daily-rotate-file';

export class LoggerGenerator {
  public static createConsoleTransport(options: object) {
    return new transports.Console(options);
  }

  public static createFileRotateTransport(options: object) {
    return new transports.DailyRotateFile(options);
  }
}