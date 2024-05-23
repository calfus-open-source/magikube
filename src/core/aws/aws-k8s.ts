import AWSProject from './aws-project.js';

export default class AWSK8SProject extends AWSProject {    
    async createProject(name: string, path: string): Promise<void> {
        super.createProject(name, path);
        this.createMainFile();
    }

    async createMainFile(): Promise<void> {
        this.createFile('main.tf', '../templates/aws/k8s/main.tf.liquid');
        this.createFile('terraform.tfvars', '../templates/aws/k8s/terraform.tfvars.liquid');
        this.createFile('variables.tf', '../templates/aws/k8s/variables.tf.liquid');
        this.createSSHKeyPair();
        this.createBastionHost();
        this.createMasterNode();
        this.createWorkerNode();
        this.createVpc();        
    }    
    
    async createSSHKeyPair() {
        this.createFile('main.tf', '../templates/aws/k8s/ssh-key/main.tf.liquid', 'modules/ssh-key');
        this.createFile('variables.tf', '../templates/aws/k8s/ssh-key/variables.tf.liquid', 'modules/ssh-key');
    }
    async createBastionHost() {
        this.createFile('main.tf', '../templates/aws/k8s/bastion/main.tf.liquid', 'modules/bastion');
        this.createFile('variables.tf', '../templates/aws/k8s/bastion/variables.tf.liquid', 'modules/bastion');
    } 
    async createMasterNode() {
        this.createFile('main.tf', '../templates/aws/k8s/master/main.tf.liquid', 'modules/master');
        this.createFile('variables.tf', '../templates/aws/k8s/master/variables.tf.liquid', 'modules/master');
    }
    async createWorkerNode() {
        this.createFile('main.tf', '../templates/aws/k8s/worker/main.tf.liquid', 'modules/worker');
        this.createFile('variables.tf', '../templates/aws/k8s/worker/variables.tf.liquid', 'modules/worker');
    }
}
