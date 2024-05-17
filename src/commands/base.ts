import {Command} from '@oclif/core'
import SystemConfig from '../config/system.js';
import UserConfig from '../config/user.js';

export default abstract class BaseCommand extends Command {
    protected systemConfig: SystemConfig = new SystemConfig();
    protected userConfig: UserConfig = new UserConfig();

    protected async init(): Promise<void> {
        //write initialization code which will check if system.json exists in the config directory
        //if it does not exist, create it with default values
        //if it does exist, load it into the systemConfig object
        //Also, check if user.json exists in the config directory
        //if it exists, load it into the userConfig object and override the default values in systemConfig

        if (!this.systemConfig.exists(`${this.config.configDir}/system.json`)) {
            this.systemConfig.create(`${this.config.configDir}/system.json`);
        }

        this.systemConfig.load(`${this.config.configDir}/system.json`);

        if (this.userConfig.exists(`${this.config.configDir}/user.json`)) {
            //load user.json into userConfig object
            this.userConfig.load(`${this.config.configDir}/user.json`);
            //override the default values in systemConfig with the values in userConfig
            const userConfig = this.userConfig.getConfig();
            const systemConfig = this.systemConfig.getConfig();
            for (const key in userConfig) {
                if (Object.prototype.hasOwnProperty.call(userConfig, key)) {
                    systemConfig[key] = userConfig[key];
                }
            }            
        }
    }
}
