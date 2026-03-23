# [1] 테라폼 및 AWS 라이브러리 설정
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# [2] AWS 접속 설정
provider "aws" {
  region = var.region
}

# [3] VPC 네트워크 설정
resource "aws_vpc" "vpc_1" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = "${var.prefix}-vpc" }
}

# [4] 서브넷 설정 (개별 줄바꿈 적용)
resource "aws_subnet" "subnet_1" {
  vpc_id                  = aws_vpc.vpc_1.id
  cidr_block              = "10.0.0.0/24"
  availability_zone       = "${var.region}a"
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.prefix}-subnet-1" }
}

resource "aws_subnet" "subnet_2" {
  vpc_id                  = aws_vpc.vpc_1.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.region}b"
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.prefix}-subnet-2" }
}

resource "aws_subnet" "subnet_3" {
  vpc_id                  = aws_vpc.vpc_1.id
  cidr_block              = "10.0.2.0/24"
  availability_zone       = "${var.region}c"
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.prefix}-subnet-3" }
}

resource "aws_subnet" "subnet_4" {
  vpc_id                  = aws_vpc.vpc_1.id
  cidr_block              = "10.0.3.0/24"
  availability_zone       = "${var.region}d"
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.prefix}-subnet-4" }
}

# [5] 인터넷 게이트웨이 및 라우팅
resource "aws_internet_gateway" "igw_1" {
  vpc_id = aws_vpc.vpc_1.id
  tags   = { Name = "${var.prefix}-igw" }
}

resource "aws_route_table" "rt_1" {
  vpc_id = aws_vpc.vpc_1.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.igw_1.id
  }
  tags = { Name = "${var.prefix}-rt" }
}

resource "aws_route_table_association" "assoc_1" {
  subnet_id      = aws_subnet.subnet_1.id
  route_table_id = aws_route_table.rt_1.id
}

resource "aws_route_table_association" "assoc_2" {
  subnet_id      = aws_subnet.subnet_2.id
  route_table_id = aws_route_table.rt_1.id
}

resource "aws_route_table_association" "assoc_3" {
  subnet_id      = aws_subnet.subnet_3.id
  route_table_id = aws_route_table.rt_1.id
}

resource "aws_route_table_association" "assoc_4" {
  subnet_id      = aws_subnet.subnet_4.id
  route_table_id = aws_route_table.rt_1.id
}

# [6] 보안 그룹 (방화벽)
resource "aws_security_group" "sg_ec2" {
  name   = "${var.prefix}-sg-ec2"
  vpc_id = aws_vpc.vpc_1.id

  ingress {
    from_port   = 0
    to_port     = 0
    # protocol "-1"은 모든 프로토콜을 의미합니다.
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.prefix}-sg-ec2" }
}

resource "aws_security_group" "sg_rds" {
  name   = "${var.prefix}-sg-rds"
  vpc_id = aws_vpc.vpc_1.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.sg_ec2.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.prefix}-sg-rds" }
}

# [7] IAM 및 인스턴스 프로파일
resource "aws_iam_role" "ec2_role" {
  name = "${var.prefix}-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Principal = { Service = "ec2.amazonaws.com" }
      Effect = "Allow"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "s3" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3FullAccess"
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "profile" {
  name = "${var.prefix}-profile"
  role = aws_iam_role.ec2_role.name
}

# [8] AMI 및 부트스트랩
data "aws_ssm_parameter" "ami" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-x86_64"
}

locals {
  ec2_bootstrap = <<-EOF
#!/bin/bash
timedatectl set-timezone Asia/Seoul
dnf update -y && dnf install -y git docker
systemctl enable --now docker
dd if=/dev/zero of=/swapfile bs=128M count=32 && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo "/swapfile swap swap defaults 0 0" >> /etc/fstab
docker network create common
echo '${var.github_access_token_1}' | docker login ghcr.io -u '${var.github_access_token_1_owner}' --password-stdin
EOF
}

# [9] EC2 인스턴스 생성 (t3.small)
resource "aws_instance" "ec2_1" {
  ami                         = data.aws_ssm_parameter.ami.value
  instance_type               = "t3.small"
  key_name                    = "my-key"
  subnet_id                   = aws_subnet.subnet_2.id
  vpc_security_group_ids      = [aws_security_group.sg_ec2.id]
  iam_instance_profile        = aws_iam_instance_profile.profile.name
  associate_public_ip_address = true

  root_block_device {
    volume_type = "gp3"
    volume_size = 30
  }

  user_data = <<-EOF
${local.ec2_bootstrap}
hostnamectl set-hostname ${var.prefix}-server
EOF

  tags = { Name = "${var.prefix}-ec2" }
}

# [10] RDS DB 생성
resource "aws_db_subnet_group" "rds_sub" {
  name       = "${var.prefix}-rds-sub-group"
  subnet_ids = [
    aws_subnet.subnet_1.id,
    aws_subnet.subnet_2.id,
    aws_subnet.subnet_3.id,
    aws_subnet.subnet_4.id
  ]
  tags = { Name = "${var.prefix}-rds-sub-group" }
}

resource "aws_db_instance" "rds_1" {
  identifier           = "${var.prefix}-rds"
  allocated_storage      = 20
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = "db.t4g.micro"
  db_name                = var.app_1_db_name
  username               = "postgres"
  password               = var.password_1
  db_subnet_group_name   = aws_db_subnet_group.rds_sub.name
  vpc_security_group_ids = [aws_security_group.sg_rds.id]
  skip_final_snapshot    = true
  publicly_accessible    = false

  tags = { Name = "${var.prefix}-rds" }
}