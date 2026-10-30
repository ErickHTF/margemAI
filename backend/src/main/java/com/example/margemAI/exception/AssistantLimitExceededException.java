package com.example.margemAI.exception;

public class AssistantLimitExceededException extends RuntimeException {
    public AssistantLimitExceededException(String message) {
        super(message);
    }
}
