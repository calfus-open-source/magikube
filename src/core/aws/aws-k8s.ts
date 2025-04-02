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
        const projectPath = process.cwd();
        //Wait for all the files generation tasks to run and in parallel execution
        await Promise.all([
            this.createFile('main.tf', `${projectPath}/dist/templates/aws/k8s/main.tf.liquid`, "/infrastructure", true),
            this.createFile('terraform.tfvars', `${projectPath}/dist/templates/aws/k8s/terraform.tfvars.liquid` , "/infrastructure", true),
            this.createFile('variables.tf', `${projectPath}/dist/templates/aws/k8s/variables.tf.liquid` , "/infrastructure", true),
            this.createFile(`${this.config.environment}-config.tfvars`, `${projectPath}/dist/templates/aws/k8s/backend-config.tfvars.liquid` ,"/infrastructure/",true),
            this.createFile('main.tf', `${projectPath}/dist/templates/aws/k8s/k8s_config/main.tf.liquid`, '/infrastructure/', true),
            this.createFile('variables.tf', `${projectPath}/dist/templates/aws/k8s/k8s_config/variables.tf.liquid`, "/infrastructure", true),
            this.createCommon(projectPath),
            this.createSecurityGroup(projectPath),
            this.createALB(projectPath),       
            this.createSSHKeyPair( projectPath),
            this.createBastionHost(projectPath),
            this.createMasterNode(projectPath),
            this.createWorkerNode(projectPath),
            this.createProviderFile(projectPath),
            this.copyFolderAndRender(`${projectPath}/dist/templates/aws/ansible`, '/templates/aws/ansible'),
            this.createFile('ssh-config.tftpl', `${projectPath}/dist/templates/aws/k8s/ssh-config.tftpl`, "/infrastructure", true),
            gitOpsInstance.createGitOps(this.path, this.projectName),
            repositoryInstance.createrepository(this.path, this.projectName) ,
        ]);
    } 
    async createSecurityGroup(projectPath:string): Promise<void> {
        this.createFile('main.tf', `${projectPath}/dist/templates/aws/modules/security-groups/main.tf.liquid`, '/infrastructure/modules/security-groups', true);
        this.createFile('variables.tf', `${projectPath}/dist/templates/aws/modules/security-groups/variables.tf.liquid`, '/infrastructure/modules/security-groups', true);
    } 
    async createALB(projectPath:string) :Promise<void> {
        this.createFile('main.tf', `${projectPath}/dist/templates/aws/modules/alb/main.tf.liquid`, '/infrastructure/modules/alb', true);
        this.createFile('variables.tf', `${projectPath}/dist/templates/aws/modules/alb/variables.tf.liquid`, '/infrastructure/modules/alb', true);
    }  
    
    async createSSHKeyPair(projectPath:string) {
        this.createFile('main.tf', `${projectPath}/dist/templates/aws/k8s/ssh-key/main.tf.liquid`, '/infrastructure/modules/ssh-key', true);
        this.createFile('variables.tf', `${projectPath}/dist/templates/aws/k8s/ssh-key/variables.tf.liquid`, '/infrastructure/modules/ssh-key',true);
    }
    async createBastionHost(projectPath:string) {
        this.createFile('main.tf', `${projectPath}/dist/templates/aws/k8s/bastion/main.tf.liquid`, '/infrastructure/modules/bastion', true);
        this.createFile('variables.tf', `${projectPath}/dist/templates/aws/k8s/bastion/variables.tf.liquid`, '/infrastructure/modules/bastion',true);
    } 
    async createMasterNode(projectPath:string) {
        this.createFile('main.tf', `${projectPath}/dist/templates/aws/k8s/master/main.tf.liquid`, '/infrastructure/modules/master', true);
        this.createFile('variables.tf', `${projectPath}/dist/templates/aws/k8s/master/variables.tf.liquid`, '/infrastructure/modules/master', true);
    }
    async createWorkerNode(projectPath:string) {
        this.createFile('main.tf', `${projectPath}/dist/templates/aws/k8s/worker/main.tf.liquid`, '/infrastructure/modules/worker', true);
        this.createFile('variables.tf', `${projectPath}/dist/templates/aws/k8s/worker/variables.tf.liquid`, '/infrastructure/modules/worker', true);
    }
}