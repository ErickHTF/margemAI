package com.example.margemAI.controller;

import com.example.margemAI.dto.request.PricingRequest;
import com.example.margemAI.dto.request.SimulateDiscountRequest;
import com.example.margemAI.dto.response.PricingResponse;
import com.example.margemAI.dto.response.SimulateDiscountResponse;
import com.example.margemAI.exception.InvalidFinancialCalculationException;
import com.example.margemAI.service.PricingService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class PricingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PricingService pricingService;

    @Test
    @WithMockUser
    void shouldCalculatePricingSuccessfullyAndReturn200() throws Exception {
        PricingRequest request = PricingRequest.builder()
                .productId(UUID.randomUUID())
                .baseCost(new BigDecimal("18.50"))
                .fixedCostPercent(new BigDecimal("10.00"))
                .variableCostPercent(new BigDecimal("15.00"))
                .desiredMargin(new BigDecimal("25.00"))
                .includeFixedCosts(true)
                .build();

        PricingResponse response = PricingResponse.builder()
                .baseCost(new BigDecimal("18.50"))
                .minimumSellingPrice(new BigDecimal("37.00"))
                .markup(new BigDecimal("2.00"))
                .unitProfit(new BigDecimal("9.25"))
                .grossMargin(new BigDecimal("50.00"))
                .contributionMargin(new BigDecimal("12.95"))
                .build();

        when(pricingService.calculatePricing(any(PricingRequest.class))).thenReturn(response);

        mockMvc.perform(post("/v1/pricing/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.baseCost").value(18.50))
                .andExpect(jsonPath("$.minimumSellingPrice").value(37.00))
                .andExpect(jsonPath("$.markup").value(2.00))
                .andExpect(jsonPath("$.unitProfit").value(9.25));
    }

    @Test
    @WithMockUser
    void shouldReturn422WhenCalculationPercentagesAreInvalid() throws Exception {
        PricingRequest request = PricingRequest.builder()
                .baseCost(new BigDecimal("50.00"))
                .fixedCostPercent(new BigDecimal("50.00"))
                .variableCostPercent(new BigDecimal("30.00"))
                .desiredMargin(new BigDecimal("30.00"))
                .build();

        when(pricingService.calculatePricing(any(PricingRequest.class)))
                .thenThrow(new InvalidFinancialCalculationException("Soma dos percentuais excede 100%"));

        mockMvc.perform(post("/v1/pricing/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("INVALID_FINANCIAL_CALCULATION"));
    }

    @Test
    @WithMockUser
    void shouldSimulateDiscountSuccessfullyAndReturn200() throws Exception {
        SimulateDiscountRequest request = SimulateDiscountRequest.builder()
                .sellingPrice(new BigDecimal("100.00"))
                .discountPercentage(new BigDecimal("10.00"))
                .baseCost(new BigDecimal("40.00"))
                .build();

        SimulateDiscountResponse response = SimulateDiscountResponse.builder()
                .originalPrice(new BigDecimal("100.00"))
                .discount(new BigDecimal("10.00"))
                .discountedPrice(new BigDecimal("90.00"))
                .viable(true)
                .recommendation("Operação recomendada")
                .build();

        when(pricingService.simulateDiscount(any(SimulateDiscountRequest.class))).thenReturn(response);

        mockMvc.perform(post("/v1/pricing/simulate-discount")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.originalPrice").value(100.00))
                .andExpect(jsonPath("$.discount").value(10.00))
                .andExpect(jsonPath("$.discountedPrice").value(90.00))
                .andExpect(jsonPath("$.viable").value(true));
    }

    @Test
    void shouldReturn401WhenRequestIsUnauthenticated() throws Exception {
        PricingRequest request = PricingRequest.builder()
                .baseCost(new BigDecimal("18.50"))
                .desiredMargin(new BigDecimal("25.00"))
                .build();

        mockMvc.perform(post("/v1/pricing/calculate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }
}
