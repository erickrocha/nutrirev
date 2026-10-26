# Generate a random password if custom admin_password is not provided
resource "random_password" "db_password" {
  count   = var.admin_password == "" ? 1 : 0
  length  = 24
  special = false
}

locals {
  db_password = var.admin_password != "" ? var.admin_password : random_password.db_password[0].result
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name        = "${var.name_prefix}-db-subnet-group-${var.environment}"
  subnet_ids  = var.db_subnet_ids
  description = "Database subnet group for ${var.name_prefix} ${var.environment}"

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-db-subnet-group-${var.environment}"
      Environment = var.environment
    }
  )
}

# DB Parameter Group
resource "aws_db_parameter_group" "main" {
  name   = "${var.name_prefix}-db-pg-${var.environment}"
  family = "${var.engine}${split(".", var.engine_version)[0]}.${split(".", var.engine_version)[1]}"

  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }

  parameter {
    name  = "collation_server"
    value = "utf8mb4_unicode_ci"
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-db-pg-${var.environment}"
      Environment = var.environment
    }
  )
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier            = "${var.name_prefix}-rds-${var.environment}"
  engine                = var.engine
  engine_version        = var.engine_version
  instance_class        = var.instance_class
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage

  db_name  = var.database_name
  username = var.admin_username
  password = local.db_password
  port     = 3306

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.rds_security_group_id]
  parameter_group_name   = aws_db_parameter_group.main.name

  multi_az            = var.multi_az
  publicly_accessible = true
  storage_encrypted   = true

  backup_retention_period    = var.backup_retention_period
  backup_window              = "03:00-04:00"
  maintenance_window         = "Mon:04:00-Mon:05:00"
  auto_minor_version_upgrade = true

  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = var.skip_final_snapshot
  final_snapshot_identifier = "${var.name_prefix}-rds-final-snapshot-${var.environment}"

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-rds-${var.environment}"
      Environment = var.environment
    }
  )
}

# AWS Secrets Manager Secret for DB Credentials
resource "aws_secretsmanager_secret" "db_credentials" {
  name        = "${var.name_prefix}-db-credentials-${var.environment}"
  description = "RDS MariaDB connection details for ${var.name_prefix} ${var.environment}"

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-db-credentials-${var.environment}"
      Environment = var.environment
    }
  )
}

resource "aws_secretsmanager_secret_version" "db_credentials" {
  secret_id = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    engine   = var.engine
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    db_name  = var.database_name
    username = var.admin_username
    password = local.db_password
    url      = "mysql://${var.admin_username}:${local.db_password}@${aws_db_instance.main.address}:${aws_db_instance.main.port}/${var.database_name}"
  })
}
