import fs from 'fs';
import UserConfig from './user.js';

class SystemConfig {
    private config: any = {};
    private static _instance: SystemConfig;

    static getInstance(): SystemConfig {
        if (!SystemConfig._instance) {
            SystemConfig._instance = new SystemConfig();
            SystemConfig._instance.init();
        }

        return SystemConfig._instance;
    }

    configDir = `${process.env.HOME}/.config/magikube`;

    protected async init(): Promise<void> {
        //write initialization code which will check if system.json exists in the config directory
        //if it does not exist, create it with default values
        //if it does exist, load it into the systemConfig object
        //Also, check if user.json exists in the config directory
        //if it exists, load it into the userConfig object and override the default values in systemConfig

        if (!this.exists(`${this.configDir}/system.json`)) {
            fs.mkdirSync(this.configDir, { recursive: true });
            this.create(`${this.configDir}/system.json`);
        }

        this.load(`${this.configDir}/system.json`);

        if (this.exists(`${this.configDir}/user.json`)) {
            //load user.json into userConfig object
            const userConfig = new UserConfig();
            userConfig.load(`${this.configDir}/user.json`);
            //override the default values in systemConfig with the values in userConfig
            this.mergeConfigs(userConfig.getConfig());
        }
    }

    mergeConfigs(config: any): void {
        const systemConfig = this.getConfig();
        for (const key in config) {
            if (Object.prototype.hasOwnProperty.call(config, key)) {
                systemConfig[key] = config[key];
            }
        }
    }

    load(path: string): void {
        //load JSON from system.json form the path into this.config
        const data = fs.readFileSync(path, 'utf8');
        this.config = JSON.parse(data);
    }

    getConfig(): any {
        return this.config;
    }  
    
    exists(path: string): boolean {
        return fs.existsSync(path);
    }

    create(path: string): void {
        //create a new system.json file in the path with default values
        const data = JSON.stringify({
            "terraform_version": "1.8.2",
            "aws_provider_version": "5.34.0",
            "aws_vpc_module_version": "5.5.1",
            "aws_az_count": "2",
            "aws_vpc_cidr": "10.0.0.0/16",
        });
        fs.writeFileSync(path, data);
    }    
}

export default SystemConfig;