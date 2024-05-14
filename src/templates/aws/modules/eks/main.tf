data "aws_availability_zones" "available" {}

data "aws_iam_group" "devops" {
  group_name = "devops"
}

locals {
  azs      = slice(data.aws_availability_zones.available.names, 0, 3)
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name       = "${var.cluster_name}-eks"
  cluster_version    = "${var.cluster_version}"

  kms_key_owners = data.aws_iam_group.devops.users[*].arn // look into this later

  cluster_endpoint_public_access  = var.cluster_endpoint_public_access != null ? var.cluster_endpoint_public_access : true

  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
  }

  subnet_ids               = var.vpc_private_subnets
  vpc_id                   = var.vpc_id
  #  control_plane_subnet_ids = ["subnet-xyzde987", "subnet-slkjf456", "subnet-qeiru789"]

  # Fargate Profile(s)
  fargate_profiles = merge(
    {
      for i in range(1) :
        "${var.name}-${var.environment}-${element(split("-", local.azs[i]), 2)}" => {
          name = "${var.name}-${var.environment}-${element(split("-", local.azs[i]), 2)}"
          selectors = [
            { namespace = "${var.name}-${var.environment}-*" },
          ]

          # We want to create a profile per AZ for high availability
          subnet_ids = [element(var.vpc_private_subnets, i)]

          timeouts = {
            create = "20m"
            delete = "20m"
          }
        }
    },
    { 
      for i in range(1) :
        "kube-system-${element(split("-", local.azs[i]), 2)}" => {
          selectors = [
            { namespace = "kube-system" }
          ]
          # We want to create a profile per AZ for high availability
          subnet_ids = [element(var.vpc_private_subnets, i)]
        }
    }
  )

  tags = {
    Name             = "${var.name}-${var.environment}-eks"
    "product"        = var.name
    "environment"    = var.environment
    "role"           = "eks"
    "terraform"      = "true"    
  }
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "cluster_certificate_authority_data" {
  value = module.eks.cluster_certificate_authority_data
}

output "cluster_oidc_issuer_url" {
  value = module.eks.cluster_oidc_issuer_url
}

output "oidc_provider" {
  value = module.eks.oidc_provider
}

output "oidc_provider_arn" {
  value = module.eks.oidc_provider_arn
}