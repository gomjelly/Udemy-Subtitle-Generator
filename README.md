# 🎬 Udemy 한글 자막 생성기

Udemy 영어 강의를 실시간으로 한글 자막으로 번역해주는 Chrome 확장 프로그램입니다.

## ✨ 주요 기능

### � 실시간 번역
- Udemy 영어 자막을 실시간으로 한글로 번역
- Google Cloud Translation API v2 사용
- 번역 캐싱으로 동일 문장 재번역 방지

### 🎨 자막 커스터마이징
- **글자 크기 조절**: 12px ~ 32px (슬라이더)
- **배경 너비 조절**: 60% ~ 100% (슬라이더)
- **드래그 & 위치 저장**: 자막을 원하는 위치로 이동하고 기억

### 📊 스마트 관리
- API 사용량 실시간 모니터링 (월 50만 문자 한도)
- 자동 월간 사용량 리셋
- 깔끔한 에러 처리 (로그만 기록)

### 🔑 간편한 설정
- API 키 인증 상태에 따른 동적 UI
- 한 번 설정하면 자동 저장
- Udemy 사이트 자동 감지

## 🚀 설치 및 설정

### 1. Google Cloud Translation API 키 발급
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 새 프로젝트 생성 또는 기존 프로젝트 선택
3. **API 및 서비스** → **라이브러리**에서 "Cloud Translation API" 검색 및 활성화
4. **API 및 서비스** → **사용자 인증 정보**에서 API 키 생성
5. API 키 제한 설정 (권장: Cloud Translation API만 허용)

### 2. 확장 프로그램 설치

#### 🐳 Docker 빌드 (권장)
1. 이 저장소를 다운로드 또는 클론
2. Docker가 설치되어 있는지 확인
3. PowerShell에서 빌드 스크립트 실행:
   ```powershell
   .\scripts\docker-build.ps1
   ```
   또는 수동 빌드:
   ```bash
   docker build -t udemy-subtitle-generator .
   docker run --name subtitle-build udemy-subtitle-generator
   docker cp subtitle-build:/app/release/udemy-korean-subtitle-generator.zip ./release/
   docker rm subtitle-build
   ```

#### 💻 로컬 빌드
1. Node.js가 설치되어 있는지 확인
2. `v2` 폴더로 이동하여 빌드:
   ```bash
   cd v2
   npm install
   npm run build
   ```

#### Chrome 확장 프로그램 설치
1. Chrome에서 `chrome://extensions/` 접속
2. **개발자 모드** 활성화
3. **압축해제된 확장 프로그램을 로드합니다** 클릭
4. 빌드된 `v2/dist` 폴더 선택

### 3. API 키 설정
1. 확장 프로그램 아이콘 클릭
2. Google Cloud Translation API 키 입력
3. **API 키 저장** 버튼 클릭
4. 인증 완료되면 자동으로 UI 변경

## 📖 사용 방법

### 기본 사용
1. **Udemy 강의 페이지** 접속
2. **영어 자막(CC) 활성화**
3. 확장 프로그램이 **자동으로 한글 자막 생성**

### 자막 커스터마이징
1. 확장 프로그램 팝업 열기
2. **🎨 자막 스타일 설정**에서 조절:
   - 글자 크기 슬라이더
   - 배경 너비 슬라이더
3. 실시간으로 자막에 반영

### 자막 위치 조정
1. 생성된 한글 자막을 **마우스로 드래그**
2. 원하는 위치에 배치
3. **위치 자동 저장** (다음 자막부터 해당 위치에 표시)

## 🛠️ 기술 스택

- **Chrome Extension**: Manifest V3
- **언어**: TypeScript
- **빌드**: Webpack 5 + Docker
- **번역 API**: Google Cloud Translation API v2
- **스타일**: 순수 CSS (반응형 디자인)
- **배포**: Docker 컨테이너 빌드

## � 프로젝트 구조

```
v2/
├── src/
│   ├── background.ts     # 서비스 워커 (API 통신)
│   ├── content.ts        # 컨텐츠 스크립트 (자막 감지/표시)
│   ├── popup.ts          # 팝업 UI 로직
│   └── popup.html        # 팝업 UI 레이아웃
├── icons/                # 확장 프로그램 아이콘
├── manifest.json         # 확장 프로그램 설정
├── webpack.config.js     # 빌드 설정
└── package.json          # 의존성 관리
```

## 🎯 주요 특징

### 성능 최적화
- **번역 캐싱**: 동일한 문장 재번역 방지
- **실시간 감지**: MutationObserver + 주기적 체크
- **메모리 효율**: 불필요한 DOM 조작 최소화

### 사용자 경험
- **위치 기억**: 드래그한 자막 위치 자동 저장
- **스타일 보존**: 드래그 시에도 자막 스타일 유지
- **실시간 조절**: 슬라이더로 즉시 스타일 변경

### 안정성
- **에러 처리**: 모든 오류는 콘솔 로그로만 처리
- **API 관리**: 사용량 모니터링 및 한도 체크
- **자동 복구**: 네트워크 오류 시 자동 재시도

## 📈 사용량 관리

- **월간 한도**: 50만 문자 (Google Cloud 무료 할당량)
- **실시간 모니터링**: 팝업에서 현재 사용량 확인
- **자동 리셋**: 매월 1일 자동으로 사용량 초기화
- **한도 초과 시**: 번역 중단 및 로그 기록

## 🔒 개인정보 보호

- **API 키**: 로컬 Chrome 스토리지에만 저장
- **번역 내용**: Google 서버에서만 처리, 별도 저장 없음
- **사용 데이터**: 개발자가 수집하지 않음

## � 문제 해결

### 자막이 번역되지 않을 때
1. Udemy에서 **영어 자막(CC)이 활성화**되어 있는지 확인
2. **API 키가 올바르게 설정**되어 있는지 확인
3. **개발자 도구 콘솔**에서 오류 메시지 확인

### API 사용량 초과
1. Google Cloud Console에서 **할당량 증가** 요청
2. 또는 **다음 달까지 대기** (자동 리셋)

### 자막 위치가 이상할 때
1. **자막을 드래그**하여 원하는 위치로 이동
2. 위치가 자동으로 저장됨

### Docker 빌드 문제
1. **Docker가 실행 중인지 확인**
2. **권한 문제 시 관리자 권한으로 실행**
3. **메모리 부족 시 Docker 메모리 할당 증가**
4. 상세 가이드: `DOCKER_BUILD_GUIDE.md` 참조

## 📞 지원

문제가 있으시면 GitHub Issues에 등록해주세요!

---

**🎓 Udemy에서 영어 강의를 더 쉽게 들어보세요!**
