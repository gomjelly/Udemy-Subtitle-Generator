#!/bin/bash

# Docker를 사용한 Chrome 확장 프로그램 빌드 스크립트

set -e  # 에러 발생 시 스크립트 중단

echo "🐳 Docker를 사용해서 Chrome 확장 프로그램을 빌드합니다..."

# 이미지 이름
IMAGE_NAME="udemy-subtitle-generator"
CONTAINER_NAME="subtitle-build-$(date +%s)"

# 기존 이미지 정리 (선택사항)
echo "📦 기존 Docker 이미지 정리 중..."
docker rmi $IMAGE_NAME 2>/dev/null || echo "기존 이미지 없음"

# Docker 이미지 빌드
echo "🔨 Docker 이미지 빌드 중..."
docker build -t $IMAGE_NAME .

# 컨테이너 실행
echo "🚀 빌드 컨테이너 실행 중..."
docker run --name $CONTAINER_NAME $IMAGE_NAME

# release 디렉토리 생성 (없으면)
mkdir -p release

# 빌드된 파일 복사
echo "📁 빌드 결과 파일 복사 중..."
docker cp $CONTAINER_NAME:/app/release/udemy-korean-subtitle-generator.zip ./release/

# dist 폴더도 복사 (로컬 테스트용)
echo "📁 빌드된 dist 폴더 복사 중..."
docker cp $CONTAINER_NAME:/app/v2/dist ./v2/

# 컨테이너 정리
echo "🧹 임시 컨테이너 정리 중..."
docker rm $CONTAINER_NAME

# 결과 확인
echo ""
echo "✅ 빌드 완료!"
echo "📦 배포 파일: release/udemy-korean-subtitle-generator.zip"
echo "🔍 파일 크기: $(ls -lh release/udemy-korean-subtitle-generator.zip | awk '{print $5}')"
echo ""
echo "🎯 다음 단계:"
echo "   1. release/udemy-korean-subtitle-generator.zip 파일 확인"
echo "   2. Chrome 웹스토어에 업로드"
echo "   3. 또는 chrome://extensions/ 에서 로컬 테스트"
