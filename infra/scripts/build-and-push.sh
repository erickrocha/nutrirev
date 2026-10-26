#!/usr/bin/env bash
set -euo pipefail

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
NAME_PREFIX="${NAME_PREFIX:-nutrirev}"
TAG="${IMAGE_TAG:-latest}"

echo "========================================="
echo "Building and Pushing Containers to AWS ECR"
echo "Region: ${AWS_REGION}"
echo "Tag: ${TAG}"
echo "========================================="

# 1. Fetch AWS Account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# 2. Login to ECR
echo "--> Logging into AWS ECR..."
aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${ECR_REGISTRY}"

BACKEND_REPO="${ECR_REGISTRY}/${NAME_PREFIX}-backend"
FRONTEND_REPO="${ECR_REGISTRY}/${NAME_PREFIX}-frontend"

# 3. Build & Push Backend
echo "--> Building Backend Docker image..."
docker build -t "${NAME_PREFIX}-backend:${TAG}" -f infra/docker/application.Dockerfile .

echo "--> Tagging and Pushing Backend image..."
docker tag "${NAME_PREFIX}-backend:${TAG}" "${BACKEND_REPO}:${TAG}"
docker push "${BACKEND_REPO}:${TAG}"

# 4. Build & Push Frontend
echo "--> Building Frontend Docker image..."
docker build -t "${NAME_PREFIX}-frontend:${TAG}" -f infra/docker/Dockerfile.frontend .

echo "--> Tagging and Pushing Frontend image..."
docker tag "${NAME_PREFIX}-frontend:${TAG}" "${FRONTEND_REPO}:${TAG}"
docker push "${FRONTEND_REPO}:${TAG}"

echo "========================================="
echo "Build and push completed successfully!"
echo "Backend:  ${BACKEND_REPO}:${TAG}"
echo "Frontend: ${FRONTEND_REPO}:${TAG}"
echo "========================================="
