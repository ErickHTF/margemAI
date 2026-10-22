package com.example.margemAI.dto.response;

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
public class MeiOfficialLinkResponse {

    private String id;
    private String label;
    private String description;
    private String url;
    private boolean verified;
}
