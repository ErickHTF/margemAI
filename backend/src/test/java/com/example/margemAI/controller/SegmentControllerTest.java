package com.example.margemAI.controller;

import com.example.margemAI.dto.response.SegmentResponse;
import com.example.margemAI.service.SegmentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class SegmentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SegmentService segmentService;

    @Test
    void shouldReturnAllActiveSegments() throws Exception {
        SegmentResponse seg1 = SegmentResponse.builder()
                .id(UUID.randomUUID())
                .code("COMERCIO")
                .name("Comércio")
                .description("Venda de mercadorias")
                .build();

        SegmentResponse seg2 = SegmentResponse.builder()
                .id(UUID.randomUUID())
                .code("SERVICOS")
                .name("Serviços")
                .description("Prestação de serviços")
                .build();

        when(segmentService.findAllActive()).thenReturn(List.of(seg1, seg2));

        mockMvc.perform(get("/v1/segments").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].code").value("COMERCIO"))
                .andExpect(jsonPath("$[0].name").value("Comércio"))
                .andExpect(jsonPath("$[1].code").value("SERVICOS"))
                .andExpect(jsonPath("$[1].name").value("Serviços"));
    }
}
