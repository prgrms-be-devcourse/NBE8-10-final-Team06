package com.devstagram.global.config;

import java.nio.ByteBuffer;
import java.sql.CallableStatement;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

import org.hibernate.type.SqlTypes;
import org.hibernate.type.descriptor.ValueBinder;
import org.hibernate.type.descriptor.ValueExtractor;
import org.hibernate.type.descriptor.WrapperOptions;
import org.hibernate.type.descriptor.java.JavaType;
import org.hibernate.type.descriptor.jdbc.BasicBinder;
import org.hibernate.type.descriptor.jdbc.BasicExtractor;
import org.hibernate.type.descriptor.jdbc.JdbcType;

/**
 * H2 dev 환경에서 pgvector VECTOR 타입 대신 VARBINARY로 float[]을 저장한다.
 * ArrayDdlTypeImpl의 BasicPluralType 캐스팅 오류를 피하기 위해 스칼라 타입을 사용한다.
 */
public class H2FloatArrayJdbcType implements JdbcType {

    public static final H2FloatArrayJdbcType INSTANCE = new H2FloatArrayJdbcType();

    @Override
    public int getJdbcTypeCode() {
        return SqlTypes.VECTOR;
    }

    @Override
    public int getDefaultSqlTypeCode() {
        return SqlTypes.VARBINARY;
    }

    @Override
    public <X> ValueBinder<X> getBinder(JavaType<X> javaType) {
        return new BasicBinder<>(javaType, this) {
            @Override
            protected void doBind(PreparedStatement st, X value, int index, WrapperOptions options)
                    throws SQLException {
                st.setBytes(index, toBytes(javaType.unwrap(value, float[].class, options)));
            }

            @Override
            protected void doBind(CallableStatement st, X value, String name, WrapperOptions options)
                    throws SQLException {
                st.setBytes(name, toBytes(javaType.unwrap(value, float[].class, options)));
            }
        };
    }

    @Override
    public <X> ValueExtractor<X> getExtractor(JavaType<X> javaType) {
        return new BasicExtractor<>(javaType, this) {
            @Override
            protected X doExtract(ResultSet rs, int paramIndex, WrapperOptions options) throws SQLException {
                return javaType.wrap(toFloats(rs.getBytes(paramIndex)), options);
            }

            @Override
            protected X doExtract(CallableStatement st, int index, WrapperOptions options) throws SQLException {
                return javaType.wrap(toFloats(st.getBytes(index)), options);
            }

            @Override
            protected X doExtract(CallableStatement st, String name, WrapperOptions options) throws SQLException {
                return javaType.wrap(toFloats(st.getBytes(name)), options);
            }
        };
    }

    private static byte[] toBytes(float[] floats) {
        ByteBuffer buf = ByteBuffer.allocate(floats.length * Float.BYTES);
        for (float f : floats) buf.putFloat(f);
        return buf.array();
    }

    private static float[] toFloats(byte[] bytes) {
        if (bytes == null) return new float[0];
        ByteBuffer buf = ByteBuffer.wrap(bytes);
        float[] floats = new float[bytes.length / Float.BYTES];
        for (int i = 0; i < floats.length; i++) floats[i] = buf.getFloat();
        return floats;
    }
}
