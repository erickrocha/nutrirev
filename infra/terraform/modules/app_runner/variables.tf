variable "name_prefix" {
  description = "Prefix for resources created by this module"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. prod, staging)"
  type        = string
}

variable "private_app_subnet_ids" {
  description = "List of private app subnet IDs for VPC Connector"
  type        = list(string)
}

variable "app_runner_security_group_id" {
  description = "Security group ID for App Runner VPC Connector"
  type        = string
}

variable "access_role_arn" {
  description = "IAM role ARN for App Runner ECR image access"
  type        = string
}

variable "instance_role_arn" {
  description = "IAM role ARN for App Runner runtime permissions (S3, SQS, etc)"
  type        = string
}

variable "backend_image_url" {
  description = "ECR image URL for backend container (e.g. 123456789.dkr.ecr.us-east-1.amazonaws.com/afrodite-backend:latest)"
  type        = string
}

variable "frontend_image_url" {
  description = "ECR image URL for frontend container"
  type        = string
  default     = ""
}

variable "enable_frontend_service" {
  description = "Deploy frontend as an App Runner service container"
  type        = bool
  default     = true
}

variable "backend_port" {
  description = "Port exposed by backend application container"
  type        = string
  default     = "8080"
}

variable "db_secret_arn" {
  description = "ARN of Secrets Manager secret containing RDS credentials (must expose a JSON 'url' key)"
  type        = string
}

variable "s3_bucket_name" {
  description = "Name of the S3 media bucket"
  type        = string
}

variable "image_storage_mode" {
  description = "Value for IMAGE_STORAGE_MODE env var (e.g. base64 or s3)"
  type        = string
  default     = "base64"
}

variable "extra_backend_env_vars" {
  description = "Map of additional plain environment variables for backend service"
  type        = map(string)
  default     = {}
}

variable "extra_backend_env_secrets" {
  description = "Map of additional Secrets Manager references for backend service (value format: \"<secret_arn>:<json_key>::\")"
  type        = map(string)
  default     = {}
}

variable "tags" {
  description = "Map of tags to assign to resources"
  type        = map(string)
  default     = {}
}
