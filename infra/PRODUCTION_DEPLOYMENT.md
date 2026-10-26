# nutrirev Production Deployment & Operations Guide

This document covers the end-to-end process for deploying and operating **nutrirev** in production on **Amazon Web Services (AWS)** using **AWS App Runner** and **AWS RDS (MariaDB)**.

---

## Architecture Overview

```text
               +-------------------------------------------------------+
               |                     AWS App Runner                    |
               |                                                       |
               |   +-------------------+       +-------------------+   |
               |   | Frontend (Nginx)  |       |  Backend (Rust)   |   |
               |   +---------+---------+       +---------+---------+   |
               +-------------|---------------------------|-------------+
                             |                           |
                             | (HTTPS Public Ingress)    | (App Runner VPC Connector)
                             v                           v
               +-------------------------------------------------------+
               |                      AWS VPC                          |
               |                                                       |
               |   Private Subnets (App)                               |
               |   +-----------------------------------------------+   |
               |   |            App Runner VPC Connector            |   |
               |   +-----------------------+-----------------------+   |
               |                           |                           |
               |                           | (Port 3306 - Security Grp)|
               |                           v                           |
               |   Public Subnets                                      |
               |   +-----------------------------------------------+   |
               |   |   AWS RDS MariaDB Instance (publicly_accessible)|  |
               |   +-----------------------------------------------+   |
               +-------------------------------------------------------+
                                           ^
                                           | (Port 3306 - restricted to
                                           |  db_allowed_cidr_blocks)
                                     Local machine
```

RDS is directly reachable from the internet, restricted by security group to the CIDR
blocks in `db_allowed_cidr_blocks` (your public IP) plus the App Runner VPC connector's
security group. There is no bastion - App Runner reaches RDS over the private VPC
connector path, while local machines connect straight to the public endpoint.

The frontend's backend URL is baked into the static bundle at **Docker build time** via `VITE_API_URL` (there's no runtime reverse proxy), which is why the first deploy below is two-phase: the backend must exist before the frontend image can be built correctly.

Photos are stored as base64 in the database (`IMAGE_STORAGE_MODE=base64`) for this deployment - no CloudFront/S3-event/SQS pipeline is required to launch.

---

## Prerequisites

1. **AWS CLI** (v2) installed and configured with credentials (`aws configure` / `aws login`).
2. **Terraform** (v1.5+) or **OpenTofu** installed.
3. **Docker Engine** installed and running.
4. Permissions to manage IAM, VPC, ECR, RDS, S3, Secrets Manager, DynamoDB, and App Runner in your AWS account.
5. Fresh **production** secrets ready (do NOT reuse anything from `backend/.env`, which holds dev-only values): JWT `ACCESS_TOKEN_SECRET`/`REFRESH_TOKEN_SECRET`, a `SYSADMIN_EMAIL`/`SYSADMIN_PASSWORD` for the auto-seeded admin user, a `DEFAULT_PASSWORD` for auto-created customer accounts, and API keys for whichever AI providers are configured (`CLAUDE_API_KEY`/`GEMINI_API_KEY`).

---

## Step 0: Bootstrap Terraform Remote State

Terraform can't create the S3 bucket/DynamoDB table it's about to store its own state in, so create them once by hand:

