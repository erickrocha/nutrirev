#!/bin/sh
awslocal s3 mb s3://nutrirev-dev
awslocal sqs create-queue --queue-name nutrirev-dev-upload
