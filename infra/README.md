# Afrodite Infrastructure

Infrastructure definitions and deployment tools for both local development and AWS production environments.

## Directory Overview

```text
infra/
├── docker/
│   ├── application.Dockerfile    # Production multi-stage Dockerfile for Rust Axum Backend
│   ├── Dockerfile.frontend       # Production multi-stage Dockerfile for React SPA Frontend
│   └── nginx.conf                # Nginx web server configuration for frontend SPA
├── docker-compose.yml            # Local development infrastructure (MariaDB + LocalStack)
├── localstack-init/
│   └── 01-create-resources.sh    # LocalStack startup script provisioning S3 bucket & SQS queue
├── scripts/
│   ├── build-and-push.sh         # Helper script to build & push Docker images to AWS ECR
│   └── deploy-terraform.sh       # Helper script to plan and apply Terraform IaC
├── terraform/                    # Production Infrastructure as Code (Terraform / OpenTofu)
│   ├── main.tf                   # Root module orchestrating all AWS resources
│   ├── variables.tf              # Input variables
│   ├── outputs.tf                # Resource outputs (URLs, endpoints, secret names)
│   ├── providers.tf              # Provider configuration (AWS, Random)
│   ├── backend.tf                # Remote state backend configuration template
│   ├── terraform.tfvars.example  # Example production variable values
│   └── modules/                  # Reusable Infrastructure Modules
│       ├── app_runner/           # AWS App Runner Services & VPC Connector
│       ├── ecr/                  # Elastic Container Registry Repositories
│       ├── iam/                  # IAM Execution & Service Roles
│       ├── rds/                  # AWS RDS MariaDB Instance & Secrets Manager
│       ├── s3/                   # AWS S3 Bucket for Media Uploads
│       └── vpc/                  # Multi-AZ VPC, Subnets, Gateways & Security Groups
├── README.md                     # This file
└── PRODUCTION_DEPLOYMENT.md      # Comprehensive AWS Production Deployment Guide
```

---

## 1. Local Development Infrastructure (MariaDB + LocalStack S3/SQS)

Local development relies on **Docker Compose** to provision MariaDB for database persistence and **LocalStack** to emulate AWS S3 (for customer profile photo uploads) and SQS.

### Step 1: Start Containers

From the project root:

```bash
docker compose -f infra/docker-compose.yml up -d
```

### Services Provisioned
- **MariaDB Database (`afrodite-dev`)**:
  - **Port**: `3306`
  - **Database**: `afrodite-dev`
  - **User**: `afrodite`
  - **Password**: `brutal`
- **LocalStack AWS Emulation (`afrodite-localstack`)**:
  - **Port**: `4566`
  - **S3 Bucket**: `afrodite-media-dev` (auto-created via `infra/localstack-init/01-create-resources.sh`)
  - **SQS Queue**: `media-processing`

### Step 2: Verify LocalStack Resources

Verify that LocalStack initialized the S3 media bucket:

```bash
docker exec afrodite-localstack awslocal s3 ls
```

Output:
```text
2026-08-13 11:45:00 afrodite-media-dev
```

### Step 3: Run Database Migrations

From the `backend/` directory, execute SeaORM migrations:

```bash
cd backend
cargo run -p migration
```

---

## 2. Production Deployment (AWS RDS + AWS App Runner)

Production infrastructure is fully automated using **Terraform / OpenTofu**, provisioning:
- **Networking**: Multi-AZ VPC with Public, Private App, and Private DB subnets.
- **Database**: AWS RDS MariaDB in private subnets with automated backups, encryption at rest, storage autoscaling, and Secrets Manager credentials management.
- **Application Hosting**: AWS App Runner connected to the private VPC via an **App Runner VPC Connector** for private database access.
- **Container Registries**: AWS ECR repositories for backend and frontend images with lifecycle rules.
- **Storage**: AWS S3 media bucket with CORS and server-side encryption.

### Quick Start Deployment Commands

1. **Configure Environment Variables**:
   ```bash
   cp infra/terraform/terraform.tfvars.example infra/terraform/terraform.tfvars
   # Edit terraform.tfvars with your configuration details
   ```

2. **Build and Push Docker Containers to AWS ECR**:
   ```bash
   ./infra/scripts/build-and-push.sh
   ```

3. **Deploy Infrastructure**:
   ```bash
   ./infra/scripts/deploy-terraform.sh
   ```

For step-by-step production setup, sea-orm database migrations, and operational maintenance, see the [PRODUCTION_DEPLOYMENT.md](file:///home/erick/workspace/afrodite_project/infra/PRODUCTION_DEPLOYMENT.md) guide.
