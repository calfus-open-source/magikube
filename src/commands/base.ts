import {Command} from '@oclif/core'
import SystemConfig from '../config/system.js';
import { AppLogger } from '../logger/appLogger.js';

export default abstract class BaseCommand extends Command {
    async init(): Promise<void> {
        // do some initialization
        console.log('BaseCommand init');   
        AppLogger.configureLogger();
        AppLogger.info('Logger Started ...');

        AppLogger.debug(`Setting up system configuration`);
        const magikube_config = {
            "magikube_root": `${this.config.root}`,
            "magikube_cache": `${this.config.cacheDir}`,
        };
        const systemConfig = SystemConfig.getInstance(magikube_config);

        AppLogger.debug(`System configuration loaded: ${JSON.stringify(systemConfig.getConfig())}`);
    }
}
