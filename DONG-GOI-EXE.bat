@echo off
chcp 65001 >nul
title Dong Goi Bo Cai Dat EXE - LIVE-BOAT RACING TIKTOK (Duong Birken)
cd /d "%~dp0"

echo ======================================================================
echo   📦 ĐANG ĐÓNG GÓI BỘ CÀI ĐẶT WINDOWS (.EXE) — LIVE-BOAT RACING TIKTOK
echo ======================================================================
node tools/build-windows-installer.mjs
if %errorlevel% neq 0 (
    echo [!] Có lỗi khi đóng gói bộ cài đặt .EXE.
    pause
    exit /b 1
)

echo.
echo ======================================================================
echo   🎉 HOÀN TẤT ĐÓNG GÓI FILE CÀI ĐẶT .EXE!
echo   💿 File cài đặt gửi người dùng: Release_Windows\LIVE-BoatRacing-Tiktok-v2.0.0-Setup.exe
echo ======================================================================
pause
