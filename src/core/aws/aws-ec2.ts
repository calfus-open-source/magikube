import AWSProject from './aws-project.js';
import AWSBackend from "./aws-backend.js";

export default class AWSEC2Project extends AWSProject {    
    async createProject(name: string, path: string): Promise<void> {
        super.createProject(name, path);
        AWSBackend.create(
          this,
          `${this.config.project_id}-tfstate`,
          this.config.aws_region,
          this.config.aws_access_key_id,
          this.config.aws_secret_access_key
        );
        this.createMainFile();
    }

    async createMainFile(): Promise<void> {
        this.createFile('main.tf', '../templates/aws/k8s/main.tf.liquid');
        this.createFile('terraform.tfvars', '../templates/aws/k8s/terraform.tfvars.liquid');
        this.createFile('variables.tf', '../templates/aws/k8s/variables.tf.liquid');
        this.createBastionHost();
        this.createMasterNode();
        this.createWorkerNode();
        this.createVpc();        
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
