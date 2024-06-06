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
        this.copyFolderAndRender('../templates/aws/ansible', 'templates/aws/ansible');
        // this.createGitOps();
    }    
    
    // async createGitOps(): Promise<void> {
    //     if (this.config.source_code_repository === "codecommit") {
    //       this.createFile(
    //         "main.tf",
    //         "../templates/aws/modules/gitops/main.tf.liquid",
    //         "./modules/gitops"
    //       );
    //       this.createFile(
    //         "variables.tf",
    //         "../templates/aws/modules/gitops/variables.tf.liquid",
    //         "./modules/gitops"
    //       );
    //     } else if (this.config.source_code_repository === "github") {
    //         this.createFile(
    //             "main.tf",
    //             "../templates/github/main.tf.liquid",
    //             "./modules/gitops"
    //         );
    //         this.createFile(
    //             "variables.tf",
    //             "../templates/github/variables.tf.liquid",
    //             "./modules/gitops"
    //         );
    //     }
    // }

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
