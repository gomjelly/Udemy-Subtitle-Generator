# Docker를 사용한 Chrome 확장 프로그램 빌드 스크립트 (PowerShell)

param(
    [switch]$CleanBuild = $false  # -CleanBuild 옵션으로 기존 이미지 삭제
)

# 에러 발생 시 스크립트 중단
$ErrorActionPreference = "Stop"

Write-Host "🐳 Docker를 사용해서 Chrome 확장 프로그램을 빌드합니다..." -ForegroundColor Cyan

# 이미지 이름
$IMAGE_NAME = "udemy-subtitle-generator"
$CONTAINER_NAME = "subtitle-build-$(Get-Date -Format 'yyyyMMddHHmmss')"

# 기존 이미지 정리 (CleanBuild 옵션 사용 시)
if ($CleanBuild) {
    Write-Host "📦 기존 Docker 이미지 정리 중..." -ForegroundColor Yellow
    try {
        docker rmi $IMAGE_NAME 2>$null
        Write-Host "✅ 기존 이미지 삭제 완료" -ForegroundColor Green
    }
    catch {
        Write-Host "ℹ️ 기존 이미지 없음" -ForegroundColor Gray
    }
}

try {
    # Docker 이미지 빌드
    Write-Host "🔨 Docker 이미지 빌드 중..." -ForegroundColor Yellow
    docker build -t $IMAGE_NAME .
    
    if ($LASTEXITCODE -ne 0) {
        throw "Docker 빌드 실패"
    }
    
    # 컨테이너 실행
    Write-Host "🚀 빌드 컨테이너 실행 중..." -ForegroundColor Yellow
    docker run --name $CONTAINER_NAME $IMAGE_NAME
    
    if ($LASTEXITCODE -ne 0) {
        throw "컨테이너 실행 실패"
    }
    
    # release 디렉토리 생성 (없으면)
    if (!(Test-Path "release")) {
        New-Item -ItemType Directory -Path "release" | Out-Null
    }
    
    # 빌드된 파일 복사
    Write-Host "📁 빌드 결과 파일 복사 중..." -ForegroundColor Yellow
    docker cp "${CONTAINER_NAME}:/app/release/udemy-korean-subtitle-generator.zip" "./release/"
    
    if ($LASTEXITCODE -ne 0) {
        throw "파일 복사 실패"
    }
    
    # dist 폴더도 복사 (로컬 테스트용)
    Write-Host "📁 빌드된 dist 폴더 복사 중..." -ForegroundColor Yellow
    
    # 기존 dist 폴더 삭제 (있으면)
    if (Test-Path "v2\dist") {
        Remove-Item -Recurse -Force "v2\dist"
    }
    
    docker cp "${CONTAINER_NAME}:/app/v2/dist" "./v2/"
    
    if ($LASTEXITCODE -ne 0) {
        throw "dist 폴더 복사 실패"
    }
    
    # 결과 확인
    $zipFile = Get-Item "release\udemy-korean-subtitle-generator.zip"
    $fileSize = [math]::Round($zipFile.Length / 1KB, 2)
    
    Write-Host ""
    Write-Host "✅ 빌드 완료!" -ForegroundColor Green
    Write-Host "📦 배포 파일: release\udemy-korean-subtitle-generator.zip" -ForegroundColor Green
    Write-Host "🔍 파일 크기: ${fileSize} KB" -ForegroundColor Green
    Write-Host ""
    Write-Host "🎯 다음 단계:" -ForegroundColor Cyan
    Write-Host "   1. release\udemy-korean-subtitle-generator.zip 파일 확인" -ForegroundColor White
    Write-Host "   2. Chrome 웹스토어에 업로드" -ForegroundColor White
    Write-Host "   3. 또는 chrome://extensions/ 에서 로컬 테스트" -ForegroundColor White
    
}
catch {
    Write-Host "❌ 빌드 실패: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
finally {
    # 컨테이너 정리
    Write-Host "🧹 임시 컨테이너 정리 중..." -ForegroundColor Yellow
    try {
        docker rm $CONTAINER_NAME 2>$null
    }
    catch {
        Write-Host "⚠️ 컨테이너 정리 실패 (수동으로 정리 필요): $CONTAINER_NAME" -ForegroundColor Yellow
    }
}
