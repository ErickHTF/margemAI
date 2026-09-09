package com.example.margemAI.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileResponse {
    private UUID id;
    private String name;
    private String email;
    private String cnpj;
    private String segment;
    private BigDecimal customAnnualCap;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
