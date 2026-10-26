output "app_runner_access_role_arn" {
  description = "ARN of the IAM access role for App Runner to pull ECR images"
  value       = aws_iam_role.app_runner_access_role.arn
}

output "app_runner_instance_role_arn" {
  description = "ARN of the IAM instance role for App Runner application tasks"
  value       = aws_iam_role.app_runner_instance_role.arn
}
