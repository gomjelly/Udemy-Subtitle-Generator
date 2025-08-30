@echo off
echo 🚀 Chrome 웹 스토어 배포 패키지 생성 중...

cd v2

echo 📦 빌드 중...
call npm install
call npm run build

echo 📁 배포 폴더 생성 중...
if not exist "..\release" mkdir "..\release"

if not exist "dist" (
    echo ❌ dist 폴더가 없습니다. 빌드를 먼저 실행하세요.
    pause
    exit /b 1
)

echo 🗜️ ZIP 파일 생성 중...
cd dist
powershell Compress-Archive -Path ".\*" -DestinationPath "..\..\release\udemy-korean-subtitle-generator.zip" -Force
cd ..

echo ✅ 배포 패키지가 생성되었습니다!
echo 📍 위치: release\udemy-korean-subtitle-generator.zip
echo.
echo 다음 단계:
echo 1. https://chrome.google.com/webstore/devconsole/ 접속
echo 2. '새 항목 추가' 클릭
echo 3. ZIP 파일 업로드
echo 4. 스토어 정보 입력
echo 5. 심사 제출

pause
