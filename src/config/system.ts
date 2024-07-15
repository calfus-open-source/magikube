import fs from 'fs';
import UserConfig from './user.js';

class SystemConfig {
    private config: any = {};
    private static _instance: SystemConfig;
    private bastionSystemConfig: any = {
        "bastion_host_ami_owner": "099720109477",
        "bastion_host_ami_name": "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*",
        "bastion_host_ami_virtualization_type": "hvm",
        "bastion_instance_type": "t3.micro",
        "bastion_instance_count": "1",
    };

    private masterSystemConfig: any = {
        "master_host_ami_owner": "099720109477",
        "master_host_ami_name": "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*",
        "master_host_ami_virtualization_type": "hvm",
        "master_instance_type": "t3.medium",
        "master_instance_count": "1",
        "ebs_volume_size": "100",
        "ebs_volume_type": "gp2",
    };
    private workerSystemConfig: any = {
        "worker_host_ami_owner": "099720109477",
        "worker_host_ami_name": "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*",
        "worker_host_ami_virtualization_type": "hvm",
        "worker_instance_type": "t3.medium",
        "worker_instance_count": "2",
        "ebs_volume_size": "100",
        "ebs_volume_type": "gp2",
    };

    private kubernetesSystemConfig: any = {
        "ebs_vol_size": "100G",
        "service_cidr": "192.168.0.0/17",
        "pod_network_cidr": "192.168.128.0/17",
        "kube_version": "1.29",
        "kube_cni_version": "1.2.0-00",
        "disk_size": "100G",
        "kube_reserved_cpu": "100m",
        "kube_reserved_memory": "300Mi",
        "system_reserved_cpu": "100m",
        "system_reserved_memory": "200Mi",
        "eviction_memory_threshold": "100Mi",
    };

    private eksNodeGroupSystemConfig: any = {
        "node_host_ami_owner": "099720109477",
        "node_host_ami_name": "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*",
        "node_host_ami_virtualization_type": "hvm",
        "node_instance_type": "t3.medium",
        "node_desired_size": "2",
        "node_max_size": "3",
        "node_min_size": "1",
        "ebs_volume_size": "100",
        "ebs_volume_type": "gp2",
    };

    private nextAppConfig: any = {
        'next_app_name': "my-next-app"
    }

    private nodeAppConfig: any = {
        "node_app_name": "my-node-app"
    }

    private reactAppConfig: any = {
        "react_app_name": "my-react-app"
    }

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
        }

        this.create(`${this.configDir}/system.json`);
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
            "github_provider_version": "~> 6.0",
            "aws_provider_version": "5.50.0",
            "aws_vpc_module_version": "5.5.1",
            "aws_eks_module_version": "~> 20.0",
            "aws_eks_cluster_version": "1.30",
            "aws_load_balancer_controller_version": "1.8.0",
            "aws_az_count": "2",
            "aws_vpc_cidr": "10.0.0.0/16",
            ...this.bastionSystemConfig,
            ...this.masterSystemConfig,
            ...this.workerSystemConfig,
            ...this.kubernetesSystemConfig,
            ...this.eksNodeGroupSystemConfig,
            ...this.nextAppConfig,
            ...this.nodeAppConfig,
            ...this.reactAppConfig
        }, null, 4);
        fs.writeFileSync(path, data);
    }
}

export default SystemConfig;