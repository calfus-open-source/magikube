import fs from 'fs';

class UserConfig {
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
}

export default UserConfig;