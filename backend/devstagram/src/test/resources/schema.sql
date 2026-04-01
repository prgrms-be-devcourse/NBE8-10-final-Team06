-- H2가 vector(n) 구문을 만나면 가짜 타입으로 처리하게 함
CREATE DOMAIN IF NOT EXISTS vector AS FLOAT4 ARRAY;