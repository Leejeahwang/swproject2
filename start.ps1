# PowerShell 실행 정책 우회
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  🚀 쉐어허브 서버 시작" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "백엔드(5000)와 프론트엔드(3000) 동시 실행 중..." -ForegroundColor Yellow
Write-Host ""
Write-Host "종료하려면 Ctrl + C를 누르세요" -ForegroundColor Red
Write-Host ""

npm run dev:all

