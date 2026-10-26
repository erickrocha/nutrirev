output "backend_app_runner_url" {
  description = "Public HTTPS URL for Backend App Runner Service"
  value       = module.app_runner.backend_service_url
}

output "frontend_app_runner_url" {
  description = "Public HTTPS URL for Frontend App Runner Service"
  value       = module.app_runner.frontend_service_url
}

output "rds_endpoint" {
  description = "Connection endpoint for RDS MariaDB instance"
  value       = module.rds.db_instance_endpoint
}

output "rds_secret_name" {
  description = "AWS Secrets Manager Secret Name containing RDS credentials"
  value       = module.rds.secrets_manager_secret_name
}

output "ecr_backend_repository_url" {
  description = "ECR Repository URL for Backend Docker image"
  value       = module.ecr.backend_repository_url
}

output "ecr_frontend_repository_url" {
  description = "ECR Repository URL for Frontend Docker image"
  value       = module.ecr.frontend_repository_url
}

output "s3_media_bucket_name" {
  description = "S3 Bucket Name for media uploads"
  value       = module.s3.bucket_name
}

output "vpc_id" {
  description = "ID of the VPC created for production"
  value       = module.vpc.vpc_id
}

output "github_actions_role_arn" {
  description = "IAM role ARN GitHub Actions assumes via OIDC to deploy this stack"
  value       = module.github_oidc.role_arn
}

output "app_secrets_arn" {
  description = "ARN of the Secrets Manager secret holding JWT/sysadmin/AI-provider secrets"
  value       = aws_secretsmanager_secret.app_secrets.arn
}
