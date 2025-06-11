export const BASTION_SYSTEM_CONFIG = Object.freeze({
  bastion_host_ami_owner: "099720109477",
  bastion_host_ami_name:
    "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*",
  bastion_host_ami_virtualization_type: "hvm",
  bastion_instance_type: "t3.micro",
  bastion_instance_count: "1",
});

export const MASTER_SYSTEM_CONFIG = Object.freeze({
  master_host_ami_owner: "099720109477",
  master_host_ami_name:
    "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*", 
  master_host_ami_virtualization_type: "hvm",
  master_instance_type: "t3.medium",
  master_instance_count: "1",
  ebs_volume_size: "100",
  ebs_volume_type: "gp2",
});

export const WORKER_SYSTEM_CONFIG = Object.freeze({
    "worker_host_ami_owner": "099720109477",
    "worker_host_ami_name": "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*",
    "worker_host_ami_virtualization_type": "hvm",                                         
    "worker_instance_type": "t3.medium",
    "worker_instance_count": "2",
    "ebs_volume_size": "100",
    "ebs_volume_type": "gp2",
});

export const KUBERNITIES_SYSTEM_CONFIG = Object.freeze({
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
});

export const EKSNODEGROUP_SYSTEM_CONFIG = Object.freeze( {
    "node_host_ami_owner": "099720109477",
    "node_host_ami_name": "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*",
    "node_host_ami_virtualization_type": "hvm",
    "node_instance_type": "t3.medium",
    "node_desired_size": "2",
    "node_max_size": "3",
    "node_min_size": "2",
    "ebs_volume_size": "100",
    "ebs_volume_type": "gp2",
});

export const NEXT_APP_CONFIG = Object.freeze({
    'next_app_name': "my-next-app"
});

export const NODE_APP_CONFIG = Object.freeze({
    "node_app_name": "my-node-app"
});

export const REACT_APP_CONFIG = Object.freeze({
    "react_app_name": "my-react-app"
});

export const GEN_AI_CONFIG = Object.freeze( {
    "genAI_app_name": "my-genAI-app"
});

