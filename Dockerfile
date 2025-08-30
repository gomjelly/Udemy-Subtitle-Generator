FROM alpine:latest

WORKDIR /app

# RUN apk update && apk add --no-cache \
#     git \
#     zip \
#     && rm -rf /var/cache/apk/*

COPY package*.json ./
COPY tsconfig.json ./
COPY webpack.config.js ./
COPY manifest.json ./
COPY PRIVACY_POLICY.md ./
COPY DEPLOYMENT_GUIDE.md ./
COPY DEPLOYMENT_CHECKLIST.md ./
COPY README.md ./
COPY Dockerfile ./

COPY v2/package*.json ./v2/
COPY v2/tsconfig.json ./v2/
COPY v2/webpack.config.js ./v2/
COPY v2/manifest.json ./v2/
COPY v2/src/ ./v2/src/
COPY v2/icons/ ./v2/icons/

COPY scripts/ ./scripts/

# WORKDIR /app/v2

# RUN npm ci --only=production=false

# RUN npm run build

# RUN ls -la dist/

# WORKDIR /app

# RUN mkdir -p release

# RUN cd v2 && \
#     zip -r ../release/udemy-korean-subtitle-generator.zip \
#     dist/ \
#     icons/ \
#     manifest.json \
#     -x "dist/**/*.map" "**/.DS_Store" "**/Thumbs.db"


# RUN ls -la release/
# RUN echo "빌드 완료! 배포 파일: release/udemy-korean-subtitle-generator.zip"


# CMD ["/bin/sh", "-c", "echo '도커 빌드 완료! 배포 파일이 /app/release/ 에 생성되었습니다.'; /bin/sh"]

CMD ["sleep", "infinity"]