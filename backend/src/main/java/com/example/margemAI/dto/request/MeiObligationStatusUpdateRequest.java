package com.example.margemAI.dto.request;

import com.example.margemAI.model.MeiObligationStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MeiObligationStatusUpdateRequest {

    @NotNull(message = "O status da obrigação é obrigatório.")
    private MeiObligationStatus status;

    @Size(max = 120, message = "A identificação do comprovante deve ter no máximo 120 caracteres.")
    private String manualReceiptCode;

    private LocalDate paidAt;

    @Size(max = 500, message = "As observações devem ter no máximo 500 caracteres.")
    private String notes;
}
