# QuoteHub API 프록시 (Cloudflare Worker)

`quotehub-api.iyungui.dev` → Cloud Run 백엔드로 프록시하는 Worker.
앱과 백엔드 사이에 안정적인 주소 한 겹을 둬서, 나중에 백엔드를 옮겨도 앱 재배포가
필요 없게 만든다.

## 최초 배포

```bash
cd QuoteHub-server/cloudflare

# 1) Cloudflare 로그인 (브라우저가 열리고 승인하면 됨)
npx wrangler login

# 2) 배포 — Worker + DNS 레코드 + TLS 인증서가 자동 생성됨
npx wrangler deploy
```

배포가 끝나면 `https://quotehub-api.iyungui.dev/health` 가 `OK`를 반환한다.
(DNS·인증서 전파에 수 분 걸릴 수 있다.)

## 백엔드를 옮겼을 때

`src/index.js`의 `ORIGIN` 값을 새 백엔드 주소로 바꾸고:

```bash
npx wrangler deploy
```

앱은 그대로 두면 된다. 이게 이 Worker의 존재 이유다.

## 로컬 테스트

```bash
npx wrangler dev
```

## 구조

```
iOS 앱 → quotehub-api.iyungui.dev (Cloudflare Worker) → Cloud Run → MongoDB Atlas / S3
```
