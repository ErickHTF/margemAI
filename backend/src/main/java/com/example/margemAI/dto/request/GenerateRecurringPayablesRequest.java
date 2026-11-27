package com.example.margemAI.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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
public class GenerateRecurringPayablesRequest {

    @NotBlank(message = "A competência é obrigatória no formato AAAA-MM.")
    @Pattern(regexp = "^\\d{4}-(0[1-9]|1[0-2])$", message = "A competência deve estar no formato AAAA-MM.")
    private String competency;

    @Min(value = 1, message = "O dia de vencimento deve ser entre 1 e 31.")
    @Max(value = 31, message = "O dia de vencimento deve ser entre 1 e 31.")
    private Integer defaultDueDay;

    @Min(value = 1, message = "O dia de vencimento deve ser entre 1 e 31.")
    @Max(value = 31, message = "O dia de vencimento deve ser entre 1 e 31.")
    private Integer dueDay;

    public Integer getEffectiveDueDay() {
        return defaultDueDay != null ? defaultDueDay : dueDay;
    }
}
