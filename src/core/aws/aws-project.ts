import BaseProject from '../base-project.js';
import AWSTerraformBackend from "./aws-tf-backend.js";
import AWSPolicies from "./aws-iam.js";
import { AppLogger } from '../../logger/appLogger.js';
import CreateApplication from '../setup-application.js';
import BaseCommand from '../../commands/base.js';
import AnsibleUtils from '../utils/ansible-utils.js';
import TerraformUtils from '../utils/terraform-utils.js';

let sshProcess: any;

export default class AWSProject extends BaseProject {
    async createProject(name: string, path: string): Promise<void> {
        await super.createProject(name, path);
    
        if (!this.config.dryrun) {
            await AWSPolicies.create(
                this,
                this.config.aws_region,
                this.config.aws_access_key_id,
                this.config.aws_secret_access_key
                );
        
            await AWSTerraformBackend.create(
                this,
                this.config.project_id,
                this.config.aws_region,
                this.config.aws_access_key_id,
                this.config.aws_secret_access_key
            );
        }
    }

    async destroyProject(name: string, path: string): Promise<void> {
        let awsStatus = false;
        if (this.config.cloud_provider === 'aws') {
            awsStatus = true;
        }
        let command: BaseCommand | undefined;
        const createApplication = new CreateApplication(command as BaseCommand, this.config)
        if (!this.config.dryrun) {
            // Once the prompts are accepted at the start, these parameters will be accessible
            const  {git_user_name, github_access_token, github_owner, project_name} = this.config;
            let frontend_app_name;
            let backend_app_name;
            if(this.config.frontend_app_type == "react") {
                frontend_app_name = this.config.react_app_name;
            }
            if (this.config.frontend_app_type == "next") {
                frontend_app_name = this.config.next_app_name;
            }
            if (this.config.backend_app_type == "node-express") {
                backend_app_name = this.config.node_app_name;
            }
            await createApplication.destroyApp(git_user_name, github_access_token, github_owner, frontend_app_name, backend_app_name, project_name);
            
            if (awsStatus) {
                await super.destroyProject(name, path);
            }

            const status = await AWSPolicies.delete(
                this,
                this.config.aws_region,
                this.config.aws_access_key_id,
                this.config.aws_secret_access_key
            );


            if (status) {
                awsStatus = await AWSTerraformBackend.delete(
                    this,
                    this.config.project_id,
                    this.config.aws_region,
                    this.config.aws_access_key_id,
                    this.config.aws_secret_access_key
                );
            }
        }
    }

    async createCommon(): Promise<void> {
        this.createVpc();
        this.createACM();
        this.createRoute53();
        this.createGitOps();
        this.createIngressController();
    }

    async createVpc(): Promise<void> {
        this.createFile('main.tf', '../templates/aws/modules/vpc/main.tf.liquid', './modules/vpc');
        this.createFile('variables.tf', '../templates/aws/modules/vpc/variables.tf.liquid', './modules/vpc');
    }
    
    async createRoute53(): Promise<void> {
        this.createFile('main.tf', '../templates/aws/modules/route53/main.tf.liquid', './modules/route53');
        this.createFile('variables.tf', '../templates/aws/modules/route53/variables.tf.liquid', './modules/route53');
    }

    async createIngressController(): Promise<void> {
        this.createFile('main.tf', '../templates/aws/modules/ingress-controller/main.tf.liquid', './modules/ingress-controller');
        this.createFile('variables.tf', '../templates/aws/modules/ingress-controller/variables.tf.liquid', './modules/ingress-controller');
    }

    async createACM(): Promise<void> {
        this.createFile('main.tf', '../templates/aws/modules/acm/main.tf.liquid', './modules/acm');
        this.createFile('variables.tf', '../templates/aws/modules/acm/variables.tf.liquid', './modules/acm');
    }

    async createGitOps(): Promise<void> {
        if (this.config.source_code_repository === "codecommit") {
          this.createFile(
            "main.tf",
            "../templates/aws/modules/gitops/main.tf.liquid",
            "./modules/gitops"
          );
          this.createFile(
            "variables.tf",
            "../templates/aws/modules/gitops/variables.tf.liquid",
            "./modules/gitops"
          );
        } else if (this.config.source_code_repository === "github") {
            this.createFile(
                "main.tf",
                "../templates/github/main.tf.liquid",
                "./modules/gitops"
            );
            this.createFile(
                "variables.tf",
                "../templates/github/variables.tf.liquid",
                "./modules/gitops"
            );
        }
    }

    async AWSProfileActivate(profileName: string) {
        process.env.AWS_PROFILE = profileName;
        this.command.log('AWS profile activated successfully.');
    }
    async k8sPreProcessing(ansibleUtils: AnsibleUtils, terraformUtils: TerraformUtils, responses: any, projectName: string):Promise<void> {
        try{
          await new Promise(resolve => setTimeout(resolve, 10000));
          await ansibleUtils?.runAnsiblePlaybook(process.cwd()+"/"+projectName, 'create-k8s-cluster.yml');
          await ansibleUtils?.runAnsiblePlaybook(process.cwd()+"/"+projectName, 'configure-k8s-cluster.yml');
          ansibleUtils?.startSSHProcess();
          const masterIP = await terraformUtils?.getMasterIp(process.cwd()+"/"+projectName);
          await ansibleUtils?.editKubeConfigFile(process.cwd()+"/"+projectName+"/templates/aws/ansible/config/"+masterIP+"/etc/kubernetes/admin.conf");
          await terraformUtils?.runTerraform(process.cwd()+"/"+projectName+"/k8s_config", `../${responses['environment']}-config.tfvars`, "module.ingress-controller", '../terraform.tfvars');
          ansibleUtils?.stopSSHProcess();
        } catch (error) {
          AppLogger.error(error);
        }
    }

}
