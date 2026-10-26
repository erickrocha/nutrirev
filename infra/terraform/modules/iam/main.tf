# 1. App Runner ECR Access Role (Assume Role for build.apprunner.amazonaws.com)
resource "aws_iam_role" "app_runner_access_role" {
  name = "${var.name_prefix}-apprunner-access-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-apprunner-access-role-${var.environment}"
      Environment = var.environment
    }
  )
}

# Attach AWS managed ECR access policy
resource "aws_iam_role_policy_attachment" "app_runner_ecr_access" {
  role       = aws_iam_role.app_runner_access_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# 2. App Runner Instance Role (Assume Role for tasks.apprunner.amazonaws.com)
resource "aws_iam_role" "app_runner_instance_role" {
  name = "${var.name_prefix}-apprunner-instance-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "tasks.apprunner.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-apprunner-instance-role-${var.environment}"
      Environment = var.environment
    }
  )
}

# Custom policy for App Runner instance to access S3 media bucket, SQS, and Secrets Manager
resource "aws_iam_policy" "app_runner_backend_permissions" {
  name        = "${var.name_prefix}-backend-permissions-${var.environment}"
  description = "Permissions for backend container running on App Runner (S3, SQS, Secrets Manager)"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3BucketAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          var.s3_bucket_arn,
          "${var.s3_bucket_arn}/*"
        ]
      },
      {
        Sid    = "SQSAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = "*"
      },
      {
        Sid    = "SecretsManagerAccess"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = var.secrets_manager_secret_arns
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "app_runner_instance_backend" {
  role       = aws_iam_role.app_runner_instance_role.name
  policy_arn = aws_iam_policy.app_runner_backend_permissions.arn
}
