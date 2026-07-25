# iyungui.dev 도메인 활용 가이드

`iyungui.dev`를 개인 포트폴리오 허브로 쓰는 법. 블로그·다른 앱·게임 등을 서브도메인으로
무제한 얹는 방법을 정리한다.

---

## 0. 이 도메인은 내 것인가?

**그렇다.** Cloudflare Registrar에서 등록했으므로 등록 기간 동안 `iyungui.dev`는 전적으로
내 소유다. 그 아래 모든 서브도메인, DNS 설정, 연결 대상을 내가 제어한다. 다른 누구도
이 도메인을 쓸 수 없다.

**등록 만료일: 2029-07-25** (2026-07-25 등록, 3년). 이 날짜 전에 갱신하면 계속 유지된다.

**단 두 가지만 지키면 된다:**
- **자동 갱신(Auto-renew)을 켜 둘 것.** 도메인은 매년 갱신해야 유지된다. 만료되면 남이
  가져갈 수 있고, 그러면 이 도메인에 걸린 모든 서비스(앱 백엔드 포함!)가 끊긴다.
  → Cloudflare 대시보드 → 도메인 → **Configuration → Auto-renew: On** 확인.
- **WHOIS 개인정보 보호**가 켜져 있는지 확인 (Cloudflare는 기본 무료 제공).

확인: https://dash.cloudflare.com → `iyungui.dev` 선택

---

## 1. 큰 그림 — 도메인 1개, 서브도메인 무제한

도메인 하나를 사면 그 아래 서브도메인은 **개수 제한 없이 공짜**다. 각 서브도메인은
서로 완전히 다른 서비스를 가리켜도 된다.

```
iyungui.dev                  ← 개인 랜딩/포트폴리오 페이지
├─ quotehub-api.iyungui.dev  ← 문장모아 백엔드 (이미 설정됨 → Cloud Run)
├─ blog.iyungui.dev          ← 블로그
├─ game1.iyungui.dev         ← 다음 게임
├─ game1-api.iyungui.dev     ← 그 게임의 백엔드
└─ docs.iyungui.dev          ← 문서 사이트
```

모두 하나의 Cloudflare 대시보드에서 관리하고, 전부 무료 티어로 커버된다.
**새 프로젝트를 추가하는 한계비용은 0원.**

---

## 2. 반드시 지킬 규칙 — "한 단계 서브도메인"

Cloudflare 무료 SSL 인증서(Universal SSL)는 다음만 자동으로 커버한다:
- `iyungui.dev` (최상위)
- `*.iyungui.dev` (**한 단계** 서브도메인)

즉 이런 건 무료 SSL 커버 ✅
- `blog.iyungui.dev`
- `quotehub-api.iyungui.dev`

이런 **두 단계**는 무료 SSL이 안 됨 ❌ (유료 인증서 필요)
- `api.quotehub.iyungui.dev`

**결론: 서브도메인은 항상 한 겹으로.** 프로젝트 API가 필요하면
`quotehub.iyungui.dev` + `quotehub-api.iyungui.dev`처럼 하이픈으로 구분한다.

---

## 3. 용도별 연결 레시피

### A. 블로그 / 정적 사이트 → Cloudflare Pages (완전 무료)

가장 흔한 케이스. GitHub 레포를 연결하면 push할 때마다 자동 배포된다.
(Hugo, Astro, Next.js, Jekyll, 순수 HTML 등 무엇이든)

1. https://dash.cloudflare.com → **Workers & Pages → Create → Pages**
2. GitHub 레포 연결 → 빌드 설정 선택 → 배포
3. 배포된 프로젝트 → **Custom domains → Set up a domain** → `blog.iyungui.dev` 입력
4. Cloudflare가 DNS·인증서를 자동 생성. 끝.

> Pages는 대역폭 무제한, 월 500회 빌드까지 무료. 개인 블로그엔 차고 넘친다.

### B. 다른 앱의 백엔드 API → Worker 프록시

QuoteHub와 똑같은 패턴. `cloudflare/` 폴더의 Worker를 복제해서 쓰면 된다.

