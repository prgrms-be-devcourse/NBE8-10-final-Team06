# 기존 openjdk 대신 이걸 사용합니다 (훨씬 안정적입니다)
FROM eclipse-temurin:21-jdk-alpine

WORKDIR /app

# 빌드된 jar 파일 복사
COPY build/libs/*.jar app.jar

ENTRYPOINT ["java", "-jar", "app.jar"]