package com.example.margemAI.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssistantChatRequest {

    @NotEmpty(message = "Envie ao menos uma mensagem.")
    @Size(max = 40, message = "A conversa pode ter no máximo 40 mensagens.")
    private List<@Valid AssistantMessageRequest> messages;

    @Pattern(regexp = "[a-z-]{1,40}", message = "Tela inválida.")
    private String screen;
}
