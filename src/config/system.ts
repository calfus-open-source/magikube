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

    private ansibleSystemConfig: any = {
        "master_ip": "{{ hostvars[groups['k8s_master'][0]]['ansible_default_ipv4'].address | default(groups['k8s_master'][0]) }}",
        "worker_name": "{{ hostvars[groups['k8s_worker'][0]]['inventory_hostname'] }}",
        "worker_ip":  "{{ hostvars[groups['k8s_worker'][0]]['ansible_default_ipv4'].address }}",
    };

    private kubernetesSystemConfig: any = {
        "kafka_version": "25.1.11",
        "mongodb_version": "13.16.3",
        "postgres_version": "13.2.0",
        "keycloak_version": "21.0.2",
        "nginx_ingress_controller_version": "9.7.7",
        "redis_version": "18.0.4",
        "vault_version": "0.27.0",
        "prometheus_version": "25.4.0",
        "grafana_version": "9.6.3",
        "grafana_replicas": "1",
        "kubernetes_dashboard_replicas": "3",
        "kafka_replicas": "3",
        "mongodb_replicas": "3",
        "redis_master_count": "3",
        "postgres_read_replicas": "2",
        "keycloak_replicas": "1",
        "vault_replicas": "3",
        "ingress_controller_replicas": "3",
        "grafana_data_volume_size": "8Gi",
        "kafka_data_volume_size": "8Gi",
        "kafka_logs_volume_size": "2Gi",
        "mongodb_data_volume_size": "8Gi",
        "postgres_data_volume_size": "8Gi",
        "prometheus_server_data_volume_size": "4Gi",
        "prometheus_alertManager_data_volume_size": "1Gi",
        "vault_data_volume_size": "5100Mi"
    };
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
            "aws_provider_version": "5.50.0",
            "aws_vpc_module_version": "5.5.1",
            "aws_az_count": "2",
            "aws_vpc_cidr": "10.0.0.0/16",
            "worker_instance_type": "t3.medium",
            "worker_instance_count": "2",
            "aws_eks_module_version": "~> 20.0",
            "aws_eks_cluster_version": "1.29",
            "github_provider_version": "~> 6.0",
            ...this.bastionSystemConfig,
            ...this.masterSystemConfig,
            ...this.workerSystemConfig,
            ...this.ansibleSystemConfig,
            ...this.kubernetesSystemConfig,
        }, null, 4);
        fs.writeFileSync(path, data);
    }    
}

export default SystemConfig;