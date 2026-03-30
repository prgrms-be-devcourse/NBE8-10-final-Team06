import org.gradle.kotlin.dsl.implementation
import org.gradle.kotlin.dsl.runtimeOnly

plugins {
	java
	id("org.springframework.boot") version "3.5.9"
	id("io.spring.dependency-management") version "1.1.7"
	id("com.diffplug.spotless") version "8.1.0"
	id("checkstyle")
}

group = "com"
version = "0.0.1-SNAPSHOT"
description = "devstagram"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

spotless {
	java {
		target("src/**/*.java")

		palantirJavaFormat()   // 기본 포맷팅
		removeUnusedImports()  // 안 쓰는 import 제거
		trimTrailingWhitespace() // 줄 끝 공백 제거
		formatAnnotations()    // @Test, @Override 같은 어노테이션 배치 최적화
		endWithNewline()       // 모든 파일의 끝에 빈 줄 하나를 추가 (POSIX 표준 준수
		// import 구문을 알파벳 순서나 특정 규칙대로 정렬 (코드 리뷰 시 편함)
		importOrder(
			"java",
			"javax",
			"org",
			"com",
			""
		)
	}

	// Java 외 파일  정렬
	format("misc") {
		target("*.gradle", "*.md", ".gitignore")
		trimTrailingWhitespace()
		endWithNewline()
	}
}

configurations {
	compileOnly {
		extendsFrom(configurations.annotationProcessor.get())
	}
}

repositories {
	mavenCentral()
}

checkstyle {
	toolVersion = "10.12.4"
	configFile = file("$rootDir/config/checkstyle/checkstyle.xml")
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-websocket")
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-web")
	implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-data-redis")

	implementation("pgvector:pgvector:0.1.6")

	implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.5")
	implementation ("org.springframework.boot:spring-boot-starter-actuator")

	implementation("io.jsonwebtoken:jjwt-api:0.12.5")
	runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.5")
	runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.5")

	runtimeOnly("org.postgresql:postgresql")
	runtimeOnly("com.h2database:h2")
	implementation ("org.springframework.boot:spring-boot-starter-data-redis")

	compileOnly("org.projectlombok:lombok")
	developmentOnly("org.springframework.boot:spring-boot-devtools")
	runtimeOnly("com.mysql:mysql-connector-j")
	annotationProcessor("org.projectlombok:lombok")
	testImplementation("org.springframework.boot:spring-boot-starter-test")
	developmentOnly("org.springframework.boot:spring-boot-devtools")

	// runtimeOnly("com.mysql:mysql-connector-j")

	testImplementation("org.springframework.security:spring-security-test")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
	testRuntimeOnly("com.h2database:h2")

	//프로메테우스
	implementation ("org.springframework.boot:spring-boot-starter-actuator")
	implementation ("io.micrometer:micrometer-registry-prometheus")
}

tasks.withType<Test> {
	useJUnitPlatform()
}

val querydslDir = "src/main/generated"

sourceSets {
	getByName("main") {
		java.srcDirs(querydslDir)
	}
}

tasks.withType<JavaCompile> {
	options.generatedSourceOutputDirectory.set(file(querydslDir))
}

tasks.named("clean") {
	doLast {
		file(querydslDir).deleteRecursively()
	}
}