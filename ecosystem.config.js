// PM2 ecosystem 설정 파일
// 실행: pm2 start ecosystem.config.js
// 중지: pm2 stop quotehub
// 재시작: pm2 restart quotehub
// 로그 확인: pm2 logs quotehub

module.exports = {
  apps: [
    {
      name: "quotehub",
      script: "server.js",
      instances: 1,         // CPU 코어 수만큼 늘리려면 "max" 로 변경
      exec_mode: "fork",    // instances > 1이면 "cluster" 로 변경
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // 메모리 초과 시 자동 재시작 (Oracle Cloud 무료 1GB RAM 고려)
      max_memory_restart: "400M",
      // 로그 설정
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      merge_logs: true,
    },
  ],
};
