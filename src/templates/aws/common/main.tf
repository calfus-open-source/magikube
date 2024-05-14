provider "aws" {
  region     = var.region
}

terraform {
  backend "s3" {
    bucket  = var.tfstate_bucket
    encrypt = var.tfstate_bucket_encryption
    key     = var.tfstate_key
    region  = var.region
  }
}


module "aws_eks" {
  source                 = "../modules/eks"
}


