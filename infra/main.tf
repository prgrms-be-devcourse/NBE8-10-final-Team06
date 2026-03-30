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

  default_tags {
    tags = {
      Team = var.prefix
    }
  }
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

  # ✅ HTTPS (Nginx용 443포트 추가)
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP (Nginx용 80포트)
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Spring Boot (테스트용 8080포트)
  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH (터미널 접속용 22포트)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # 프로메테우스
  ingress {
    from_port   = 9090
    to_port     = 9090
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # 그라파나
  ingress {
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
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

# 1. Docker 설치
dnf update -y && dnf install -y git docker
systemctl enable --now docker

# 2. Docker Compose 바이너리 직접 설치 (아까 성공한 방식)
sudo curl -L "https://github.com/docker/compose/releases/download/v2.26.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Docker CLI 플러그인으로 등록
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo ln -s /usr/local/bin/docker-compose /usr/local/lib/docker/cli-plugins/docker-compose

# 4. 스왑 파일 및 기타 설정
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
  name       = "${var.prefix}-rds-sub"
  subnet_ids = [
    aws_subnet.subnet_1.id,
    aws_subnet.subnet_2.id,
    aws_subnet.subnet_3.id,
    aws_subnet.subnet_4.id
  ]
  tags = { Name = "${var.prefix}-rds-sub" }
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

# [11] 탄력적 IP (고정 IP) 설정
resource "aws_eip" "ec2_eip" {
  instance = aws_instance.ec2_1.id
  domain   = "vpc"
  tags     = { Name = "${var.prefix}-eip" }
}

# [12] Route 53 도메인 연결 설정
# 기존에 생성한 호스팅 영역의 정보를 가져옵니다.
data "aws_route53_zone" "selected" {
  name         = "devstagram.site" # 가비아에서 산 도메인 이름
  private_zone = false
}

resource "aws_route53_record" "www" {
  zone_id = data.aws_route53_zone.selected.zone_id
  name    = "devstagram.site" # 접속할 도메인 주소
  type    = "A"
  ttl     = "300"

  # 위에서 생성한 탄력적 IP 주소를 자동으로 참조합니다.
  records = [aws_eip.ec2_eip.public_ip]
}

# [13] S3 버킷 설정 (이미지 저장용)
resource "aws_s3_bucket" "devstagram_storage" {
  bucket = "${var.prefix}-storage-unique"

  tags = { Name = "${var.prefix}-s3" }
}

# 버킷 소유권 설정
resource "aws_s3_bucket_ownership_controls" "storage_oc" {
  bucket = aws_s3_bucket.devstagram_storage.id
  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

# 퍼블릭 액세스 차단 해제 (SNS 서비스이므로 이미지를 외부에서 볼 수 있어야 함)
resource "aws_s3_bucket_public_access_block" "storage_pab" {
  bucket = aws_s3_bucket.devstagram_storage.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# 버킷 정책 (누구나 읽기 가능하도록 설정 - GetObject 허용)
resource "aws_s3_bucket_policy" "allow_public_read" {
  bucket = aws_s3_bucket.devstagram_storage.id

  depends_on = [aws_s3_bucket_public_access_block.storage_pab]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.devstagram_storage.arn}/*"
      },
    ]
  })
}