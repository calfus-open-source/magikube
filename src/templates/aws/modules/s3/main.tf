#1. Tradeful static files S3 Bucket
resource "aws_s3_bucket" "tradefull_static_files" {
  bucket = "${var.name}-${var.environment}-${var.lc}-tradefull-static-files"
  tags = {
    Name             = "${var.name}-${var.environment}-${var.lc}-tradefull-static-files"
    "product"        = var.name
    "environment"    = var.environment
    "lifecycle"      = var.lc
    "terraform"      = "true"  
  }
}

#Tradeful static files S3 Bucket Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "s3encryption_tradefull_static_files" {
  bucket = aws_s3_bucket.tradefull_static_files.bucket

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_ownership_controls" "tradefull_static_files" {
  bucket = aws_s3_bucket.tradefull_static_files.id
  rule {
    object_ownership = "BucketOwnerPreferred"

  }
}

#Tradeful static files S3 Bucket Block Public Access
resource "aws_s3_bucket_public_access_block" "s3blockpublic_tradefull_static_files" {
  bucket                  = aws_s3_bucket.tradefull_static_files.id
  block_public_acls       = false
  block_public_policy     = true
  ignore_public_acls      = false
  restrict_public_buckets = true
}

#Tradeful static files S3 Bucket policy
resource "aws_s3_bucket_policy" "tradefull_static_files_bucket_policy" {
  bucket     = aws_s3_bucket.tradefull_static_files.id
  policy     = templatefile("${path.module}/s3_policy_static.json", merge({ "tradefull_static_files_bucket_arn" = "${aws_s3_bucket.tradefull_static_files.arn}", "static_cloudfront_arn" = "${var.static_cloudfront_arn}", "s3_iamuser_arn" = "${aws_iam_user.s3_access_user.arn}"  }))
  depends_on = [aws_s3_bucket.tradefull_static_files]
}

#2. Tradefull static customer digital assets S3 Bucket
resource "aws_s3_bucket" "tradefull_customer_digital_assets" {
  bucket = "${var.name}-${var.environment}-${var.lc}-tradefull-static-digital-assets"
  tags = {
    Name    = "${var.name}-${var.environment}-${var.lc}-tradefull-static-digital-assets"
    "product"        = var.name
    "environment"    = var.environment
    "lifecycle"      = var.lc
    "terraform"      = "true"  
  }
}

#Tradefull static customer digital assets S3 Bucket Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "s3encryption_tradefull_customer_digital_assets" {
  bucket = aws_s3_bucket.tradefull_customer_digital_assets.bucket

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_ownership_controls" "this_tradefull_customer_digital_assets" {
  bucket = aws_s3_bucket.tradefull_customer_digital_assets.id
  rule {
    object_ownership = "BucketOwnerPreferred"

  }
}

#Tradefull static customer digital assets S3 Bucket policy
resource "aws_s3_bucket_policy" "tradefull_customer_digital_assets_bucket_policy" {
  bucket     = aws_s3_bucket.tradefull_customer_digital_assets.id
  policy     = templatefile("${path.module}/s3_policy_static_digital_assets.json", merge({ "tradefull_customer_digital_assets_bucket_arn" = "${aws_s3_bucket.tradefull_customer_digital_assets.arn}", "static_cloudfront_arn" = "${var.static_cloudfront_arn}", "s3_iamuser_arn" = "${aws_iam_user.s3_access_user.arn}"  }))
  depends_on = [aws_s3_bucket.tradefull_customer_digital_assets]
}

#Tradefull static customer digital assets S3 Bucket Block Public Access
resource "aws_s3_bucket_public_access_block" "s3blockpublic_tradefull_customer_digital_assets" {
  bucket                  = aws_s3_bucket.tradefull_customer_digital_assets.id
  block_public_acls       = false
  block_public_policy     = true
  ignore_public_acls      = false
  restrict_public_buckets = true
}


#3. Tradefull internal customer files S3 Bucket
resource "aws_s3_bucket" "tradefull_internal_customer_files" {
  bucket = "${var.name}-${var.environment}-${var.lc}-tradefull-internal-customer-uploads"
  tags = {
    Name    = "${var.name}-${var.environment}-${var.lc}-tradefull-internal-customer-uploads"
  }
}

