resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-vpc-${var.environment}"
      Environment = var.environment
    }
  )
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-igw-${var.environment}"
      Environment = var.environment
    }
  )
}

# Public Subnets
resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-public-subnet-${count.index + 1}-${var.environment}"
      Environment = var.environment
      Type        = "public"
    }
  )
}

# Private App Subnets (used by App Runner VPC Connector)
resource "aws_subnet" "private_app" {
  count             = length(var.private_app_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_app_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-private-app-subnet-${count.index + 1}-${var.environment}"
      Environment = var.environment
      Type        = "private-app"
    }
  )
}

# Elastic IP for NAT Gateway
resource "aws_eip" "nat" {
  domain = "vpc"

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-nat-eip-${var.environment}"
      Environment = var.environment
    }
  )
}

# NAT Gateway (Single NAT Gateway for cost-efficiency; multi-NAT can be used for high availability across multi-AZ)
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-nat-${var.environment}"
      Environment = var.environment
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-public-rt-${var.environment}"
      Environment = var.environment
    }
  )
}

# Route Table Associations for Public Subnets
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Private Route Table (routes outbound internet traffic through NAT Gateway)
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-private-rt-${var.environment}"
      Environment = var.environment
    }
  )
}

# Route Table Associations for Private App Subnets
resource "aws_route_table_association" "private_app" {
  count          = length(aws_subnet.private_app)
  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = aws_route_table.private.id
}

# Security Group for App Runner VPC Connector
resource "aws_security_group" "app_runner_vpc_connector" {
  name        = "${var.name_prefix}-app-runner-vpc-connector-sg-${var.environment}"
  description = "Security Group for App Runner VPC Connector outbound traffic"
  vpc_id      = aws_vpc.main.id

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-app-runner-vpc-connector-sg-${var.environment}"
      Environment = var.environment
    }
  )
}

# Security Group for RDS Database
resource "aws_security_group" "rds" {
  name        = "${var.name_prefix}-rds-sg-${var.environment}"
  description = "Security Group for RDS MariaDB/MySQL Database"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Allow MariaDB/MySQL traffic from App Runner VPC Connector SG"
    from_port       = var.db_port
    to_port         = var.db_port
    protocol        = "tcp"
    security_groups = [aws_security_group.app_runner_vpc_connector.id]
  }

  ingress {
    description = "Allow MariaDB/MySQL traffic from allowed public IPs (local dev access)"
    from_port   = var.db_port
    to_port     = var.db_port
    protocol    = "tcp"
    cidr_blocks = var.db_allowed_cidr_blocks
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-rds-sg-${var.environment}"
      Environment = var.environment
    }
  )
}
