import { AppLogger } from "../logger/appLogger.js";
import SystemConfig from "../config/system.js";
import BaseCommand from "../commands/base.js";
import Application from "./application.js";
import { execSync } from 'child_process';
import fs from 'fs-extra';
import { ApplicationType, Technology } from "./constants.js";

export default abstract class ApplicationManager {

    static async initialize(): Promise<void> {
        AppLogger.debug('Initializing Application Manager');
        const appTemplatesDir = SystemConfig.getInstance().getConfig().magikube_cache || `${process.cwd()}/..`;
        if (!fs.existsSync(`${appTemplatesDir}/magikube-templates`)) {
          execSync('git clone https://github.com/calfus-open-source/magikube-templates.git', {
              cwd: `${appTemplatesDir}`,
              stdio: 'inherit'
          });
        } else {
          execSync('git pull', {
              cwd: `${appTemplatesDir}/magikube-templates`,
              stdio: 'inherit'
          });
        }  
    }
    
    static async createDefaultApplications(command: BaseCommand, config: any): Promise<Application[]> {
        const applications: Application[] = [];
        return applications;
    }

    static async createApplication(command: BaseCommand, applicationType: string, technology: string, name: string): Promise<Application | null> {
        const config = SystemConfig.getInstance().getConfig();
        AppLogger.info(`Creating ${applicationType} application '${name}' using ${technology}`);
        if ((applicationType === ApplicationType.FRONTEND || applicationType === ApplicationType.BACKEND) 
            && (technology === Technology.NEXT || technology === Technology.REACT || technology === Technology.NODE_EXPRESS)) {
            const app = new Application(name, applicationType, technology);
            return app;
        }
        command.error(`Cloud provider '${config.cloud_provider}' not supported`);
        return null;
    }    
}