import AWSProject from "./aws-project.js";
import BaseCommand from "../../commands/base.js";
import gitOpsProject from "../gitops/common-gitops.js";
import repositoryProject from "../code-repository/common-repository.js";
import argoCdProject from "../argocd/setup-argocd.js";
import SystemConfig from "../../config/system.js";

export default class AWSTemplateProject extends AWSProject {
  private path: string | undefined;
  private name: string | undefined;

  async createProject(name: string, path: string): Promise<void> {
    const config = SystemConfig.getInstance().getConfig();
    this.path = path;
    this.name = name;
    super.createProject(name, path);
    this.createMainFile(config);
  }

  async createMainFile(config: any): Promise<void> {
    let command: BaseCommand | undefined;
    this.createFile( "main.tf",`${process.cwd()}/dist/templates/${config.cloud_provider}/predefined/grouping-templates/${config.template}/main.tf.liquid`,"/infrastructure",true);
    this.createFile( "terraform.tfvars",`${process.cwd()}/dist/templates/${config.cloud_provider}/predefined/grouping-templates/${config.template}/terraform.tfvars.liquid`,"/infrastructure", true );
    this.createFile( "variables.tf",`${process.cwd()}/dist/templates/${config.cloud_provider}/predefined/grouping-templates/${config.template}/variables.tf.liquid`, "/infrastructure",true);
    this.createFile( `${this.config.environment}-config.tfvars`,`${process.cwd()}/dist/templates/${config.cloud_provider}/predefined/grouping-templates/${config.template}/backend-config.tfvars.liquid`,"/infrastructure", true);

    
    if (config.template === "eks-fargate-vpc" || config.template === "eks-nodegroup-vpc" || config.template === "rds-vpc" || config.template === "ec2-vpc" || config.template === "vpc-rds-nodegroup-acm-ingress") {
      this.createVpc();
    }
    if (config.template === "eks-fargate-vpc" ){
      this.createEKS();
    }
    if(config.template === "eks-nodegroup-vpc"){
      this.createEKSng();
    }
    if (config.template === "rds-vpc") {
      this.createRds(config);
    }
    if (config.template === "vpc-rds-nodegroup-acm-ingress") {
       this.createRds();
       this.createEKSng();
       this.createACM();
       this.createIngressController();
    }
    if(config.template === "ec2-vpc") {
      this.createSSHKeyPair(config);
      this.createBastionHost(config);
      this.createMasterNode(config);
      this.createSecurityGroup(config);  
      this.createFile('ssh-config.tftpl', `${process.cwd()}/dist/templates/${config.cloud_provider}/modules/ssh-config.tftpl`, "/infrastructure", true)
    }
  }

   async createSSHKeyPair(config:any) {
        this.createFile('main.tf', `${process.cwd()}/dist/templates/${config.cloud_provider}/modules/ssh-key/main.tf.liquid`, '/infrastructure/modules/ssh-key', true);
        this.createFile('variables.tf', `${process.cwd()}/dist/templates/${config.cloud_provider}/modules/ssh-key/variables.tf.liquid`, '/infrastructure/modules/ssh-key',true);
   }
   async createBastionHost(config:any) {
        this.createFile('main.tf', `${process.cwd()}/dist/templates/${config.cloud_provider}/modules/bastion/main.tf.liquid`, '/infrastructure/modules/bastion', true);
        this.createFile('variables.tf', `${process.cwd()}/dist/templates/aws/modules/bastion/variables.tf.liquid`, '/infrastructure/modules/bastion',true);
   } 
   async createMasterNode(config:any) {
        this.createFile('main.tf', `${process.cwd()}/dist/templates/${config.cloud_provider}/modules/master/main.tf.liquid`, '/infrastructure/modules/master', true);
        this.createFile('variables.tf', `${process.cwd()}/dist/templates/${config.cloud_provider}/modules/master/variables.tf.liquid`, '/infrastructure/modules/master', true);
    }
     async createSecurityGroup(config:any): Promise<void> {
        this.createFile('main.tf', `${process.cwd()}/dist/templates/${config.cloud_provider}/modules/security-groups/main.tf.liquid`, '/infrastructure/modules/security-groups', true);
        this.createFile('variables.tf', `${process.cwd()}/dist/templates/${config.cloud_provider}/modules/security-groups/variables.tf.liquid`, '/infrastructure/modules/security-groups', true);
    }
     async createEKSng(): Promise<void> {
    this.createFile(
      "main.tf",
      `${process.cwd()}/dist/templates/aws/modules/eks-nodegroup/main.tf.liquid`,
      "/infrastructure/modules/eks-nodegroup",
      true
    );
    this.createFile(
      "variables.tf",
      `${process.cwd()}/dist/templates/aws/modules/eks-nodegroup/variables.tf.liquid`,
      "/infrastructure/modules/eks-nodegroup",
      true
    );
  }

}
