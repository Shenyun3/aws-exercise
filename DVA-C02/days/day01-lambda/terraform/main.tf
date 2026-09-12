terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      # 使用 6.x 的新版本，以支持教程选择的 Node.js 24 运行时。
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  type        = string
  default     = "us-east-1"
  description = "AWS Region for deployment"
}

# 1. 对应 Console 中的 Execution Role（执行角色）
resource "aws_iam_role" "lambda_exec_role" {
  name = "newcomer2026-exercise"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# 赋予基础写 CloudWatch Logs 权限策略
resource "aws_iam_role_policy_attachment" "lambda_basic_logs" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# 2. 将本地 Node.js 源码打包为 zip
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/../src/index.mjs"
  output_path = "${path.module}/lambda.zip"
}

# 3. 对应 Console 创建 Lambda 函数各项配置
resource "aws_lambda_function" "demo_function" {
  function_name    = "dva-lab-day1-context"
  role             = aws_iam_role.lambda_exec_role.arn
  runtime          = "nodejs24.x"
  architectures    = ["x86_64"]
  handler          = "index.handler"
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  timeout     = 15  # 本实验选 15 秒；常规函数上限是 900 秒
  memory_size = 128 # 内存大小（MB），同时按比例分配 CPU

  # 先完成日志策略绑定；不配置 VPC 或付费的 Provisioned Concurrency。
  depends_on = [aws_iam_role_policy_attachment.lambda_basic_logs]

  # 对应 Console 中的 Environment variables
  environment {
    variables = {
      APP_ENV = "DVA-Test"
    }
  }
}

output "lambda_function_name" {
  description = "Lambda Function Name"
  value       = aws_lambda_function.demo_function.function_name
}

output "lambda_function_arn" {
  description = "Lambda Function ARN"
  value       = aws_lambda_function.demo_function.arn
}