#Tradefull internal customer files S3 Bucket Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "s3encryption_tradefull_internal_customer_files" {
  bucket = aws_s3_bucket.tradefull_internal_customer_files.bucket

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_ownership_controls" "this_tradefull_internal_customer_files" {
  bucket = aws_s3_bucket.tradefull_internal_customer_files.id
  rule {
    object_ownership = "BucketOwnerEnforced"

  }
}
# Tradefull internal customer files S3 Bucket Block Public Access
resource "aws_s3_bucket_public_access_block" "s3blockpublic_tradefull_internal_customer_files" {
  bucket                  = aws_s3_bucket.tradefull_internal_customer_files.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

#Tradefull internal customer files S3 Bucket policy
resource "aws_s3_bucket_policy" "tradefull_internal_customer_files_bucket_policy" {
  bucket     = aws_s3_bucket.tradefull_internal_customer_files.id
  policy     = templatefile("${path.module}/s3_policy_internal_customers_uploads.json", merge({ "tradefull_internal_customer_files_bucket_arn" = "${aws_s3_bucket.tradefull_internal_customer_files.arn}", "s3_iamuser_arn" = "${aws_iam_user.s3_access_user.arn}"  }))
  depends_on = [aws_s3_bucket.tradefull_internal_customer_files]
}

#4. Tradefull private customer files S3 Bucket
resource "aws_s3_bucket" "tradefull_private_customers_files" {
  bucket = "${var.name}-${var.environment}-${var.lc}-tradefull-private-customer-files"
  tags = {
    Name    = "${var.name}-${var.environment}-${var.lc}-tradefull-private-customer-files"
    "product"        = var.name
    "environment"    = var.environment
    "lifecycle"      = var.lc
    "terraform"      = "true"  
  }
}

#Tradefull private customer files S3 Bucket Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "s3encryption_tradefull_private_customers_files" {
  bucket = aws_s3_bucket.tradefull_private_customers_files.bucket

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_ownership_controls" "this_tradefull_private_customers_files" {
  bucket = aws_s3_bucket.tradefull_private_customers_files.id
  rule {
    object_ownership = "BucketOwnerEnforced"

  }
}

#Tradefull private customer files S3 Bucket Block Public Access
resource "aws_s3_bucket_public_access_block" "s3blockpublic_tradefull_private_customers_files" {
  bucket                  = aws_s3_bucket.tradefull_private_customers_files.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}


#Tradefull private customer S3 Bucket policy
resource "aws_s3_bucket_policy" "tradefull_private_customers_files_bucket_policy" {
  bucket     = aws_s3_bucket.tradefull_private_customers_files.id
  policy     = templatefile("${path.module}/s3_policy_private_customers.json", merge({ "tradefull_private_customers_files_bucket_arn" = "${aws_s3_bucket.tradefull_private_customers_files.arn}", "s3_iamuser_arn" = "${aws_iam_user.s3_access_user.arn}"  }))
  depends_on = [aws_s3_bucket.tradefull_private_customers_files]
}

#IAM user for accessing s3 buckets
resource "aws_iam_user" "s3_access_user" {
  name = "${var.name}-${var.environment}-${var.lc}-s3-access-user"
  tags = {
    stackname = "${var.environment}-${var.lc}-s3-access-user"
    "product"        = var.name
    "environment"    = var.environment
    "lifecycle"      = var.lc
    "terraform"      = "true"
  }
}

#Create access keys for this user
resource "aws_iam_access_key" "s3_access_user_keys" {
  user = aws_iam_user.s3_access_user.name
}


#store these keys in secrets manager
resource "aws_secretsmanager_secret" "s3_access_user_secret" {
  name = "${var.name}-${var.environment}-${var.lc}-s3-secret-accesskeys"
  description = "Access key and secret key for s3 access"
  tags = {
    "product"        = var.name
    "environment"    = var.environment
    "lifecycle"      = var.lc
    "terraform"      = "true"  
  }
}

