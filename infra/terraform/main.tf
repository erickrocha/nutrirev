data "aws_caller_identity" "current" {}

locals {
  tags = merge(
    {
      Project     = var.name_prefix
      Environment = var.environment
      ManagedBy   = "Terraform"
    },
    var.extra_tags
  )
}

# 1. VPC Module
module "vpc" {
  source = "./modules/vpc"

  name_prefix            = var.name_prefix
  environment            = var.environment
  availability_zones     = var.availability_zones
  db_allowed_cidr_blocks = var.db_allowed_cidr_blocks
  tags                   = local.tags
}

# 2. RDS MariaDB Module
module "rds" {
  source = "./modules/rds"

  name_prefix           = var.name_prefix
  environment           = var.environment
  vpc_id                = module.vpc.vpc_id
  db_subnet_ids         = module.vpc.public_subnet_ids
  rds_security_group_id = module.vpc.rds_security_group_id

  database_name  = var.database_name
  admin_username = var.db_admin_username
  admin_password = var.db_admin_password
  engine_version = var.rds_engine_version
  instance_class = var.rds_instance_class
  multi_az       = var.rds_multi_az

  tags = local.tags
}

# 2b. Application Secrets (JWT keys, sysadmin bootstrap creds, AI provider key)
resource "aws_secretsmanager_secret" "app_secrets" {
  name        = "${var.name_prefix}-app-secrets-${var.environment}"
  description = "Application secrets (JWT keys, sysadmin creds, AI provider key) for ${var.name_prefix} ${var.environment}"

  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    access_token_secret  = var.access_token_secret
    refresh_token_secret = var.refresh_token_secret
    sysadmin_email       = var.sysadmin_email
    sysadmin_password    = var.sysadmin_password
    claude_api_key       = var.claude_api_key
    gemini_api_key       = var.gemini_api_key
  })
}

# 3. ECR Module
module "ecr" {
  source = "./modules/ecr"

  name_prefix = var.name_prefix
  environment = var.environment
  tags        = local.tags
}

# 4. S3 Media Storage Module
module "s3" {
  source = "./modules/s3"

  name_prefix               = var.name_prefix
  environment               = var.environment
  meal_photo_retention_days = var.meal_photo_retention_days
  tags                      = local.tags
}

# 5. IAM Roles Module
module "iam" {
  source = "./modules/iam"

  name_prefix   = var.name_prefix
  environment   = var.environment
  s3_bucket_arn = module.s3.bucket_arn
  secrets_manager_secret_arns = [
    module.rds.secrets_manager_secret_arn,
    aws_secretsmanager_secret.app_secrets.arn,
  ]
  tags = local.tags
}

# 5b. GitHub Actions OIDC Role (for CI/CD)
module "github_oidc" {
  source = "./modules/github_oidc"

  name_prefix     = var.name_prefix
  environment     = var.environment
  github_org      = var.github_org
  github_repo     = var.github_repo
  github_owner_id = var.github_owner_id
  github_repo_id  = var.github_repo_id

  terraform_state_bucket_arn = "arn:aws:s3:::${var.terraform_state_bucket}"
  terraform_lock_table_arn   = "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/${var.terraform_lock_table}"

  tags = local.tags
}

# 6. App Runner Services Module
module "app_runner" {
  source = "./modules/app_runner"

  name_prefix                  = var.name_prefix
  environment                  = var.environment
  private_app_subnet_ids       = module.vpc.private_app_subnet_ids
  app_runner_security_group_id = module.vpc.app_runner_security_group_id
  access_role_arn              = module.iam.app_runner_access_role_arn
  instance_role_arn            = module.iam.app_runner_instance_role_arn

  backend_image_url       = "${module.ecr.backend_repository_url}:${var.backend_image_tag}"
  frontend_image_url      = "${module.ecr.frontend_repository_url}:${var.frontend_image_tag}"
  enable_frontend_service = var.enable_frontend_service

  db_secret_arn  = module.rds.secrets_manager_secret_arn
  s3_bucket_name = module.s3.bucket_name

  extra_backend_env_vars = {
    "CLAUDE_MODEL"         = var.claude_model
    "GEMINI_MODEL"         = var.gemini_model
    "AI_PRIMARY_PROVIDER"  = var.ai_primary_provider
    "AI_FALLBACK_PROVIDER" = var.ai_fallback_provider
    "AI_TIMEOUT_MS"        = tostring(var.ai_timeout_ms)
  }

  extra_backend_env_secrets = {
    "ACCESS_TOKEN_SECRET"  = "${aws_secretsmanager_secret.app_secrets.arn}:access_token_secret::"
    "REFRESH_TOKEN_SECRET" = "${aws_secretsmanager_secret.app_secrets.arn}:refresh_token_secret::"
    "SYSADMIN_EMAIL"       = "${aws_secretsmanager_secret.app_secrets.arn}:sysadmin_email::"
    "SYSADMIN_PASSWORD"    = "${aws_secretsmanager_secret.app_secrets.arn}:sysadmin_password::"
    "CLAUDE_API_KEY"       = "${aws_secretsmanager_secret.app_secrets.arn}:claude_api_key::"
    "GEMINI_API_KEY"       = "${aws_secretsmanager_secret.app_secrets.arn}:gemini_api_key::"
  }

  tags = local.tags
}
