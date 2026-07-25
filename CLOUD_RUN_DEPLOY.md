# Cloud Run 배포 가이드

Render 무료 플랜의 15분 유휴 스핀다운(복귀 30~60초)을 없애기 위해 Google Cloud Run으로 옮긴다.
Cloud Run은 유휴 시 0으로 축소되지만 요청이 오면 1~3초 내 응답하고, 인스턴스-시간 한도 소진이나
유휴 회수로 인한 중단이 없다.

## 사전 조건

- `gcloud` CLI 설치 및 로그인 (확인: `gcloud auth list`)
- GCP 프로젝트 `quotehub-436306`에 **결제 계정 연결**
  - Cloud Run 무료 한도(월 200만 요청, 180k vCPU-초, 360k GiB-초)를 쓰려면 결제 연결 자체는 필수다.
  - 한도 내에서는 청구되지 않는다. `--max-instances=3` 상한으로 폭주도 막아둔다.
  - 연결: https://console.cloud.google.com/billing/linkedaccount?project=quotehub-436306
- **MongoDB Atlas 네트워크 접근이 `0.0.0.0/0`으로 열려 있을 것**
  - Cloud Run은 이그레스 IP가 고정되지 않는다. 특정 IP만 허용해두면 DB 연결이 실패한다.
  - 고정 IP가 필요하면 VPC 커넥터 + Cloud NAT가 필요한데 이건 **유료**다.
  - 확인: Atlas → Network Access → IP Access List

## 배포 절차

```bash
cd QuoteHub-server
```

**1단계 — 시크릿 등록 (최초 1회, 값이 바뀔 때만 다시)**

```bash
./scripts/gcp-setup-secrets.sh
```

`.env`를 읽어 민감한 값 10개를 Secret Manager에 등록하고, 전용 서비스 계정
`quotehub-run`을 만들어 읽기 권한을 부여한다. 값이 그대로면 새 버전을 만들지 않으므로
여러 번 실행해도 안전하다.

**2단계 — 배포 (코드 바뀔 때마다 반복)**

```bash
./scripts/gcp-deploy.sh
```

로컬 Docker 없이 소스를 Cloud Build로 올려 빌드한다. 첫 배포는 3~5분, 이후는 1~2분.
끝나면 서비스 URL과 `/health`, `/health/ready` 응답을 출력한다.

**3단계 — iOS 앱에 URL 반영**

배포 출력의 URL을 `QuoteHub/Network/Endpoints/EndpointProtocol.swift`의
`ServerEnvironment.production`에 붙여넣는다. 앱 전체에서 서버 주소를 참조하는 곳은 여기 한 군데다.

## 설정 값이 바뀔 때

| 바뀐 것 | 할 일 |
|---|---|
| `.env`의 시크릿 값 | `./scripts/gcp-setup-secrets.sh` 후 `./scripts/gcp-deploy.sh` |
| 서버 코드 | `./scripts/gcp-deploy.sh` |
| 리전·서비스명·시크릿 목록 | `scripts/gcp-config.sh` 수정 |

## 운영

```bash
# 로그 실시간 확인
gcloud run services logs tail quotehub-server --project=quotehub-436306 --region=asia-northeast3

# 현재 상태
gcloud run services describe quotehub-server --project=quotehub-436306 --region=asia-northeast3

# 직전 리비전으로 롤백 (리비전 목록에서 이름 확인 후)
gcloud run services update-traffic quotehub-server --to-revisions=REVISION_NAME=100 \
  --project=quotehub-436306 --region=asia-northeast3
```

## 비용 관리

무료 한도를 넘지 않게 잡아둔 설정:

- `--min-instances=0` — 유휴 시 과금 없음
- `--max-instances=3` — 트래픽 급증/공격 시 상한
- `--concurrency=80` — 인스턴스당 동시 요청을 높게 잡아 vCPU-초 절약
- `--memory=512Mi`, `--cpu=1` — 최소 사양

예산 알림을 걸어두면 더 안전하다:
https://console.cloud.google.com/billing/budgets

## Render와 병행

Cloud Run이 안정화될 때까지 Render 서비스를 지우지 말 것. 두 서비스가 같은 Atlas DB와
S3 버킷을 보므로 동시에 떠 있어도 데이터는 일관된다. iOS 앱의 URL만 되돌리면 즉시 복귀할 수 있다.
