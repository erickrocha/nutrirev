# GitHub Actions OIDC provider (skip if the AWS account already has one - only one can exist per URL)
data "tls_certificate" "github" {
  count = var.create_oidc_provider ? 1 : 0
  url   = "https://token.actions.githubusercontent.com/.well-known/openid-configuration"
}

resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github[0].certificates[0].sha1_fingerprint]

  tags = merge(
    var.tags,
    {
      Name        = "github-actions-oidc"
      Environment = var.environment
    }
  )
}

locals {
  oidc_provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : var.existing_oidc_provider_arn
}

# Role assumable by GitHub Actions workflows running in this repo, restricted to the allowed refs
resource "aws_iam_role" "github_actions" {
  name = "${var.name_prefix}-github-actions-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = local.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          }
          StringLike = {
            # GitHub emits "repo:<login>@<id>/<login>@<id>:<ref>" (not plain "repo:<owner>/<repo>:<ref>")
            # whenever the owner or repo has ever been renamed, to stop a renamed-away login from
            # inheriting trust. Match on the stable numeric IDs with a wildcard on the login portion
            # so this keeps working across future renames too.
            "token.actions.githubusercontent.com:sub" = [
              for ref in var.github_allowed_refs : "repo:*@${var.github_owner_id}/*@${var.github_repo_id}:${ref}"
            ]
          }
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-github-actions-${var.environment}"
      Environment = var.environment
    }
  )
}

# Permissions scoped to what this Terraform stack + build-and-push scripts actually touch.
# IAM/role management is restricted to resources named "${var.name_prefix}-*" so this role
# cannot escalate by modifying arbitrary IAM entities in the account.
resource "aws_iam_role_policy" "github_actions" {
  name = "${var.name_prefix}-github-actions-permissions-${var.environment}"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "TerraformState"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
        ]
        Resource = [
          var.terraform_state_bucket_arn,
          "${var.terraform_state_bucket_arn}/*",
        ]
      },
      {
        Sid      = "TerraformLock"
        Effect   = "Allow"
        Action   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
        Resource = var.terraform_lock_table_arn
      },
      {
        Sid    = "EcrPushPull"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:DescribeRepositories",
          "ecr:ListTagsForResource",
        ]
        Resource = "*"
      },
      {
        Sid    = "ManageStackIamRoles"
        Effect = "Allow"
        Action = ["iam:*"]
        Resource = [
          "arn:aws:iam::*:role/${var.name_prefix}-*",
          "arn:aws:iam::*:policy/${var.name_prefix}-*",
          "arn:aws:iam::*:instance-profile/${var.name_prefix}-*",
          "arn:aws:iam::*:oidc-provider/token.actions.githubusercontent.com",
        ]
      },
      {
        Sid    = "SecretsManager"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:CreateSecret",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecret",
          "secretsmanager:DeleteSecret",
          "secretsmanager:TagResource",
          "secretsmanager:GetResourcePolicy",
        ]
        Resource = "arn:aws:secretsmanager:*:*:secret:${var.name_prefix}-*"
      },
      {
        Sid    = "StackInfra"
        Effect = "Allow"
        # ec2 (VPC), rds, apprunner, and s3 bucket *creation* don't support fine-grained
        # resource-level ARNs for most of these actions, so this stays broad within these
        # services - normal for an infra-provisioning pipeline, scoped by service instead.
        Action = [
          "ec2:*",
          "rds:*",
          "apprunner:*",
          "s3:*",
          "ecr:CreateRepository",
          "ecr:DeleteRepository",
          "ecr:TagResource",
          "ecr:SetRepositoryPolicy",
          "ecr:GetRepositoryPolicy",
          "ecr:GetLifecyclePolicy",
          "ecr:PutLifecyclePolicy",
          "ecr:DeleteLifecyclePolicy",
        ]
        Resource = "*"
      },
    ]
  })
}
