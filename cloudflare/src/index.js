// QuoteHub API 리버스 프록시 Worker
//
// quotehub-api.iyungui.dev 로 들어온 모든 요청을 Cloud Run 백엔드로 그대로 넘긴다.
// 이렇게 앱과 백엔드 사이에 "내가 제어하는 주소" 한 겹을 두면,
// 나중에 백엔드를 어디로 옮기든 아래 ORIGIN 한 줄만 바꾸면 되고 앱은 안 건드려도 된다.
//
// 백엔드를 옮겼을 때: ORIGIN 값을 새 주소로 바꾸고 `npx wrangler deploy` 재실행.

const ORIGIN = "quotehub-server-1046144334830.asia-northeast3.run.app";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = ORIGIN;
    url.protocol = "https:";
    url.port = "";

    // 메서드·헤더·바디를 보존한 채 목적지만 바꿔 전달한다.
    // fetch가 대상 호스트에 맞는 Host 헤더를 자동 설정하므로
    // Cloud Run이 요청을 정상 인식한다.
    const proxied = new Request(url.toString(), request);
    proxied.headers.set("X-Forwarded-Host", new URL(request.url).host);

    return fetch(proxied);
  },
};
