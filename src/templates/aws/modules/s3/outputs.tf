output "tradefull_static_files_bucket" {
  description = "Name of the Tradefull Application Static Bucket"
  value       = aws_s3_bucket.tradefull_static_files.bucket
}

output "tradefull_customer_digital_assets_bucket" {
  description = "Name of the tradefll Customer Digital Assets Bucket"
  value       = aws_s3_bucket.tradefull_customer_digital_assets.bucket
}

output "tradefull_internal_customer_files_bucket" {
  description = "Name of the Tradefull Internal Customer Files Bucket"
  value       = aws_s3_bucket.tradefull_internal_customer_files.arn
}

output "tradefull_private_customers_files_bucket" {
  description = "Name of the Tradefull Private Customers Files Bucket"
  value       = aws_s3_bucket.tradefull_private_customers_files.arn
}

output "tradefull_static_files_bucket_regional_domain_name" {
  description = "Regional Domain Name of the Tradefull Application Static Bucket"
  value       = aws_s3_bucket.tradefull_static_files.bucket_regional_domain_name
}

output "tradefull_customer_digital_assets_bucket_regional_domain_name" {
  description = "Regional Domain Name of the tradefll Customer Digital Assets Bucket"
  value       = aws_s3_bucket.tradefull_customer_digital_assets.bucket_regional_domain_name
}

output "s3_secrets" {
  description = "S3 Secrets"
  value       = aws_secretsmanager_secret.s3_access_user_secret.name
}