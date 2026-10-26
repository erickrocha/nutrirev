# Remote State Backend Configuration
#
# Bootstrap once (before `terraform init`), since Terraform can't create the
# backend it's about to store its own state in:
#
#   aws s3api create-bucket --bucket nutrirev-terraform-state-prod --region us-east-1
#   aws s3api put-bucket-versioning --bucket nutrirev-terraform-state-prod \
#     --versioning-configuration Status=Enabled
#   aws s3api put-bucket-encryption --bucket nutrirev-terraform-state-prod \
#     --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
#   aws dynamodb create-table --table-name nutrirev-terraform-locks \
#     --attribute-definitions AttributeName=LockID,AttributeType=S \
#     --key-schema AttributeName=LockID,KeyType=HASH \
#     --billing-mode PAY_PER_REQUEST
#
# Adjust bucket/region/table below if you used different names.

terraform {
  backend "s3" {
    bucket         = "nutrirev-terraform-state-prod"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "nutrirev-terraform-locks"
    encrypt        = true
  }
}
