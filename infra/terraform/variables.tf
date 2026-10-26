variable "aws_region" {
  description = "AWS region to deploy infrastructure"
  type        = string
  default     = "us-east-1"
}

variable "name_prefix" {
  description = "Prefix used for naming infrastructure resources"
  type        = string
  default     = "nutrirev"
}

variable "environment" {
  description = "Deployment environment (e.g. prod, staging, dev)"
  type        = string
  default     = "prod"
}

variable "availability_zones" {
  description = "List of availability zones to use"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# RDS Configuration
variable "database_name" {
  description = "Name of the MariaDB/MySQL database"
  type        = string
  default     = "nutrirev_prod"
}

variable "db_admin_username" {
  description = "Master username for RDS MariaDB"
  type        = string
  default     = "nutrirev_admin"
}

variable "db_admin_password" {
  description = "Master password for RDS MariaDB (if left blank, a random password is generated)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "rds_engine_version" {
  description = "MariaDB engine version for RDS. Verify availability first: aws rds describe-db-engine-versions --engine mariadb --query \"DBEngineVersions[].EngineVersion\""
  type        = string
  default     = "11.8.8"
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "rds_multi_az" {
  description = "Enable Multi-AZ for RDS"
  type        = bool
  default     = false
}

variable "db_allowed_cidr_blocks" {
  description = "CIDR blocks allowed to reach RDS directly over the internet (e.g. your public IP as x.x.x.x/32). Get yours with: curl -s https://checkip.amazonaws.com"
  type        = list(string)
}

# App Runner Configuration
variable "backend_image_tag" {
  description = "Tag of backend container image in ECR to deploy"
  type        = string
  default     = "latest"
}

variable "frontend_image_tag" {
  description = "Tag of frontend container image in ECR to deploy"
  type        = string
  default     = "latest"
}

variable "enable_frontend_service" {
  description = "Whether to deploy the frontend container to App Runner"
  type        = bool
  default     = true
}

# Application Secrets (JWT signing keys, sysadmin bootstrap creds, AI provider key)
# Set these via terraform.tfvars (gitignored) or TF_VAR_* environment variables / CI secrets.
# Never reuse the dev values from backend/.env.
variable "access_token_secret" {
  description = "JWT access token signing secret/key for the backend"
  type        = string
  sensitive   = true
}

variable "refresh_token_secret" {
  description = "JWT refresh token signing secret/key for the backend"
  type        = string
  sensitive   = true
}

variable "sysadmin_email" {
  description = "Email for the auto-seeded sysadmin user"
  type        = string
}

variable "sysadmin_password" {
  description = "Password for the auto-seeded sysadmin user"
  type        = string
  sensitive   = true
}

variable "claude_api_key" {
  description = "Anthropic Claude API key used for meal analysis (AI_PROVIDER=claude)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "claude_model" {
  description = "Anthropic Claude model ID for meal/body analysis (CLAUDE_MODEL)"
  type        = string
  default     = "claude-sonnet-5"
}

variable "gemini_api_key" {
  description = "Google Gemini API key, used as the AI fallback provider (GEMINI_API_KEY)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "gemini_model" {
  description = "Google Gemini model ID for the AI fallback provider (GEMINI_MODEL)"
  type        = string
  default     = "gemini-3-flash-preview"
}

variable "ai_primary_provider" {
  description = "Primary AI provider for meal/body analysis (AI_PRIMARY_PROVIDER: claude, gemini, openai, or ollama)"
  type        = string
  default     = "claude"
}

variable "ai_fallback_provider" {
  description = "Fallback AI provider used if the primary fails (AI_FALLBACK_PROVIDER: claude, gemini, openai, ollama, or none)"
  type        = string
  default     = "gemini"
}

variable "ai_timeout_ms" {
  description = "Per-attempt timeout in milliseconds for AI provider calls (AI_TIMEOUT_MS)"
  type        = number
  default     = 45000
}

# GitHub Actions OIDC (CI/CD)
variable "github_org" {
  description = "GitHub organization/user that owns the repository (for OIDC trust policy)"
  type        = string
  default     = "erickrocha"
}

variable "github_repo" {
  description = "GitHub repository name (for OIDC trust policy)"
  type        = string
  default     = "nutrirev"
}

variable "github_owner_id" {
  description = "Numeric GitHub ID of github_org (gh api repos/OWNER/REPO --jq .owner.id) - see modules/github_oidc for why this is needed"
  type        = string
  default     = "4175157"
}

variable "github_repo_id" {
  description = "Numeric GitHub ID of the repository (gh api repos/OWNER/REPO --jq .id) - see modules/github_oidc for why this is needed"
  type        = string
  default     = "1333517874"
}

variable "terraform_state_bucket" {
  description = "Name of the S3 bucket used for Terraform remote state (must match backend.tf and be bootstrapped beforehand)"
  type        = string
  default     = "nutrirev-terraform-state-prod"
}

variable "terraform_lock_table" {
  description = "Name of the DynamoDB table used for Terraform state locking (must match backend.tf and be bootstrapped beforehand)"
  type        = string
  default     = "nutrirev-terraform-locks"
}

variable "extra_tags" {
  description = "Additional tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "meal_photo_retention_days" {
  description = "Dias até a expiração automática das fotos de refeição no S3. Ver a regra de ciclo de vida em modules/s3."
  type        = number
  default     = 365
}
