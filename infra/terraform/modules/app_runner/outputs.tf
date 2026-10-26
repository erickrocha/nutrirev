output "backend_service_url" {
  description = "Public URL of the Backend App Runner service"
  value       = "https://${aws_apprunner_service.backend.service_url}"
}

output "backend_service_arn" {
  description = "ARN of the Backend App Runner service"
  value       = aws_apprunner_service.backend.arn
}

output "backend_service_id" {
  description = "Service ID of the Backend App Runner service"
  value       = aws_apprunner_service.backend.service_id
}

output "frontend_service_url" {
  description = "Public URL of the Frontend App Runner service"
  value       = var.enable_frontend_service ? "https://${aws_apprunner_service.frontend[0].service_url}" : null
}

output "frontend_service_arn" {
  description = "ARN of the Frontend App Runner service"
  value       = var.enable_frontend_service ? aws_apprunner_service.frontend[0].arn : null
}

output "vpc_connector_arn" {
  description = "ARN of the App Runner VPC Connector"
  value       = aws_apprunner_vpc_connector.main.arn
}
