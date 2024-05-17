import fs from 'fs';

class SystemConfig {
    private config: any = {};

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
            "terraform_version": "1.8.3",
            "aws_provider_version": "5.0.1",
        });
        fs.writeFileSync(path, data);
    }    
}

export default SystemConfig;