resource "aws_secretsmanager_secret_version" "s3_access_user_secret_version" {
  secret_id     = aws_secretsmanager_secret.s3_access_user_secret.id
  secret_string = jsonencode({
    access_key = aws_iam_access_key.s3_access_user_keys.id,
    secret_key = aws_iam_access_key.s3_access_user_keys.secret
  })
}

#1. Tradeful customer upload error files S3 Bucket
resource "aws_s3_bucket" "tradefull_internal_customer_upload_errors" {
  bucket = "${var.name}-${var.environment}-${var.lc}-tradefull-customer-upload-error-files"
  tags = {
    Name             = "${var.name}-${var.environment}-${var.lc}-tradefull-customer-upload-error-files"
    "product"        = var.name
    "environment"    = var.environment
    "lifecycle"      = var.lc
    "terraform"      = "true"  
  }
}

#Tradeful customer upload error files S3 Bucket Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "s3encryption_tradefull_internal_customer_upload_errors" {
  bucket = aws_s3_bucket.tradefull_internal_customer_upload_errors.bucket

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_ownership_controls" "tradefull_internal_customer_upload_errors" {
  bucket = aws_s3_bucket.tradefull_internal_customer_upload_errors.id
  rule {
    object_ownership = "BucketOwnerEnforced"

  }
}

#Tradeful customer upload error files S3 Bucket Block Public Access
resource "aws_s3_bucket_public_access_block" "s3blockpublic_tradefull_internal_customer_upload_errors" {
  bucket                  = aws_s3_bucket.tradefull_internal_customer_upload_errors.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

#Tradeful customer upload error files S3 Bucket policy
resource "aws_s3_bucket_policy" "tradefull_internal_customer_upload_errors_bucket_policy" {
  bucket     = aws_s3_bucket.tradefull_internal_customer_upload_errors.id
  policy     = templatefile("${path.module}/s3_policy_customer_uploads_error.json", merge({ "tradefull_internal_customer_upload_errors_bucket_arn" = "${aws_s3_bucket.tradefull_internal_customer_upload_errors.arn}", "s3_iamuser_arn" = "${aws_iam_user.s3_access_user.arn}"  }))
  depends_on = [aws_s3_bucket.tradefull_internal_customer_upload_errors]
}

#IAM user access policy
resource "aws_iam_policy" "main_bucket_policy" {
  name        = "${var.name}-${var.environment}-${var.lc}-s3-access-policy"
  description = "${var.name} ${var.environment} ${var.lc} IAM policy for accessing S3 buckets"

  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Effect" : "Allow",
        "Action" : [
          "s3:ListBucket"
        ],
        "Resource" : ["${aws_s3_bucket.tradefull_static_files.arn}", "${aws_s3_bucket.tradefull_customer_digital_assets.arn}", "${aws_s3_bucket.tradefull_internal_customer_files.arn}", "${aws_s3_bucket.tradefull_private_customers_files.arn}", "${aws_s3_bucket.tradefull_internal_customer_upload_errors.arn}"]
      },
      {
        "Effect" : "Allow",
        "Action" : [
          "s3:DeleteObject",
          "s3:GetObject",
          "s3:PutObject",
          "s3:PutObjectAcl"
        ],
        "Resource" : ["${aws_s3_bucket.tradefull_static_files.arn}/*", "${aws_s3_bucket.tradefull_customer_digital_assets.arn}/*"]
      },
      {
        "Effect" : "Allow",
        "Action" : [
          "s3:GetObject",
          "s3:PutObject",
          "s3:PutObjectAcl"
        ],
        "Resource" : ["${aws_s3_bucket.tradefull_internal_customer_files.arn}/*", "${aws_s3_bucket.tradefull_private_customers_files.arn}/*", "${aws_s3_bucket.tradefull_internal_customer_upload_errors.arn}"]
      }
    ]
  })
  tags = {
    "product"        = var.name
    "environment"    = var.environment
    "lifecycle"      = var.lc
    "terraform"      = "true"  
  }
}

#Attach IAM user the access policy
resource "aws_iam_user_policy_attachment" "s3_access_user_attachment" {
  user       = aws_iam_user.s3_access_user.name
  policy_arn = aws_iam_policy.main_bucket_policy.arn
}