# Devstagram k6 부하테스트

Devstagram 백엔드 API를 대상으로 한 k6 기반 부하테스트 환경입니다.

## 디렉터리 구조

```
infra/k6/
├── scenarios/
│   ├── smoke.js    # Smoke Test   - 1 VU × 1분  (최소 동작 확인)
│   ├── load.js     # Load Test    - 최대 50 VU × 21분 (정상 부하)
│   ├── stress.js   # Stress Test  - 최대 400 VU × 25분 (한계 탐색)
│   ├── spike.js    # Spike Test   - 300 VU 스파이크 (폭증 내성)
│   └── soak.js     # Soak Test    - 30 VU × 1시간+ (장시간 안정성)
├── helpers/
│   ├── auth.js     # 로그인 / 토큰 관리
│   └── data.js     # 테스트 데이터 생성 유틸
├── seed/
│   └── create-test-users.sh   # 테스트 유저 10명 생성
└── run.sh          # 통합 실행 스크립트
```

---

## 인프라 스택

| 컴포넌트 | 역할 | 포트 |
|----------|------|------|
| **k6** | 부하 생성기 | - (일회성 컨테이너) |
| **InfluxDB v2** | k6 결과 저장 | 8086 |
| **Grafana** | 실시간 시각화 | 3001 |
| **Prometheus** | 서버 메트릭 수집 | 9090 |

---

## 시작 방법

### 1. 인프라 실행

```bash
cd infra

# 기존 스택 + InfluxDB + Grafana 함께 시작
docker compose up -d

# InfluxDB 상태 확인
curl http://localhost:8086/health
```

### 2. 테스트 유저 생성

```bash
# 서버가 실행 중이어야 함
chmod +x k6/seed/create-test-users.sh
./k6/seed/create-test-users.sh https://devstagram.site

# 생성 결과: test01@devstagram.com ~ test10@devstagram.com / Test1234!!
```

### 3. Grafana 설정

1. `http://localhost:3001` 접속 (admin / devstagram123!)
2. **Datasources** → InfluxDB-k6 자동 프로비저닝 확인
3. **Dashboards → Import** → ID `12003` 입력 (k6 Load Testing Results)

---

## 테스트 실행

### 방법 A: run.sh 스크립트 (권장)

```bash
cd infra/k6
chmod +x run.sh

# Smoke Test (로컬 출력)
./run.sh smoke

# Load Test + InfluxDB 저장
./run.sh load --influx

# Stress Test (다른 URL)
./run.sh stress --url http://localhost:8080

# Spike Test + InfluxDB
./run.sh spike --influx

# Soak Test (장시간)
./run.sh soak --influx
```

### 방법 B: Docker Compose로 직접 실행

```bash
cd infra

# Smoke Test
docker compose --profile loadtest run --rm \
  -e BASE_URL=https://devstagram.site \
  k6 run \
  -o xk6-influxdb=http://influxdb:8086 \
  /scripts/scenarios/smoke.js

# Load Test
docker compose --profile loadtest run --rm \
  -e BASE_URL=https://devstagram.site \
  k6 run \
  -o xk6-influxdb=http://influxdb:8086 \
  /scripts/scenarios/load.js
```

### 방법 C: k6 로컬 설치 후 실행

```bash
# macOS
brew install k6

# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6

# 실행
k6 run -e BASE_URL=https://devstagram.site infra/k6/scenarios/smoke.js
```

---

## 시나리오 상세

### Smoke Test (`smoke.js`)

| 항목 | 값 |
|------|-----|
| VU | 1 |
| 시간 | 1분 |
| 목적 | 배포 후 핵심 API 동작 검증 |
| 임계값 | 오류율 < 1%, p(95) < 2초 |

**흐름**: 로그인 → 피드 조회 → 게시글 작성 → 게시글 상세 → 댓글 작성 → 게시글 삭제

---

### Load Test (`load.js`)

| 항목 | 값 |
|------|-----|
| VU | 0 → 20 → 50 → 0 |
| 시간 | 21분 |
| 목적 | 일반 운영 트래픽 성능 측정 |
| 임계값 | 오류율 < 5%, p(95) < 3초 |

**흐름**: 로그인 → 피드/스토리 조회 → 50% 확률로 게시글+댓글 작성 → 40% 확률로 DM 목록 → 팔로잉 목록

---

### Stress Test (`stress.js`)

| 항목 | 값 |
|------|-----|
| VU | 0 → 100 → 200 → 300 → 400 → 0 |
| 시간 | 25분 |
| 목적 | Breaking point 탐색 |
| 임계값 | 오류율 < 20%, p(95) < 10초 |

**트래픽 비율**: 읽기 70% (피드) / 쓰기 30% (게시글 작성)

---

### Spike Test (`spike.js`)

| 항목 | 값 |
|------|-----|
| VU | 10 → 300 → 10 → 0 |
| 시간 | 8분 |
| 목적 | 순간 폭증 내성 및 회복력 |
| 임계값 | 오류율 < 15%, p(95) < 8초 |

**특징**: 503도 허용 (Circuit Breaker 동작 확인), 회복 구간 모니터링

---

### Soak Test (`soak.js`)

| 항목 | 값 |
|------|-----|
| VU | 30 |
| 시간 | 65분+ |
| 목적 | 메모리 누수, DB 커넥션 고갈 탐지 |
| 임계값 | 오류율 < 5%, p(95) < 3초 |

---

## 커스텀 메트릭

| 메트릭 | 타입 | 설명 |
|--------|------|------|
| `custom_login_duration` | Trend | 로그인 응답시간 |
| `custom_feed_duration` | Trend | 피드 조회 응답시간 |
| `custom_post_duration` | Trend | 게시글 생성 응답시간 |
| `custom_comment_duration` | Trend | 댓글 생성 응답시간 |
| `custom_story_duration` | Trend | 스토리 관련 응답시간 |
| `custom_dm_duration` | Trend | DM 관련 응답시간 |
| `custom_error_rate` | Rate | 비즈니스 오류율 |
| `custom_total_requests` | Counter | 총 요청 수 |

---

## Grafana 대시보드

실행 후 `http://localhost:3001` 접속.

| 대시보드 | Import ID | 내용 |
|----------|-----------|------|
| k6 Load Testing Results | `12003` | VU 수, RPS, 응답시간 분포, 오류율 |
| k6 Prometheus Native | `19665` | Prometheus 연동 시 |

---

## 주의사항

- **시드 유저 생성** 없이 실행하면 로그인 실패로 모든 테스트가 중단됩니다.
- Stress/Spike 테스트는 **실제 운영 서버에 영향**을 주므로 테스트 환경에서 실행하세요.
- `soak.js`는 약 **65분** 소요됩니다.
- InfluxDB `devstagram-influx-token`은 운영 환경에서 **반드시 변경**하세요.