```bash
aws s3api create-bucket --bucket nutrirev-terraform-state-prod --region us-east-1
aws s3api put-bucket-versioning --bucket nutrirev-terraform-state-prod \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket nutrirev-terraform-state-prod \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws dynamodb create-table --table-name nutrirev-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

If you use a different bucket/table name or region, update `infra/terraform/backend.tf` and the `terraform_state_bucket`/`terraform_lock_table` variables to match.

## Step 1: Configure Variables

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:
- Confirm the AWS region, `name_prefix` (`nutrirev`), and instance sizes.
- Set `rds_engine_version` to a version RDS actually offers - check first:
  ```bash
  aws rds describe-db-engine-versions --engine mariadb --query "DBEngineVersions[].EngineVersion" --output table
  ```
  Local dev runs MariaDB 11.8 (`infra/docker-compose.yml`); pick the closest available version.
- Fill in the production secrets from Prerequisites step 5 (`access_token_secret`, `refresh_token_secret`, `sysadmin_email`, `sysadmin_password`, `default_password`, `claude_api_key`, `claude_model`, `gemini_api_key`, `gemini_model`, `ai_primary_provider`, `ai_fallback_provider`, `ai_timeout_ms`).
- Set `db_allowed_cidr_blocks` to your current public IP (as `x.x.x.x/32`) - RDS is publicly accessible, restricted by security group to this list. Get your IP with:
  ```bash
  curl -s https://checkip.amazonaws.com
  ```
  See "Connecting to RDS from your local machine" below.

`terraform.tfvars` is gitignored - never commit it.

## Step 2: Provision Network, Database, ECR, IAM, and Secrets

```bash
terraform init
terraform apply -target=module.vpc -target=module.ecr -target=module.rds \
  -target=module.iam -target=module.github_oidc \
  -target=aws_secretsmanager_secret.app_secrets -target=aws_secretsmanager_secret_version.app_secrets
```

This creates the VPC, RDS instance, ECR repositories, IAM roles (including the GitHub Actions OIDC role), and the Secrets Manager secrets - but no App Runner services yet, since the backend's public URL doesn't exist until it's deployed.

### Connecting to RDS from your local machine

RDS is publicly accessible, restricted by security group to the CIDR blocks in
`db_allowed_cidr_blocks` (your public IP) plus the App Runner VPC connector's
security group - there's no bastion or tunnel, just a direct connection:

```bash
RDS_HOST=$(terraform output -raw rds_endpoint | cut -d: -f1)
mariadb -h "$RDS_HOST" -P 3306 -u nutrirev_admin -p nutrirev_prod
```

> **If the connection is refused**, your public IP has likely changed since
> `db_allowed_cidr_blocks` was set. Check it again:
> ```bash
> curl -s https://checkip.amazonaws.com
> ```
> Update `db_allowed_cidr_blocks` in `terraform.tfvars` and re-apply (targeting
> just the security group is enough to update the rule quickly):
> ```bash
> terraform apply -target=module.vpc.aws_security_group.rds
> ```

## Step 3: Build and Push the Backend Image

```bash
# From the project root
AWS_REGION=us-east-1 NAME_PREFIX=nutrirev IMAGE_TAG=latest \
  aws ecr get-login-password --region "${AWS_REGION:-us-east-1}" | \
  docker login --username AWS --password-stdin "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com"

docker build -t nutrirev-backend:latest -f infra/docker/application.Dockerfile .
docker tag nutrirev-backend:latest "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/nutrirev-backend:latest"
docker push "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/nutrirev-backend:latest"
```

## Step 4: Deploy the Backend App Runner Service

```bash
terraform apply \
  -target=module.app_runner.aws_apprunner_auto_scaling_configuration_version.backend \
  -target=module.app_runner.aws_apprunner_service.backend
terraform output backend_app_runner_url
```

Wait for the service to become `Running` (App Runner console, or `aws apprunner describe-service`), then confirm health:

```bash
curl -i "$(terraform output -raw backend_app_runner_url)/"
```

Check CloudWatch logs for the service to confirm the 31 SeaORM migrations ran successfully and the sysadmin user was seeded (migrations run automatically at backend boot - no separate migration step is needed).

## Step 5: Build and Push the Frontend Image

Now that the backend's URL is known, bake it into the frontend build:

```bash
BACKEND_URL="$(cd infra/terraform && terraform output -raw backend_app_runner_url)"
docker build -t nutrirev-frontend:latest -f infra/docker/Dockerfile.frontend \
  --build-arg VITE_API_URL="https://${BACKEND_URL}" .
