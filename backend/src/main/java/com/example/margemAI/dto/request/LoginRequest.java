package com.example.margemAI.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginRequest {

    @NotBlank(message = "Informe seu e-mail ou CNPJ.")
    private String identifier;

    @NotBlank(message = "A senha é obrigatória.")
    private String password;
}
