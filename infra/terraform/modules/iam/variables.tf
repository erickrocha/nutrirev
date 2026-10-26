variable "name_prefix" {
  description = "Prefix for resources created by this module"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. prod, staging)"
  type        = string
}

variable "s3_bucket_arn" {
  description = "ARN of the S3 media bucket for application storage access"
  type        = string
}

variable "secrets_manager_secret_arns" {
  description = "ARNs of the Secrets Manager secrets the backend instance role should be able to read (DB credentials, app secrets)"
  type        = list(string)
}

variable "tags" {
  description = "Map of tags to assign to resources"
  type        = map(string)
  default     = {}
}
