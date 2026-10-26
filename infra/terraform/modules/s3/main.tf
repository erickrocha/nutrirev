resource "random_id" "bucket_suffix" {
  byte_length = 4
}

resource "aws_s3_bucket" "media" {
  bucket        = "${var.name_prefix}-media-${var.environment}-${random_id.bucket_suffix.hex}"
  force_destroy = false

  tags = merge(
    var.tags,
    {
      Name        = "${var.name_prefix}-media-${var.environment}"
      Environment = var.environment
    }
  )
}

# Block all public access
resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Server side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CORS configuration
resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = var.allowed_cors_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Ciclo de vida das imagens.
#
# Foto de refeição expira: ela cumpre sua finalidade no momento da análise, e o
# que precisa persistir (calorias, macros, itens) já foi extraído para o
# `meal_log`. Guardar a imagem indefinidamente contraria a necessidade e a
# limitação temporal da LGPD, e é o dado de maior exposição do produto.
#
# Foto de perfil NÃO expira: é estado corrente da conta, substituída quando o
# paciente troca e apagada no atendimento a pedido de exclusão. Expirar por
# tempo deixaria contas ativas sem avatar sem que ninguém tivesse pedido.
resource "aws_s3_bucket_lifecycle_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    id     = "expire-meal-photos"
    status = "Enabled"

    filter {
      prefix = "uploads/meal-log-"
    }

    expiration {
      days = var.meal_photo_retention_days
    }
  }

  # Varre também os objetos órfãos que a exclusão de conta não conseguiu remover:
  # o apagamento no S3 é best-effort e fora da transação do banco.
  rule {
    id     = "abort-incomplete-uploads"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}
