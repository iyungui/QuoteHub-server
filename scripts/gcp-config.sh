#!/usr/bin/env bash
# 다른 스크립트들이 공통으로 읽는 설정값.
# 프로젝트나 리전을 바꾸려면 이 파일만 수정하면 된다.

PROJECT_ID="quotehub-436306"
REGION="asia-northeast3"          # 서울. 한국 사용자 지연시간 최소.
SERVICE_NAME="quotehub-server"
SERVICE_ACCOUNT_NAME="quotehub-run"

# Secret Manager에 저장할 민감한 값 (.env에서 읽어옴)
SECRET_KEYS=(
  APPLE_CLIENT_ID
  APPLE_TEAM_ID
  APPLE_KEY_ID
  APPLE_PRIVATE_KEY
  JWT_SECRET_KEY
  REFRESH_TOKEN_SECRET_KEY
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  MONGO_URI
  KAKAO_REST_API_KEY
)

# 민감하지 않아 평문 환경변수로 넣는 값 (.env에서 읽어옴)
PLAIN_KEYS=(
  AWS_REGION
  S3_BUCKET_NAME
  APPLE_REDIRECT_URI
)

SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
