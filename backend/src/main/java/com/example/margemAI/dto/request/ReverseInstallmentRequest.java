package com.example.margemAI.dto.request;

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
public class ReverseInstallmentRequest {

    @Size(max = 300, message = "O motivo do estorno não pode ter mais de 300 caracteres.")
    private String reason;
}
