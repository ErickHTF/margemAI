package com.example.margemAI.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssistantMessageRequest {

    @NotNull(message = "O papel da mensagem é obrigatório.")
    @Pattern(regexp = "user|assistant", message = "O papel da mensagem deve ser 'user' ou 'assistant'.")
    private String role;

    @NotBlank(message = "A mensagem não pode estar vazia.")
    @Size(max = 4000, message = "A mensagem deve ter no máximo 4000 caracteres.")
    private String content;
}
