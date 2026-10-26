#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_DIR="${SCRIPT_DIR}/../terraform"

echo "========================================="
echo "Deploying Infrastructure with Terraform"
echo "Directory: ${TERRAFORM_DIR}"
echo "========================================="

cd "${TERRAFORM_DIR}"

echo "--> Initializing Terraform..."
terraform init

echo "--> Planning Terraform changes..."
terraform plan -out=tfplan

read -p "Do you want to apply this Terraform execution plan? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "--> Applying Terraform plan..."
    terraform apply tfplan
    echo "========================================="
    echo "Terraform deployment completed!"
    echo "========================================="
else
    echo "Terraform deployment cancelled."
fi
