#!/bin/bash

# Chrome Web Store 배포용 패키지 생성 스크립트

echo "🚀 Chrome 웹 스토어 배포 패키지 생성 중..."

# v2 디렉토리로 이동
cd v2

# 의존성 설치 및 빌드
echo "📦 빌드 중..."
npm install
npm run build

# 배포용 폴더 생성
echo "📁 배포 폴더 생성 중..."
mkdir -p ../release

# 필요한 파일들을 dist 폴더에서 확인
if [ ! -d "dist" ]; then
    echo "❌ dist 폴더가 없습니다. 빌드를 먼저 실행하세요."
    exit 1
fi

# 배포용 ZIP 파일 생성
echo "🗜️ ZIP 파일 생성 중..."
cd dist
zip -r "../../release/udemy-korean-subtitle-generator.zip" . -x "*.DS_Store*"
cd ..

echo "✅ 배포 패키지가 생성되었습니다!"
echo "📍 위치: release/udemy-korean-subtitle-generator.zip"
echo ""
echo "다음 단계:"
echo "1. https://chrome.google.com/webstore/devconsole/ 접속"
echo "2. '새 항목 추가' 클릭"
echo "3. ZIP 파일 업로드"
echo "4. 스토어 정보 입력"
echo "5. 심사 제출"
