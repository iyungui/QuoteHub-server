#!/usr/bin/env bash
# .env의 민감한 값들을 GCP Secret Manager에 등록한다.
# 값이 이미 있으면 새 버전을 추가한다. 여러 번 실행해도 안전하다.
#
# 실행: ./scripts/gcp-setup-secrets.sh

set -euo pipefail

cd "$(dirname "$0")/.."
source ./scripts/gcp-config.sh

if [ ! -f .env ]; then
  echo "오류: .env 파일이 없습니다." >&2
  exit 1
fi

echo "프로젝트: ${PROJECT_ID}"
echo

# .env 파싱은 dotenv에 맡긴다. 따옴표/공백 처리를 직접 하면 틀리기 쉽다.
read_env() {
  node -e "require('dotenv').config();const v=process.env[process.argv[1]];if(v===undefined){process.exit(3)};process.stdout.write(v)" "$1"
}

# --- 1. 서비스 계정 생성 ---
if gcloud iam service-accounts describe "${SERVICE_ACCOUNT_EMAIL}" \
     --project="${PROJECT_ID}" >/dev/null 2>&1; then
  echo "서비스 계정 존재함: ${SERVICE_ACCOUNT_EMAIL}"
else
  echo "서비스 계정 생성: ${SERVICE_ACCOUNT_EMAIL}"
  gcloud iam service-accounts create "${SERVICE_ACCOUNT_NAME}" \
    --project="${PROJECT_ID}" \
    --display-name="QuoteHub Cloud Run runtime"
fi
echo

# --- 2. 시크릿 등록 ---
for KEY in "${SECRET_KEYS[@]}"; do
  if ! VALUE="$(read_env "${KEY}")"; then
    echo "  건너뜀 ${KEY} (.env에 없음)"
    continue
  fi

  if gcloud secrets describe "${KEY}" --project="${PROJECT_ID}" >/dev/null 2>&1; then
    # 기존 최신 버전과 값이 같으면 새 버전을 만들지 않는다.
    CURRENT="$(gcloud secrets versions access latest --secret="${KEY}" \
                 --project="${PROJECT_ID}" 2>/dev/null || true)"
    if [ "${CURRENT}" = "${VALUE}" ]; then
      echo "  변경없음 ${KEY}"
    else
      printf '%s' "${VALUE}" | gcloud secrets versions add "${KEY}" \
        --project="${PROJECT_ID}" --data-file=- >/dev/null
      echo "  새 버전  ${KEY}"
    fi
  else
    printf '%s' "${VALUE}" | gcloud secrets create "${KEY}" \
      --project="${PROJECT_ID}" --replication-policy=automatic --data-file=- >/dev/null
    echo "  생성     ${KEY}"
  fi

  # 런타임 서비스 계정에 읽기 권한 부여 (멱등)
  gcloud secrets add-iam-policy-binding "${KEY}" \
    --project="${PROJECT_ID}" \
    --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --condition=None >/dev/null 2>&1
done

echo
echo "완료. 다음: ./scripts/gcp-deploy.sh"
