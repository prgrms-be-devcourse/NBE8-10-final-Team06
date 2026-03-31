#!/bin/bash
# ─────────────────────────────────────────────────────────
# k6 부하테스트용 시드 유저 생성 스크립트
#
# 실행 전 조건:
#   - 서버가 실행 중이어야 함
#   - BASE_URL 환경변수 또는 인자로 대상 URL 지정
#
# 사용법:
#   ./seed/create-test-users.sh
#   ./seed/create-test-users.sh http://localhost:8080
# ─────────────────────────────────────────────────────────

BASE_URL=${1:-"https://devstagram.site"}
COMMON_PW="Test1234Pw"

echo "🌱 k6 테스트 유저 생성 시작 (대상: ${BASE_URL})"
echo ""

for i in $(seq -w 1 10); do
    EMAIL="k6test${i}@devstagram.com"
    NICKNAME="k6dev${i}"

    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "${BASE_URL}/api/auth/signup" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${EMAIL}\",
            \"nickname\": \"${NICKNAME}\",
            \"password\": \"${COMMON_PW}\",
            \"birthDate\": \"2000-01-01\",
            \"gender\": \"MALE\",
            \"resume\": \"JUNIOR\"
        }")

    if [[ "${RESPONSE}" == "200" || "${RESPONSE}" == "201" ]]; then
        echo "  ✅ 생성됨: ${EMAIL}"
    elif [[ "${RESPONSE}" == "409" ]]; then
        echo "  ⚠️  이미 존재: ${EMAIL}"
    else
        echo "  ❌ 실패 (${RESPONSE}): ${EMAIL}"
    fi
done

echo ""
echo "✅ 시드 유저 생성 완료"
echo "   이메일: k6test01@devstagram.com ~ k6test10@devstagram.com"
   echo "   비밀번호: ${COMMON_PW}"
