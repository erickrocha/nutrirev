variable "name_prefix" {
  description = "Prefix for resources created by this module"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. prod, staging)"
  type        = string
}

variable "vpc_id" {
  description = "The ID of the VPC"
  type        = string
}

variable "db_subnet_ids" {
  description = "List of subnet IDs for DB Subnet Group"
  type        = list(string)
}

variable "rds_security_group_id" {
  description = "Security Group ID for RDS"
  type        = string
}

variable "database_name" {
  description = "Name of the initial database to create"
  type        = string
  default     = "nutrirev_prod"
}

variable "admin_username" {
  description = "Master username for database administrator"
  type        = string
  default     = "nutrirev_admin"
}

variable "admin_password" {
  description = "Master password for database (if empty, a random secure password will be generated)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "engine" {
  description = "Database engine type (mariadb or mysql)"
  type        = string
  default     = "mariadb"
}

variable "engine_version" {
  description = "Database engine version"
  type        = string
  default     = "11.4"
}

variable "instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t4g.micro"
}

variable "allocated_storage" {
  description = "Allocated storage size in GB"
  type        = number
  default     = 20
}

variable "max_allocated_storage" {
  description = "Max storage limit in GB for autoscaling"
  type        = number
  default     = 100
}

variable "multi_az" {
  description = "Enable Multi-AZ deployment for high availability"
  type        = bool
  default     = false
}

variable "backup_retention_period" {
  description = "Days to retain automated backups"
  type        = number
  default     = 7
}

variable "deletion_protection" {
  description = "If true, database cannot be destroyed without disabling protection first"
  type        = bool
  default     = true
}

variable "skip_final_snapshot" {
  description = "Skip final snapshot before deleting RDS"
  type        = bool
  default     = false
}

variable "tags" {
  description = "Map of tags to assign to resources"
  type        = map(string)
  default     = {}
}
