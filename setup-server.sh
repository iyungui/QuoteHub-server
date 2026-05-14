#!/bin/bash
# ============================================================
# QuoteHub - Oracle Cloud VM 서버 초기 설정 스크립트
# Ubuntu 22.04 LTS (ARM / AMD) 기준
# 실행: bash setup-server.sh
# ============================================================

set -e  # 오류 발생 시 즉시 중단

echo "======================================"
echo "  QuoteHub 서버 환경 설정 시작"
echo "======================================"

# 1. 시스템 패키지 업데이트
echo ""
echo "[1/7] 시스템 패키지 업데이트 중..."
sudo apt update && sudo apt upgrade -y

# 2. Node.js 18 설치 (NodeSource)
echo ""
echo "[2/7] Node.js 18 설치 중..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v

# 3. PM2 전역 설치 (프로세스 관리자)
echo ""
echo "[3/7] PM2 설치 중..."
sudo npm install -g pm2

# 4. Git 설치
echo ""
echo "[4/7] Git 설치 중..."
sudo apt install -y git

# 5. UFW 방화벽 설정 (Oracle Cloud 외에도 OS 레벨 방화벽)
echo ""
echo "[5/7] UFW 방화벽 설정 중..."
sudo ufw allow OpenSSH
sudo ufw allow 3000/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# 6. 배포 디렉토리 생성
echo ""
echo "[6/7] 배포 디렉토리 생성..."
mkdir -p ~/apps/quotehub-server

# 7. PM2 부팅 시 자동 시작 설정
echo ""
echo "[7/7] PM2 자동 시작 설정..."
pm2 startup | tail -1 | sudo bash - 2>/dev/null || true

echo ""
echo "======================================"
echo "  서버 환경 설정 완료!"
echo "======================================"
echo ""
echo "다음 단계:"
echo "  1. 프로젝트 파일을 ~/apps/quotehub-server/ 에 업로드"
echo "  2. .env 파일 생성"
echo "  3. npm install 실행"
echo "  4. pm2 start ecosystem.config.js"
echo ""
