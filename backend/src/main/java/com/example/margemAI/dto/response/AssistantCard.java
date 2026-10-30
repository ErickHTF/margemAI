package com.example.margemAI.dto.response;

// Cartão visual montado pelo sistema a partir do resultado de uma ferramenta: os números vêm do cálculo, nunca do modelo.
public record AssistantCard(String type, String title, Object data) {
}
