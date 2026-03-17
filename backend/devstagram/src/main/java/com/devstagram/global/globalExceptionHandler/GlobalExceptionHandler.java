package com.devstagram.global.globalExceptionHandler;

import com.devstagram.global.exception.ServiceException;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(ServiceException.class)
    public ResponseEntity<ErrorResponse> handleServiceException(ServiceException ex) {

        log.error("[{}] {} : {}", ex.getLocation(), ex.getResultCode(), ex.getMsg());
        HttpStatus httpStatus = checkStatus(ex.getResultCode());
        ErrorResponse response = new ErrorResponse(ex.getResultCode(), ex.getMsg());

        return ResponseEntity.status(httpStatus).body(response);
    }

    private HttpStatus checkStatus(String resultCode) {
        try {
            if (resultCode != null && resultCode.length() >= 3) {
                int code = Integer.parseInt(resultCode.substring(0, 3));

                HttpStatus status = HttpStatus.resolve(code);
                if (status != null) return status;
            }
        } catch (NumberFormatException ignored) {}

        return HttpStatus.INTERNAL_SERVER_ERROR;
    }

    @Getter
    @AllArgsConstructor
    public static class ErrorResponse {
    private String resultCode;
    private String msg;
    }
}