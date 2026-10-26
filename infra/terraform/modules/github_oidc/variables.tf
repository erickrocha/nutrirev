variable "name_prefix" {
  description = "Prefix for resources created by this module"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. prod, staging)"
  type        = string
}

variable "github_org" {
  description = "GitHub organization or user that owns the repository"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name (without org/user prefix)"
  type        = string
}

variable "github_owner_id" {
  description = "Numeric GitHub ID of the org/user (e.g. from `gh api repos/OWNER/REPO --jq .owner.id`). Required because GitHub's OIDC token 'sub' claim uses the format 'login@id' instead of plain 'login' whenever the owner or repo has ever been renamed - matching on the stable ID (with a wildcard on the login) keeps the trust policy working across future renames."
  type        = string
}

variable "github_repo_id" {
  description = "Numeric GitHub ID of the repository (e.g. from `gh api repos/OWNER/REPO --jq .id`). See github_owner_id for why this is needed instead of the plain repo name."
  type        = string
}

variable "github_allowed_refs" {
  description = "Git refs allowed to assume this role, e.g. [\"ref:refs/heads/main\"]. Use [\"*\"] to allow any ref (not recommended)."
  type        = list(string)
  default     = ["ref:refs/heads/main"]
}

variable "create_oidc_provider" {
  description = "Whether to create the GitHub Actions OIDC identity provider. Set false and provide existing_oidc_provider_arn if the AWS account already federates with token.actions.githubusercontent.com."
  type        = bool
  default     = true
}

variable "existing_oidc_provider_arn" {
  description = "ARN of an existing GitHub OIDC provider to reuse when create_oidc_provider is false"
  type        = string
  default     = ""
}

variable "terraform_state_bucket_arn" {
  description = "ARN of the S3 bucket used for Terraform remote state"
  type        = string
}

variable "terraform_lock_table_arn" {
  description = "ARN of the DynamoDB table used for Terraform state locking"
  type        = string
}

variable "tags" {
  description = "Map of tags to assign to resources"
  type        = map(string)
  default     = {}
}