docker tag nutrirev-frontend:latest "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/nutrirev-frontend:latest"
docker push "$(aws sts get-caller-identity --query Account --output text).dkr.ecr.us-east-1.amazonaws.com/nutrirev-frontend:latest"
```

## Step 6: Deploy the Frontend App Runner Service

```bash
cd infra/terraform
terraform apply
terraform output frontend_app_runner_url
```

Open the frontend URL in a browser, confirm the SPA loads and successfully calls the backend (check the network tab), and log in with the `SYSADMIN_EMAIL`/`SYSADMIN_PASSWORD` you set in Step 1.

> **Known issue: App Runner services on port 80 fail to deploy in this account/region.**
> Confirmed by reproducing the same `CREATE_FAILED` result with a completely stock
> `public.ecr.aws/nginx/nginx:latest` image on port 80 (no custom code involved), and
> confirmed egress type (`DEFAULT` vs `VPC`) makes no difference. The failure happens
> right after the image is pulled but before App Runner ever reaches its "Performing
> health check" step - there's no useful detail in the App Runner event log or
> CloudWatch beyond "Failed to deploy your application image." The fix: the frontend
> container (nginx) listens on **8080**, not 80 - see `infra/docker/nginx.conf`
> (`listen 8080;`), `infra/docker/Dockerfile.frontend` (`EXPOSE 8080`), and
> `infra/terraform/modules/app_runner/main.tf`'s frontend `image_configuration.port`.
> If this ever needs to be re-verified (e.g. AWS fixes whatever this was), port 80
> can be tested again with a throwaway service before changing the real one.

---

## CI/CD (GitHub Actions)

After the manual first deploy above succeeds, `.github/workflows/deploy.yml` handles subsequent deploys automatically on push to `main`. It has three jobs:
- `test-backend`: `cargo test --workspace --all-features` (no live database needed - all tests use SeaORM's `MockDatabase`).
- `test-frontend`: `yarn lint` + `yarn build`. There's no frontend test runner configured yet, so this is build/lint validation only, not a test suite.
- `deploy` (runs only if both test jobs pass): authenticates via the OIDC role created in Step 2 (`module.github_oidc`, output as `github_actions_role_arn`) - no long-lived AWS keys are stored in GitHub - runs `terraform apply` to reconcile infra, then rebuilds and pushes both images to ECR. App Runner picks up new images automatically since both services have `auto_deployments_enabled = true`.

Required GitHub repository secrets: `AWS_ROLE_ARN` (from `terraform output github_actions_role_arn`), `AWS_REGION`, and `TF_VAR_*` for each sensitive Terraform variable (`TF_VAR_db_admin_password`, `TF_VAR_access_token_secret`, `TF_VAR_refresh_token_secret`, `TF_VAR_sysadmin_email`, `TF_VAR_sysadmin_password`, `TF_VAR_default_password`, `TF_VAR_claude_api_key`, `TF_VAR_gemini_api_key`, `TF_VAR_db_allowed_cidr_blocks`). Non-sensitive AI config (`claude_model`, `gemini_model`, `ai_primary_provider`, `ai_fallback_provider`, `ai_timeout_ms`) has Terraform defaults, so it doesn't need a GitHub secret unless you want CI to use different values than the defaults.

> **`TF_VAR_db_allowed_cidr_blocks` must be a Terraform list literal**, e.g. `["203.0.113.10/32"]`, and must be kept in sync with `terraform.tfvars`'s `db_allowed_cidr_blocks` locally. If your IP changes and you update `terraform.tfvars` but forget to update this secret too, the next CI deploy will silently revert the RDS security group back to the stale IP in the secret.

---

## Monitoring and Maintenance

### Viewing CloudWatch Logs
- **App Runner Logs**: AWS Management Console -> App Runner -> Select Service -> Service Logs / Application Logs.
- **RDS Performance**: Enable RDS Performance Insights and CloudWatch Enhanced Monitoring for metrics (CPU, Memory, IOPS).

### Secrets
- DB credentials: `nutrirev-db-credentials-prod` (Secrets Manager) - includes a ready-to-use `url` key.
- App secrets (JWT keys, sysadmin creds, AI provider keys): `nutrirev-app-secrets-prod`.

---

## Disaster Recovery & Backups

- **RDS Backups**: Automated daily snapshots retained for 7 days (configurable via `backup_retention_period`).
- **S3 Bucket Versioning**: Can be enabled in `modules/s3/main.tf` for object protection.
- **Terraform State**: Versioned S3 bucket (`nutrirev-terraform-state-prod`) - prior state versions are recoverable if a bad apply corrupts state.
