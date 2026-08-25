package com.example.margemAI.dto.request;

import com.example.margemAI.model.MeiSegment;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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
public class RegisterRequest {

    @NotBlank(message = "O nome é obrigatório.")
    @Size(min = 2, max = 150, message = "O nome deve ter entre 2 e 150 caracteres.")
    private String name;

    @NotBlank(message = "O e-mail é obrigatório.")
    @Email(message = "O e-mail informado é inválido.")
    private String email;

    @NotBlank(message = "A senha é obrigatória.")
    @Pattern(
        regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#^()_+\\-=])[A-Za-z\\d@$!%*?&#^()_+\\-=]{8,128}$",
        message = "A senha deve ter no mínimo 8 caracteres, contendo pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial."
    )
    private String password;

    @NotBlank(message = "O CNPJ é obrigatório.")
    @Pattern(
        regexp = "^(\\d{2}\\.\\d{3}\\.\\d{3}/\\d{4}-\\d{2}|\\d{14})$",
        message = "O CNPJ deve estar no formato 00.000.000/0000-00 ou conter exatamente 14 dígitos numéricos."
    )
    private String cnpj;

    @NotNull(message = "O segmento de atuação do MEI é obrigatório.")
    private MeiSegment segment;
}
