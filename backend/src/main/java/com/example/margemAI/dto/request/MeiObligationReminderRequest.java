package com.example.margemAI.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
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
public class MeiObligationReminderRequest {

    @NotNull(message = "A antecedência do lembrete é obrigatória.")
    @Min(value = 1, message = "A antecedência mínima é de 1 dia.")
    @Max(value = 30, message = "A antecedência máxima é de 30 dias.")
    private Integer reminderDaysBefore;

    @Min(value = 2020, message = "O ano de referência deve ser no mínimo 2020.")
    @Max(value = 2100, message = "O ano de referência deve ser no máximo 2100.")
    private Integer year;
}
