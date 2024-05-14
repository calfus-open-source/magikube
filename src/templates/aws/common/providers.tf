terraform {
    required_version = "1.8.2"
    required_providers {
        aws = {
            source = "hashicorp/aws"
            version = "5.34.0"
        }
        kubernetes = {
            source = "hashicorp/kubernetes"
            version = "2.25.2"
        }
        helm = {
            source = "hashicorp/helm"
            version = "2.12.1"
        }        
    }
}
