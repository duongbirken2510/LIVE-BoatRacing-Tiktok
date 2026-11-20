@echo off
chcp 65001 >nul
title LIVE-BOAT RACING TIKTOK (Duong Birken)
cd /d "%~dp0"
if not exist node_modules (
  echo [1/2] Lan dau chay: dang cai thu vien Node.js, doi 1-2 phut...
  call npm install
)
echo Dang khoi dong LIVE-BOAT RACING TIKTOK + Giong doc AI VieNeu tich hop ngam...
echo Dong cua so nay la tat toan bo game va giong doc.
echo Link cho TikTok LIVE Studio: http://lvh.me:3010/?view=stage  (1080 x 1920)
rem Dam bao luon chay qua Vite ngay ca khi may tinh co bien NODE_ENV=production
set NODE_ENV=development
rem Che do live: trang stage khong tu tai lai khi sua code
set LIVE_MODE=1
set PORT=3010
start "" cmd /c "timeout /t 6 >nul & start http://localhost:3010"
npm run dev
pause
