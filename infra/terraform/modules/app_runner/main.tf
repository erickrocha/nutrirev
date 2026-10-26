# App Runner VPC Connector to enable private VPC networking (RDS access)
resource "aws_apprunner_vpc_connector" "main" {
  vpc_connector_name = "${var.name_prefix}-vpc-connector-${var.environment}"
  subnets            = var.private_app_subnet_ids
  security_groups    = [var.app_runner_security_group_id]

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-vpc-connector-${var.environment}"
      Environment = var.environment
    }
  )
}

# Auto Scaling Configuration
# Names are capped at 32 chars by the App Runner API.
resource "aws_apprunner_auto_scaling_configuration_version" "backend" {
  auto_scaling_configuration_name = "${var.name_prefix}-backend-asc-${var.environment}"

  max_concurrency = 100
  min_size        = 1
  max_size        = 10

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-backend-asc-${var.environment}"
      Environment = var.environment
    }
  )
}

resource "aws_apprunner_auto_scaling_configuration_version" "frontend" {
  count                           = var.enable_frontend_service ? 1 : 0
  auto_scaling_configuration_name = "${var.name_prefix}-frontend-asc-${var.environment}"

  max_concurrency = 100
  min_size        = 1
  max_size        = 5

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-frontend-asc-${var.environment}"
      Environment = var.environment
    }
  )
}

# Backend App Runner Service
resource "aws_apprunner_service" "backend" {
  service_name = "${var.name_prefix}-backend-${var.environment}"

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.backend.arn

  source_configuration {
    authentication_configuration {
      access_role_arn = var.access_role_arn
    }

    image_repository {
      image_identifier      = var.backend_image_url
      image_repository_type = "ECR"

      image_configuration {
        port = var.backend_port

        runtime_environment_variables = merge(
          {
            "APP_ENV"            = var.environment
            "HOST"               = "0.0.0.0"
            "PORT"               = var.backend_port
            "RUST_LOG"           = "info,myfit_application=debug,business=debug"
            "AWS_S3_BUCKET"      = var.s3_bucket_name
            "IMAGE_STORAGE_MODE" = var.image_storage_mode
          },
          var.extra_backend_env_vars
        )

        runtime_environment_secrets = merge(
          {
            "DB_CREDENTIALS_SECRET" = var.db_secret_arn
            "DATABASE_URL"          = "${var.db_secret_arn}:url::"
          },
          var.extra_backend_env_secrets
        )
      }
    }

    auto_deployments_enabled = true
  }

  instance_configuration {
    cpu               = "1024" # 1 vCPU
    memory            = "2048" # 2 GB
    instance_role_arn = var.instance_role_arn
  }

  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.main.arn
    }
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 5
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-backend-${var.environment}"
      Environment = var.environment
    }
  )
}

# Frontend App Runner Service (Nginx Container)
resource "aws_apprunner_service" "frontend" {
  count        = var.enable_frontend_service ? 1 : 0
  service_name = "${var.name_prefix}-frontend-${var.environment}"

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.frontend[0].arn

  source_configuration {
    authentication_configuration {
      access_role_arn = var.access_role_arn
    }

    image_repository {
      image_identifier      = var.frontend_image_url
      image_repository_type = "ECR"

      image_configuration {
        port = "8080"

        runtime_environment_variables = {
          "APP_ENV"     = var.environment
          "BACKEND_URL" = "https://${aws_apprunner_service.backend.service_url}"
        }
      }
    }

    auto_deployments_enabled = true
  }

  instance_configuration {
    cpu    = "512"  # 0.5 vCPU
    memory = "1024" # 1 GB
  }

  # DEFAULT (public) egress App Runner service creation was consistently failing at
  # deploy time in this account/region (reproduced even with AWS's own stock public
  # nginx image) - VPC egress via the same connector the backend uses is the proven
  # working path, so the frontend reuses it too even though it doesn't need outbound
  # VPC access itself.
  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.main.arn
    }
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 5
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-frontend-${var.environment}"
      Environment = var.environment
    }
  )
}
