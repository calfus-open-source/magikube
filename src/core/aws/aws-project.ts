import BaseProject from '../base-project.js';
import AWSTerraformBackend from "./aws-tf-backend.js";
import AWSPolicies from "./aws-iam.js";

export default class AWSProject extends BaseProject {
    async createProject(name: string, path: string): Promise<void> {
        super.createProject(name, path);
    
        AWSPolicies.create(
            this,
            this.config.aws_region,
            this.config.aws_access_key_id,
            this.config.aws_secret_access_key
            );
    
        AWSTerraformBackend.create(
          this,
          this.config.project_id,
          this.config.aws_region,
          this.config.aws_access_key_id,
          this.config.aws_secret_access_key
        );
    }

    async destroyProject(name: string, path: string): Promise<void> {
        const status = await AWSPolicies.delete(
            this,
            this.config.aws_region,
            this.config.aws_access_key_id,
            this.config.aws_secret_access_key
        );

        if (status) {
            const backendStatus = await AWSTerraformBackend.delete(
                this,
                this.config.project_id,
                this.config.aws_region,
                this.config.aws_access_key_id,
                this.config.aws_secret_access_key
            );

            if (backendStatus) {
                super.destroyProject(name, path);
            }
        }
    }

    async createVpc(): Promise<void> {
        this.createFile('main.tf', '../templates/aws/modules/vpc/main.tf.liquid', './modules/vpc');
        this.createFile('variables.tf', '../templates/aws/modules/vpc/variables.tf.liquid', './modules/vpc');
    }    
}