1. `wrangler.toml`의 `name`과 `routes` 패턴을 새 서브도메인으로 변경
   (예: `game1-api.iyungui.dev`)
2. `src/index.js`의 `ORIGIN`을 그 앱의 백엔드 주소로 변경
3. `npx wrangler deploy`

> 이렇게 하면 그 앱도 "백엔드 옮겨도 앱 재배포 불필요" 혜택을 받는다.

### C. 외부 호스팅(Vercel/Netlify/GitHub Pages 등) 연결 → CNAME

이미 다른 데 배포한 사이트에 내 도메인만 붙이는 경우.

1. Cloudflare 대시보드 → `iyungui.dev` → **DNS → Records → Add record**
2. Type `CNAME`, Name `프로젝트이름`(예: `shop`), Target = 그 서비스가 알려준 주소
   (예: `cname.vercel-dns.com`)
3. 프록시(주황 구름)는 서비스 안내에 따라 켜거나 끈다. 보통 Vercel/Netlify는 **DNS only(회색)** 권장.
4. 그 호스팅 서비스 쪽에도 `shop.iyungui.dev`를 커스텀 도메인으로 등록.

### D. 이메일 받기 → Cloudflare Email Routing (무료)

`me@iyungui.dev` 같은 주소로 온 메일을 기존 Gmail로 전달받을 수 있다.

1. Cloudflare 대시보드 → `iyungui.dev` → **Email → Email Routing**
2. 활성화 → 전달 규칙 추가 (`me@iyungui.dev` → 내 Gmail)
3. Cloudflare가 MX 레코드를 자동 설정.

> 받기(전달)는 무료. `iyungui.dev`에서 **보내기**까지 하려면 별도 메일 서비스
> (Google Workspace 등, 유료)가 필요하다.

---

## 4. DNS 레코드 타입 빠른 참고

| 타입 | 언제 쓰나 | 예시 |
|---|---|---|
| `CNAME` | 다른 도메인 주소를 가리킬 때 (대부분의 경우) | `shop` → `cname.vercel-dns.com` |
| `A` | 고정 IP(서버)를 가리킬 때 | `vpn` → `123.45.67.89` |
| `AAAA` | IPv6 주소 | `vpn` → `2606:...` |
| `TXT` | 도메인 소유 증명, 이메일 인증(SPF/DKIM) | `_dmarc` 등 |
| `MX` | 이메일 수신 서버 (Email Routing이 자동 설정) | — |

> **프록시(주황 구름) vs DNS only(회색 구름)**: 주황이면 Cloudflare가 트래픽을 거쳐
> CDN·SSL·보안·캐싱을 제공한다. Workers/Pages는 자동 처리되고, 일부 외부 서비스는
> 회색을 요구하니 그 서비스 안내를 따른다.

---

## 5. 새 프로젝트 추가 체크리스트

1. 서브도메인 이름 정하기 — **한 단계로** (예: `newapp.iyungui.dev`)
2. 위 레시피 중 유형 선택 (정적=Pages, API=Worker, 외부=CNAME)
3. 연결 후 `https://서브도메인.iyungui.dev` 접속 확인
4. 아래 "사용 중인 서브도메인" 표에 기록

---

## 6. 사용 중인 서브도메인 대장

새 서브도메인을 만들 때마다 여기 적어두면 나중에 헷갈리지 않는다.

| 서브도메인 | 용도 | 연결 대상 | 설정 방식 |
|---|---|---|---|
| `quotehub-api.iyungui.dev` | 문장모아 백엔드 | Cloud Run (via Worker) | Worker (`cloudflare/`) |
| _(예정)_ `iyungui.dev` | 개인 랜딩 | — | — |
| _(예정)_ `blog.iyungui.dev` | 블로그 | — | — |

---

## 참고

- Cloudflare 대시보드: https://dash.cloudflare.com
- Pages 문서: https://developers.cloudflare.com/pages/
- Workers 문서: https://developers.cloudflare.com/workers/
- Email Routing: https://developers.cloudflare.com/email-routing/
