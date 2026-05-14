# QuoteHub - Oracle Cloud 배포 가이드

## 개요

- **서버**: Oracle Cloud VM (Always Free - ARM 또는 AMD)
- **OS**: Ubuntu 22.04 LTS
- **런타임**: Node.js 18
- **프로세스 관리**: PM2
- **진입점**: server.js (포트 3000)

---

## STEP 1 — Oracle Cloud VM 인스턴스 생성

### 1-1. 인스턴스 만들기

1. [Oracle Cloud 콘솔](https://cloud.oracle.com) 접속 후 로그인
2. 좌측 메뉴 → **Compute** → **Instances** → **Create Instance** 클릭

### 1-2. 인스턴스 설정 (무료 티어)

| 항목 | 설정값 |
|------|--------|
| Name | `quotehub-server` |
| Image | **Ubuntu 22.04** |
| Shape | **VM.Standard.A1.Flex** (ARM, Always Free) |
| OCPU | 1~4개 (무료 최대 4개) |
| Memory | 6~24 GB (무료 최대 24 GB) |

> **주의**: Shape 선택 시 반드시 `VM.Standard.A1.Flex` 또는 `VM.Standard.E2.1.Micro`를 선택해야 Always Free 혜택 적용

### 1-3. SSH 키 설정

- **"Generate a key pair for me"** 선택
- **Private Key 다운로드** → 안전한 곳에 보관 (`.pem` 파일)

### 1-4. 인스턴스 생성 완료 후

- 인스턴스 상태가 **"Running"** 이 될 때까지 대기 (약 2~3분)
- **Public IP 주소** 복사해두기

---

## STEP 2 — 보안 규칙 설정 (포트 오픈)

인스턴스의 포트 3000을 외부에서 접근할 수 있도록 열어야 합니다.

1. 인스턴스 상세 페이지 → **"Subnet"** 링크 클릭
2. **Security Lists** → Default Security List 클릭
3. **"Add Ingress Rules"** 클릭 후 아래 규칙 추가:

| 항목 | 값 |
|------|-----|
| Source CIDR | `0.0.0.0/0` |
| Protocol | TCP |
| Destination Port Range | `3000` |
| Description | Node.js App |

> HTTP(80), HTTPS(443)도 나중에 필요하면 같은 방식으로 추가

---

## STEP 3 — VM에 SSH 접속

### Mac / Linux

```bash
# 다운로드한 private key 권한 설정
chmod 400 ~/Downloads/ssh-key-*.key

# SSH 접속 (ubuntu: Oracle Ubuntu 기본 사용자명)
ssh -i ~/Downloads/ssh-key-*.key ubuntu@<PUBLIC_IP>
```

### Windows (PuTTY 또는 Windows Terminal)

```powershell
# Windows Terminal (PowerShell)
ssh -i C:\Users\나\Downloads\ssh-key-*.key ubuntu@<PUBLIC_IP>
```

---

## STEP 4 — 서버 환경 설정

VM에 접속한 상태에서 실행:

```bash
# 프로젝트 폴더의 setup-server.sh 를 VM에 복사 후 실행
# 또는 아래 명령어를 직접 붙여넣기

curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs git
sudo npm install -g pm2
sudo ufw allow 3000/tcp && sudo ufw --force enable
mkdir -p ~/apps/quotehub-server
```

---

## STEP 5 — 프로젝트 파일 업로드

### 방법 A: SCP로 파일 직접 전송 (로컬 PC에서 실행)

```bash
# 프로젝트 전체 폴더 업로드 (node_modules 제외)
rsync -avz \
  --exclude 'node_modules' \
  --exclude '.env' \
  -e "ssh -i ~/Downloads/ssh-key-*.key" \
  ./  ubuntu@<PUBLIC_IP>:~/apps/quotehub-server/
```

> **rsync**가 없다면 아래 scp 명령어 사용:
> ```bash
> scp -i ~/Downloads/ssh-key-*.key -r \
>   ./  ubuntu@<PUBLIC_IP>:~/apps/quotehub-server/
> ```

### 방법 B: GitHub을 통해 배포

```bash
# VM에서 실행
cd ~/apps
git clone https://github.com/<YOUR_USERNAME>/<YOUR_REPO>.git quotehub-server
cd quotehub-server
```

---

## STEP 6 — 환경변수(.env) 설정

VM에서 실행:

```bash
cd ~/apps/quotehub-server
nano .env
```

아래 내용을 본인 환경에 맞게 작성:

```env
NODE_ENV=production
PORT=3000

# MongoDB 연결 문자열
MONGO_URI=mongodb+srv://<USER>:<PASSWORD>@cluster.mongodb.net/<DB_NAME>

# JWT 시크릿
JWT_SECRET=your_jwt_secret_key_here

# AWS S3 설정
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-northeast-2
S3_BUCKET_NAME=your_bucket_name

# OpenAI API 키
OPENAI_API_KEY=sk-...

# 기타 필요한 환경변수 추가
```

저장: `Ctrl + X` → `Y` → `Enter`

---

## STEP 7 — 의존성 설치 및 서버 실행

```bash
cd ~/apps/quotehub-server

# 의존성 설치
npm install --production

# logs 디렉토리 생성 (PM2 로그용)
mkdir -p logs

# PM2로 서버 시작
pm2 start ecosystem.config.js

# 서버 상태 확인
pm2 status

# 로그 확인
pm2 logs quotehub

# PM2 부팅 자동시작 저장
pm2 save
pm2 startup  # 출력된 명령어를 sudo 로 실행
```

---

## STEP 8 — 동작 확인

```bash
# VM에서 로컬 테스트
curl http://localhost:3000/health

# 외부에서 접근 테스트 (브라우저 또는 터미널)
curl http://<PUBLIC_IP>:3000/health
```

응답: `OK` 가 오면 성공!

---

## 유용한 PM2 명령어

```bash
pm2 status              # 서버 상태 확인
pm2 logs quotehub       # 실시간 로그
pm2 restart quotehub    # 서버 재시작
pm2 stop quotehub       # 서버 중지
pm2 delete quotehub     # PM2에서 제거
pm2 monit               # 실시간 모니터링 대시보드
```

---

## 문제 해결

### 포트 3000에 접근이 안 될 때

```bash
# VM 내부 방화벽 확인
sudo ufw status

# Oracle Cloud iptables 규칙 추가 (Oracle Linux/Ubuntu 일부 버전)
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save  # Ubuntu
```

### 서버가 시작 안 될 때

```bash
# PM2 에러 로그 확인
pm2 logs quotehub --err

# .env 파일 존재 확인
ls -la ~/apps/quotehub-server/.env

# Node.js 직접 실행으로 오류 확인
node server.js
```

---

## (선택) Nginx 리버스 프록시 설정

도메인을 연결하거나 80포트(HTTP)로 접근하려면:

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/quotehub
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 또는 Public IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/quotehub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

*Node.js 18.17.1 · Express · MongoDB · PM2 · Oracle Cloud Always Free*
