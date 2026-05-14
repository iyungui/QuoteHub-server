# QuoteHub Backend Render 배포 가이드

## 0. 먼저 알아둘 것

Render Web Service를 만들면 기본 HTTPS 주소가 바로 생깁니다.

```text
https://quotehub-server.onrender.com
```

실제 주소는 Render에서 정한 서비스 이름에 따라 달라집니다. 이 주소가 생긴 뒤에 아래 세 곳을 맞춰야 합니다.

- Render 환경변수 `APPLE_REDIRECT_URI`
- Apple Developer의 Sign in with Apple 웹/리턴 URL 설정
- iOS 앱의 API base URL

커스텀 도메인을 바로 쓰고 싶다면 Render 기본 주소로 먼저 배포 성공을 확인한 뒤, `https://api.your-domain.com` 같은 도메인을 붙이는 순서를 추천합니다.

## 1. 배포 전 로컬 체크

로컬 프로젝트에서 실행:

```bash
npm ci
npm test
```

둘 다 성공해야 합니다.

## 2. GitHub에 코드 올리기

Render는 GitHub 저장소를 연결해서 배포하는 방식이 가장 편합니다.

```bash
git status
git add .
git commit -m "Prepare Render deployment"
git push origin main
```

이미 GitHub에 연결된 저장소라면 push만 하면 됩니다.

## 3. Render Web Service 만들기

1. https://render.com 접속
2. Sign up 또는 Log in
3. Dashboard에서 `New +` 클릭
4. `Web Service` 선택
5. GitHub 연결
6. `QuoteHub-server` 저장소 선택
7. 아래 값으로 생성

```text
Name: quotehub-server
Region: Singapore 또는 Oregon
Branch: main
Runtime: Node
Build Command: npm ci
Start Command: npm start
Instance Type: Free
Health Check Path: /health
```

한국/iOS 앱 기준이면 Singapore가 지연시간 면에서 보통 더 낫습니다.

## 4. Render 환경변수 넣기

Render 서비스 생성 화면의 Advanced 또는 생성 후 `Environment` 메뉴에서 아래 값을 넣습니다.

```env
NODE_ENV=production
MONGO_URI=
JWT_SECRET_KEY=
REFRESH_TOKEN_SECRET_KEY=
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=
APPLE_REDIRECT_URI=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
S3_BUCKET_NAME=
KAKAO_REST_API_KEY=
CORS_ORIGINS=
```

`APPLE_REDIRECT_URI`는 일단 Render 기본 주소 기준으로 넣습니다.

```env
APPLE_REDIRECT_URI=https://quotehub-server.onrender.com/auth/apple/callback
```

`APPLE_PRIVATE_KEY`는 여러 줄 그대로 넣거나 `\n`이 포함된 한 줄 문자열로 넣어도 됩니다. 서버 코드가 런타임에 `\n`을 실제 줄바꿈으로 바꿉니다.

`CORS_ORIGINS`는 지금 iOS 앱만 쓰면 비워둬도 됩니다. 나중에 웹 관리자 페이지가 생기면 아래처럼 넣습니다.

```env
CORS_ORIGINS=https://admin.your-domain.com,https://your-domain.com
```

## 5. MongoDB Atlas 확인

MongoDB Atlas를 쓴다면 Network Access에서 Render 서버가 DB에 붙을 수 있어야 합니다.

처음 배포 확인용:

```text
0.0.0.0/0
```

나중에 더 안전하게 운영하려면 Render 유료 플랜의 static outbound IP나 별도 네트워크 제한을 검토합니다.

## 6. 첫 배포 확인

Render에서 `Create Web Service`를 누르면 첫 배포가 시작됩니다.

성공 후 아래 주소를 브라우저나 터미널에서 확인합니다.

```bash
curl https://quotehub-server.onrender.com/health
```

정상 응답:

```text
OK
```

DB 연결까지 확인:

```bash
curl https://quotehub-server.onrender.com/health/ready
```

정상 응답:

```json
{"status":"ok","database":"connected"}
```

## 7. Apple Developer 설정 변경

Render 주소가 확정되면 Apple Developer에서 Sign in with Apple 설정을 맞춥니다.

1. https://developer.apple.com/account 접속
2. `Certificates, Identifiers & Profiles`
3. `Identifiers`
4. 현재 사용 중인 `Services ID` 선택
5. `Sign in with Apple` 체크 또는 Configure
6. Website URLs / Return URLs에 아래 값을 추가

```text
Domain:
quotehub-server.onrender.com

Return URL:
https://quotehub-server.onrender.com/auth/apple/callback
```

커스텀 도메인을 붙이면 아래처럼 바꿉니다.

```text
Domain:
api.your-domain.com

Return URL:
https://api.your-domain.com/auth/apple/callback
```

그 다음 Render 환경변수 `APPLE_REDIRECT_URI`도 같은 값으로 바꾼 뒤 `Manual Deploy` 또는 `Restart Service`를 실행합니다.

## 8. iOS 앱 base URL 변경

iOS 프로젝트에서 기존 서버 주소를 Render 주소로 바꿉니다.

```swift
let baseURL = "https://quotehub-server.onrender.com"
```

커스텀 도메인 사용 후:

```swift
let baseURL = "https://api.your-domain.com"
```

가능하면 Debug/Release 환경별로 base URL을 분리해두는 편이 좋습니다.

## 9. UptimeRobot 설정

Render Free Web Service는 15분 동안 요청이 없으면 sleep 됩니다. UptimeRobot Free는 5분 간격 체크가 가능하므로 포트폴리오용 keep-alive로는 충분합니다.

1. https://uptimerobot.com 접속
2. 회원가입 또는 로그인
3. `New Monitor` 클릭
4. 아래 값 입력

```text
Monitor Type: HTTP(s)
Friendly Name: QuoteHub API
URL: https://quotehub-server.onrender.com/health
Monitoring Interval: 5 minutes
```

알림은 이메일 정도만 켜두면 충분합니다.

중요: UptimeRobot은 sleep 방지용입니다. Render 무료 인스턴스는 재시작/점검/무료 사용량 제한이 있을 수 있으므로 진짜 무중단 운영 보장은 아닙니다.

## 10. 커스텀 도메인 붙이기

처음에는 `onrender.com` 주소로 iOS 앱까지 정상 동작하는지 확인합니다. 그 다음 도메인이 있다면 Render에서 커스텀 도메인을 붙입니다.

1. Render 서비스 > `Settings`
2. `Custom Domains`
3. `Add Custom Domain`
4. 예: `api.your-domain.com`
5. Render가 안내하는 DNS 레코드를 도메인 제공업체에 추가
6. Render에서 Verified 상태 확인

TLS/HTTPS 인증서는 Render가 자동 발급하고 갱신합니다.

커스텀 도메인 적용 후 바꿀 것:

- Render `APPLE_REDIRECT_URI`
- Apple Developer Domain / Return URL
- iOS 앱 base URL
- UptimeRobot URL

## 11. 운영 중 업데이트

코드를 수정한 뒤:

```bash
git add .
git commit -m "Update backend"
git push origin main
```

Render Auto Deploy가 켜져 있으면 main 브랜치 push 후 자동으로 재배포됩니다.

문제가 생기면 Render 서비스의 `Logs`, `Events`, `Deploys` 탭을 먼저 확인합니다.
