// import { LoggerGenerator } from './LoggerGenerator.js';
// import fs from 'fs';
// import path from 'path';
// import 'winston-daily-rotate-file';
// import winston, { createLogger } from 'winston';

// export class AppLogger {
//   private static fileLogger: any;
//   private static consoleLogger: any;
//   private static logDirectory = path.join(process.cwd(), 'logs');

//   private static createLogFolderIfNotExists() {
//     if (!fs.existsSync(this.logDirectory)) {
//       fs.mkdirSync(this.logDirectory);
//     }
//   }
 
//   public static configureLogger(projectName?: string, shouldCreateLogFile: boolean = true) {
//     console.log(shouldCreateLogFile,"<<<<<<shouldCreateLogFile")
//     console.log(projectName,"<<<<<<<<projectName")
//     this.createLogFolderIfNotExists();
//       const filepath = path.join(this.logDirectory,'.' );
//       const oldFilePath =  path.join(this.logDirectory,`${projectName}-${new Date().toISOString().split('T')[0]}.log`);
//     if(shouldCreateLogFile){
//       try {
     
//         const files = fs.readdirSync(filepath);
//         console.log(files,"<<<<<<<<<<<files")
//         const prefix = `${projectName}-${new Date().toISOString().split('T')[0]}`;
//         console.log(prefix,"<<<<<<<<<<<<<prefix")
//         const count = files.filter(file => file.startsWith(prefix)).length;
//         console.log(count,"<<<<<<<<<<<<<count")

//         if (count >= 1) {
//           const newPath = path.join(this.logDirectory, `${projectName}-${new Date().toISOString().split('T')[0]}-${count}.log`);
//           console.log(newPath, "<<<<<<<<<<<<<newPath")
//           console.log(oldFilePath,"<<<<<<<<<oldFilePath")
//           fs.renameSync(oldFilePath, newPath);
//           console.log(fs.renameSync(oldFilePath, newPath),"<<<<<<<<<<<<fs.renameSync(oldFilePath, newPath)")
//         } 
//     } catch (err) {
//         AppLogger.error(`Failed to create the log file ${err}`, true)
//         process.exit(1)
//     }
//   }

//     const loggerTransports = [
//       {
//         type: 'console',
//         options: {
//           format: winston.format.combine(
//               winston.format.simple(),
//               winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
//               winston.format.printf((info) => {
//                 return `${(info.level).toUpperCase()}${info.level.length < 5 ? '  ' : ' '}: ${info.message}`;
//               })
//           ),
//         },
//       },
//       {
//         type: 'file-rotate',
//         options: {
//           format: winston.format.combine(
//               winston.format.simple(),
//               winston.format.timestamp({format: 'YYYY-MM-DDTHH:mm:ss'}),
//               winston.format.printf((info) => {
//                 return `${info.timestamp}: ${(info.level).toUpperCase()}${info.level.length < 5 ? '  ' : ' '}: ${info.message}`;
//               })
//           ),
//           filename: path.join(this.logDirectory, `${projectName}-%DATE%.log`),
//           datePattern: 'YYYY-MM-DD',
//           maxSize: '1g',
//         },
//       },
//     ];

//     this.consoleLogger = createLogger({
//       level: process.env.DROP_LOGS === 'true' ? 'info' : 'debug',
//       transports: LoggerGenerator.createConsoleTransport(loggerTransports[0].options),
//       exitOnError: false,
//     })

//     this.fileLogger = createLogger({
//       level: process.env.DROP_LOGS === 'true' ? 'info' : 'debug',
//       transports: LoggerGenerator.createFileRotateTransport(loggerTransports[1].options),
//       exitOnError: false,
//     })
  
// }

//   public static debug(value: any, enableConsole: boolean = false) {
//     this.fileLogger.log('debug', value);
//     if (enableConsole) {
//       this.consoleLogger.log('debug', value);
//     }
//   }

//   public static error(value: any, enableConsole: boolean = true) {
//     this.fileLogger.log('error', value);
//     if (enableConsole) {
//       this.consoleLogger.log('error', value);
//     }
//   }

