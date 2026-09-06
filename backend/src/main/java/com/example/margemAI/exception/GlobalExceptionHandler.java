package com.example.margemAI.exception;

import com.example.margemAI.dto.response.ErrorResponse;
import com.fasterxml.jackson.databind.exc.InvalidFormatException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateResource(DuplicateResourceException ex) {
        ErrorResponse response = ErrorResponse.builder()
                .code("RESOURCE_CONFLICT")
                .message(ex.getMessage())
                .details(List.of(ex.getMessage()))
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(ResourceNotFoundException ex) {
        ErrorResponse response = ErrorResponse.builder()
                .code("RESOURCE_NOT_FOUND")
                .message(ex.getMessage())
                .details(List.of(ex.getMessage()))
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(InvalidRequestException.class)
    public ResponseEntity<ErrorResponse> handleInvalidRequest(InvalidRequestException ex) {
        ErrorResponse response = ErrorResponse.builder()
                .code("VALIDATION_ERROR")
                .message(ex.getMessage())
                .details(List.of(ex.getMessage()))
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler({InvalidCredentialsException.class, InvalidTokenException.class})
    public ResponseEntity<ErrorResponse> handleAuthenticationErrors(RuntimeException ex) {
        String code = ex instanceof InvalidCredentialsException ? "INVALID_CREDENTIALS" : "INVALID_TOKEN";
        ErrorResponse response = ErrorResponse.builder()
                .code(code)
                .message(ex.getMessage())
                .details(List.of(ex.getMessage()))
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(MethodArgumentNotValidException ex) {
        List<String> errors = new ArrayList<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.add(fieldError.getField() + ": " + fieldError.getDefaultMessage());
        }
        ErrorResponse response = ErrorResponse.builder()
                .code("VALIDATION_ERROR")
                .message("Os dados fornecidos são inválidos.")
                .details(errors)
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        Object rejectedValue = ex.getValue();
        String valueDetail = rejectedValue == null
                ? "O parâmetro '" + ex.getName() + "' é obrigatório ou está vazio."
                : "O valor '" + rejectedValue + "' não é suportado para '" + ex.getName() + "'.";
        ErrorResponse response = ErrorResponse.builder()
                .code("VALIDATION_ERROR")
                .message("Parâmetro inválido: " + ex.getName() + ".")
                .details(List.of(valueDetail))
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleMessageNotReadable(HttpMessageNotReadableException ex) {
        if (ex.getCause() instanceof InvalidFormatException invalidFormat) {
            return buildInvalidValueResponse(invalidFormat);
        }
        ErrorResponse response = ErrorResponse.builder()
                .code("MALFORMED_JSON")
                .message("O corpo da requisição é inválido ou contém valores não suportados.")
                .details(List.of(ex.getMessage()))
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    private ResponseEntity<ErrorResponse> buildInvalidValueResponse(InvalidFormatException ex) {
        String field = resolveFieldName(ex);
        String detail = isDateTarget(ex.getTargetType())
                ? "Formato de data inválido para '" + field + "'. Use AAAA-MM-DD."
                : "O valor '" + ex.getValue() + "' não é suportado para '" + field + "'.";
        ErrorResponse response = ErrorResponse.builder()
                .code("VALIDATION_ERROR")
                .message("Valor inválido em '" + field + "'.")
                .details(List.of(detail))
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    private boolean isDateTarget(Class<?> targetType) {
        return targetType != null && targetType.getName().startsWith("java.time.");
    }

    private String resolveFieldName(InvalidFormatException ex) {
        if (ex.getPath().isEmpty()) {
            return "corpo da requisição";
        }
        String fieldName = ex.getPath().get(0).getFieldName();
        if (fieldName != null) {
            return fieldName;
        }
        int index = ex.getPath().get(0).getIndex();
        return index >= 0 ? "item " + index : "corpo da requisição";
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        ErrorResponse response = ErrorResponse.builder()
                .code("INTERNAL_SERVER_ERROR")
                .message("Ocorreu um erro interno inesperado.")
                .details(List.of(ex.getMessage()))
                .timestamp(LocalDateTime.now())
                .build();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
