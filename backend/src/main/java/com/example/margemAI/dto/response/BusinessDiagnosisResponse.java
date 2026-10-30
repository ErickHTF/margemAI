package com.example.margemAI.dto.response;

import java.util.List;

public record BusinessDiagnosisResponse(int score, String level, List<Indicator> indicators) {

    public enum Status { OK, ATENCAO, CRITICO, SEM_DADOS }

    public record Indicator(String key, String label, Status status, String value, String reference, String detail,
                            List<String> items) {
    }
}
