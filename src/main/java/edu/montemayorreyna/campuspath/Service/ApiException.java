package edu.montemayorreyna.campuspath.Service;

import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * An error that should reach the client as a specific HTTP status with a readable message,
 * e.g. 404 "Location not found" instead of a generic 500.
 * Turned into a JSON response by Controller.ApiExceptionHandler.
 */
@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public static ApiException notFound(String what) {
        return new ApiException(HttpStatus.NOT_FOUND, what + " not found");
    }

    public static ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }

    public static ApiException unauthorized(String message) {
        return new ApiException(HttpStatus.UNAUTHORIZED, message);
    }

    public static ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, message);
    }
}
