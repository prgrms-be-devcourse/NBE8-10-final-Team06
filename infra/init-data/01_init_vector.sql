-- 메인 DB에 익스텐션 설치
CREATE EXTENSION IF NOT EXISTS vector;

-- 테스트용 DB 생성
CREATE DATABASE devstagram_test;

-- 테스트 DB에 접속하여 익스텐션 설치
\c devstagram_test
CREATE EXTENSION IF NOT EXISTS vector;