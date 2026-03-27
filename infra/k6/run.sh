#!/bin/bash
# ─────────────────────────────────────────────────────────
# Devstagram k6 부하테스트 실행 스크립트
#
# 사용법:
#   ./run.sh [시나리오] [옵션]
#
# 시나리오:
#   smoke   - 최소 부하 기본 동작 확인 (1 VU × 1분)
#   load    - 정상 부하 테스트 (최대 50 VU × 21분)
#   stress  - 한계 부하 테스트 (최대 400 VU × 25분)
#   spike   - 트래픽 폭증 테스트 (300 VU 스파이크)
#   soak    - 장시간 안정성 (30 VU × 1시간+)
#
# 옵션:
#   --local     InfluxDB 없이 로컬 출력만 (기본값)
#   --influx    InfluxDB로 결과 전송 (도커 환경)
#   --url URL   대상 URL 지정 (기본: https://devstagram.site)
#
# 예시:
#   ./run.sh smoke
#   ./run.sh load --influx
#   ./run.sh stress --url http://localhost:8080
# ─────────────────────────────────────────────────────────

set -e

SCENARIO=${1:-smoke}
BASE_URL="https://devstagram.site"
OUTPUT=""
INFLUXDB_URL="http://influxdb:8086"

# 인자 파싱
shift || true
while [[ $# -gt 0 ]]; do
    case $1 in
        --influx)
            OUTPUT="-o xk6-influxdb=${INFLUXDB_URL}"
            shift
            ;;
        --url)
            BASE_URL="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# 시나리오 파일 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCENARIO_FILE="${SCRIPT_DIR}/scenarios/${SCENARIO}.js"

if [[ ! -f "${SCENARIO_FILE}" ]]; then
    echo "❌ 알 수 없는 시나리오: ${SCENARIO}"
    echo "   사용 가능: smoke | load | stress | spike | soak"
    exit 1
fi

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║        Devstagram k6 부하테스트 시작              ║"
echo "╚══════════════════════════════════════════════════╝"
echo "  시나리오 : ${SCENARIO}"
echo "  대상 URL : ${BASE_URL}"
echo "  출력     : ${OUTPUT:-콘솔(stdout)}"
echo "  시작 시각: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ─── 도커 내부에서 실행 ───
if command -v k6 &> /dev/null; then
    # k6가 로컬에 설치된 경우
    k6 run \
        -e BASE_URL="${BASE_URL}" \
        ${OUTPUT} \
        "${SCENARIO_FILE}"
else
    # 도커 컴포즈를 통해 실행
    cd "${SCRIPT_DIR}/.."
    docker compose --profile loadtest run --rm \
        -e BASE_URL="${BASE_URL}" \
        -e K6_INFLUXDB_ORGANIZATION=devstagram \
        -e K6_INFLUXDB_BUCKET=k6 \
        -e K6_INFLUXDB_TOKEN=devstagram-influx-token \
        k6 run \
        ${OUTPUT} \
        -e BASE_URL="${BASE_URL}" \
        "/scripts/scenarios/${SCENARIO}.js"
fi

echo ""
echo "✅ 테스트 완료: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "📊 Grafana 대시보드: http://localhost:3001"
echo "   - ID 12003 (k6 Load Testing Results)"
echo "   - Datasource: InfluxDB-k6"
