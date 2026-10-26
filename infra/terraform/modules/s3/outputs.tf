output "bucket_name" {
  description = "Name of the S3 media bucket"
  value       = aws_s3_bucket.media.id
}

output "bucket_arn" {
  description = "ARN of the S3 media bucket"
  value       = aws_s3_bucket.media.arn
}

output "bucket_domain_name" {
  description = "Domain name of the S3 media bucket"
  value       = aws_s3_bucket.media.bucket_domain_name
}
