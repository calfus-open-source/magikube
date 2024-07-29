import { join } from 'path';
import AWSProject from './aws-project.js';
import BaseCommand from "../../commands/base.js";
import gitOpsProject from "../gitops/common-gitops.js";
import repositoryProject from "../code-repository/common-repository.js";

export default class AWSK8SProject extends AWSProject {    
    // save the project name and path in variables
    projectPath: string = '';
    projectName: string = '';
    private path:string | undefined

    async createProject(name: string, path: string): Promise<void> {
        this.projectName = name;
        this.projectPath = join(path, name); 
        this.path = path;
        await super.createProject(name, path);
        await this.createMainFile();
    }

    async createMainFile(): Promise<void> {
        let command: BaseCommand | undefined;
        const gitOpsInstance = new gitOpsProject(command as BaseCommand, this.config);
        const repositoryInstance = new repositoryProject(command as BaseCommand, this.config);
        //Wait for all the files generation tasks to run and in parallel execution
        await Promise.all([
            this.createFile('main.tf', '../templates/aws/k8s/main.tf.liquid'),
            this.createFile('terraform.tfvars', '../templates/aws/k8s/terraform.tfvars.liquid'),
            this.createFile('variables.tf', '../templates/aws/k8s/variables.tf.liquid'),
            this.createFile(
                `${this.config.environment}-config.tfvars`,
                "../templates/aws/k8s/backend-config.tfvars.liquid"
            ),
            this.createFile('main.tf', '../templates/aws/k8s/k8s_config/main.tf.liquid', 'k8s_config'),
            this.createFile('variables.tf', '../templates/aws/k8s/k8s_config/variables.tf.liquid', 'k8s_config'),
            this.createCommon(),        
            this.createSSHKeyPair(),
            this.createBastionHost(),
            this.createMasterNode(),
            this.createWorkerNode(),
            this.copyFolderAndRender('../templates/aws/ansible', 'templates/aws/ansible'),
            this.createFile('ssh-config.tftpl', '../templates/aws/k8s/ssh-config.tftpl'),
            gitOpsInstance.createGitOps(this.path, this.projectName),
            repositoryInstance.createrepository(this.path, this.projectName)
        ]);
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
