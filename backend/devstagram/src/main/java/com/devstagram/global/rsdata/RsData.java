package com.devstagram.global.rsdata;

import com.fasterxml.jackson.annotation.JsonIgnore;

public record RsData<T>(String resultCode, @JsonIgnore int statusCode, String msg, T data) {
    public static <T> RsData<T> success(T data) {
        return new RsData<>("200-S-1", "성공", data);
    }

    public static <T> RsData<T> success(String msg, T data) {
        return new RsData<>("200-S-1", msg, data);
    }

    public static <T> RsData<T> success() {
        return success(null);
    }

    public static <T> RsData<T> fail(String msg) {
        return new RsData<>("400-F-1", msg, null);
    }

    @JsonIgnore
    public boolean isSuccess() {
        return statusCode >= 200 && statusCode < 400;
    }

    public RsData(String resultCode, String msg, T data) {
        this(resultCode, Integer.parseInt(resultCode.split("-", 2)[0]), msg, data);
    }
}