//   public static warn(value: any, enableConsole: boolean = false) {
//     this.fileLogger.log('warn', value);
//     if (enableConsole) {
//       this.consoleLogger.log('warn', value);
//     }
//   }

//   public static info(value: any, enableConsole: boolean = false) {
//     this.fileLogger.log('info', value);
//     if (enableConsole) {
//       this.consoleLogger.log('info', value);
//     }
//   }
// }


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

  public static configureLogger(projectName?: string, shouldCreateLogFile: boolean = true) {
    console.log(shouldCreateLogFile, "<<<<<<shouldCreateLogFile");
    console.log(projectName, "<<<<<<<<projectName");

    // Ensure `logDirectory` is defined
    if (!this.logDirectory) {
      throw new Error("logDirectory is not defined.");
    }

    // Create log folder if it doesn’t exist
    this.createLogFolderIfNotExists();

    const filepath = path.join(this.logDirectory, '.');
    const oldFilePath = path.join(this.logDirectory, `${projectName}-${new Date().toISOString().split('T')[0]}.log`);

    // Log directory and file paths for troubleshooting
    console.log(`logDirectory: ${this.logDirectory}`);
    console.log(`oldFilePath: ${oldFilePath}`);

    if (shouldCreateLogFile) {
      try {
        const files = fs.readdirSync(filepath);
        console.log(files, "<<<<<<<<<<<files");

        const prefix = `${projectName}-${new Date().toISOString().split('T')[0]}`;
        console.log(prefix, "<<<<<<<<<<<prefix");

        const count = files.filter(file => file.startsWith(prefix)).length;
        console.log(count, "<<<<<<<<<<<count");

        if (count >= 1) {
          const newPath = path.join(this.logDirectory, `${projectName}-${new Date().toISOString().split('T')[0]}-${count}.log`);
          console.log(newPath, "<<<<<<<<<<<newPath");

          // Check if `oldFilePath` exists before renaming
          if (fs.existsSync(oldFilePath)) {
            try {
              fs.renameSync(oldFilePath, newPath);
              console.log("File renamed successfully:", oldFilePath, "to", newPath);
            } catch (renameError) {
              console.error(`Failed to rename log file: ${renameError}`);
            }
          } else {
            console.warn(`Old log file does not exist at path: ${oldFilePath}`);
          }
        }
      } catch (err) {
        AppLogger.error(`Failed to create the log file: ${err}`, true);
        process.exit(1);
      }
    }

    const loggerTransports = [
      {
        type: 'console',
        options: {
          format: winston.format.combine(
            winston.format.simple(),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf((info) => {
              return `${info.level.toUpperCase()}${info.level.length < 5 ? '  ' : ' '}: ${info.message}`;
            })
          ),
        },
      },
      {
        type: 'file-rotate',
        options: {
          format: winston.format.combine(
            winston.format.simple(),
            winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss' }),
            winston.format.printf((info) => {
              return `${info.timestamp}: ${info.level.toUpperCase()}${info.level.length < 5 ? '  ' : ' '}: ${info.message}`;
            })
          ),
          filename: path.join(this.logDirectory, `${projectName}-%DATE%.log`),
          datePattern: 'YYYY-MM-DD',
          maxSize: '1g',
        },
      },
    ];

    this.consoleLogger = createLogger({
      level: process.env.DROP_LOGS === 'true' ? 'info' : 'debug',
      transports: LoggerGenerator.createConsoleTransport(loggerTransports[0].options),
      exitOnError: false,
    });

    this.fileLogger = createLogger({
      level: process.env.DROP_LOGS === 'true' ? 'info' : 'debug',
      transports: LoggerGenerator.createFileRotateTransport(loggerTransports[1].options),
      exitOnError: false,
    });
  }

  public static debug(value: any, enableConsole: boolean = false) {
    this.fileLogger.log('debug', value);
    if (enableConsole) {
      this.consoleLogger.log('debug', value);
    }
  }

  public static error(value: any, enableConsole: boolean = true) {
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
