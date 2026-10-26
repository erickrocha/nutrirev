variable "name_prefix" {
  description = "Prefix for resources created by this module"
  type        = string
}

variable "environment" {
  description = "Environment name (e.g. prod, staging)"
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "List of availability zones to use"
  type        = list(string)
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_app_subnet_cidrs" {
  description = "CIDR blocks for private app subnets (App Runner VPC Connector)"
  type        = list(string)
  default     = ["10.0.10.0/24", "10.0.11.0/24"]
}

variable "db_port" {
  description = "Port used by the RDS database (3306 for MariaDB/MySQL)"
  type        = number
  default     = 3306
}

variable "db_allowed_cidr_blocks" {
  description = "CIDR blocks allowed to reach RDS directly over the internet (e.g. your public IP as x.x.x.x/32)"
  type        = list(string)
}

variable "tags" {
  description = "Map of tags to assign to resources"
  type        = map(string)
  default     = {}
}
