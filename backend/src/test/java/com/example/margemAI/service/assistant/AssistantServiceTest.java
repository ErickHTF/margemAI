package com.example.margemAI.service.assistant;

import com.anthropic.core.JsonValue;
import com.anthropic.core.ObjectMappers;
import com.anthropic.errors.AnthropicException;
import com.anthropic.models.messages.ContentBlockParam;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.MessageParam;
import com.example.margemAI.config.AssistantProperties;
import com.example.margemAI.dto.request.AssistantChatRequest;
import com.example.margemAI.dto.request.AssistantMessageRequest;
import com.example.margemAI.dto.response.AssistantReplyResponse;
import com.example.margemAI.exception.AssistantUnavailableException;
import com.example.margemAI.exception.InvalidRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AssistantServiceTest {

    @Mock
    private ClaudeGateway gateway;

    @Mock
    private AssistantTools tools;

    private AssistantProperties properties;
    private AssistantUsageLimiter limiter;
    private AssistantService service;
    private UUID userId;

    @BeforeEach
    void setUp() {
        properties = new AssistantProperties("chave-de-teste", "claude-haiku-5-5", 8000, 3, 20, 30);
        limiter = new AssistantUsageLimiter(properties, java.time.Clock.systemUTC());
        service = new AssistantService(gateway, tools, limiter, properties);
        userId = UUID.randomUUID();
    }

    private static Message message(String json) {
        try {
            return ObjectMappers.jsonMapper().readValue(json, Message.class);
        } catch (Exception ex) {
            throw new IllegalStateException(ex);
        }
    }

    private static Message toolUse(String toolId, String name, String inputJson, long in, long out) {
        return message("""
                {"id":"msg_tool","type":"message","role":"assistant","model":"claude-haiku-5-5",
                 "content":[{"type":"tool_use","id":"%s","name":"%s","input":%s}],
                 "stop_reason":"tool_use","stop_sequence":null,
                 "usage":{"input_tokens":%d,"output_tokens":%d}}""".formatted(toolId, name, inputJson, in, out));
    }

    private static Message text(String text, String stopReason, long in, long out) {
        return message("""
                {"id":"msg_text","type":"message","role":"assistant","model":"claude-haiku-5-5",
                 "content":[{"type":"text","text":"%s"}],
                 "stop_reason":"%s","stop_sequence":null,
                 "usage":{"input_tokens":%d,"output_tokens":%d}}""".formatted(text, stopReason, in, out));
    }

    private static AssistantChatRequest ask(String... turns) {
        List<AssistantMessageRequest> messages = new java.util.ArrayList<>();
        for (int i = 0; i < turns.length; i++) {
            messages.add(new AssistantMessageRequest(i % 2 == 0 ? "user" : "assistant", turns[i]));
        }
        return new AssistantChatRequest(messages, null);
    }

    @Test
    @DisplayName("Deve executar a ferramenta pedida pelo Claude com o usuário logado e devolver a resposta final")
    void shouldRunRequestedToolAndReturnFinalAnswer() {
        when(gateway.isConfigured()).thenReturn(true);
        when(gateway.send(any()))
                .thenReturn(toolUse("toolu_77", AssistantTools.CALCULATE_PRICE, "{\"baseCost\":23.4}", 1200, 85))
                .thenReturn(text("O preço mínimo é R$ 41,37.", "end_turn", 1650, 140));
        com.example.margemAI.dto.response.AssistantCard card = new com.example.margemAI.dto.response.AssistantCard(
                AssistantTools.CALCULATE_PRICE, "Calculadora Markup (SEBRAE)", java.util.Map.of("minimumSellingPrice", 41.37));
        when(tools.run(eq(AssistantTools.CALCULATE_PRICE), any(JsonValue.class), eq(userId)))
                .thenReturn(new AssistantTools.ToolResult("{\"minimumSellingPrice\":41.37}", false, card));

        AssistantReplyResponse reply = service.reply(userId, ask("Qual o preço ideal para custo de R$ 23,40?"));
        assertEquals(List.of(card), reply.getCards());

        assertEquals("O preço mínimo é R$ 41,37.", reply.getReply());
        assertEquals(List.of("Calculadora Markup (SEBRAE)"), reply.getToolsUsed());
        assertEquals(2850, reply.getInputTokens());
        assertEquals(225, reply.getOutputTokens());
        assertEquals(29, reply.getRemainingToday());

        ArgumentCaptor<MessageCreateParams> sent = ArgumentCaptor.forClass(MessageCreateParams.class);
        verify(gateway, times(2)).send(sent.capture());
        List<MessageParam> secondTurn = sent.getAllValues().get(1).messages();
        assertEquals(3, secondTurn.size());
        ContentBlockParam toolResult = secondTurn.get(2).content().asBlockParams().get(0);
        assertEquals("toolu_77", toolResult.asToolResult().toolUseId());
        assertEquals("{\"minimumSellingPrice\":41.37}", toolResult.asToolResult().content().get().asString());
    }

    @Test
    @DisplayName("Deve devolver erro da ferramenta ao Claude sem listá-la como cálculo usado")
    void shouldReportToolErrorWithoutListingIt() {
        when(gateway.isConfigured()).thenReturn(true);
        when(gateway.send(any()))
                .thenReturn(toolUse("toolu_9", AssistantTools.BREAK_EVEN, "{\"sellingPrice\":-3}", 900, 40))
                .thenReturn(text("Informe um preço de venda positivo.", "end_turn", 980, 60));
        when(tools.run(eq(AssistantTools.BREAK_EVEN), any(JsonValue.class), eq(userId)))
                .thenReturn(new AssistantTools.ToolResult("Erro: O preço de venda unitário deve ser maior que zero.", true));

        AssistantReplyResponse reply = service.reply(userId, ask("Qual meu ponto de equilíbrio?"));

        assertTrue(reply.getToolsUsed().isEmpty());
        ArgumentCaptor<MessageCreateParams> sent = ArgumentCaptor.forClass(MessageCreateParams.class);
        verify(gateway, times(2)).send(sent.capture());
        ContentBlockParam toolResult = sent.getAllValues().get(1).messages().get(2).content().asBlockParams().get(0);
        assertEquals(true, toolResult.asToolResult().isError().orElse(false));
    }

    @Test
    @DisplayName("Deve responder com mensagem padrão quando o Claude recusar o pedido")
    void shouldAnswerRefusalWithDefaultMessage() {
        when(gateway.isConfigured()).thenReturn(true);
        when(gateway.send(any())).thenReturn(text("", "refusal", 300, 2));

        AssistantReplyResponse reply = service.reply(userId, ask("Pedido fora do escopo"));

        assertEquals(AssistantService.REFUSAL_REPLY, reply.getReply());
    }

    @Test
    @DisplayName("Deve parar após o limite de rodadas de ferramentas")
    void shouldStopAfterMaxToolRounds() {
        when(gateway.isConfigured()).thenReturn(true);
        when(gateway.send(any())).thenReturn(toolUse("toolu_1", AssistantTools.MEI_CAP, "{}", 500, 20));
        when(tools.run(any(), any(), eq(userId))).thenReturn(new AssistantTools.ToolResult("{}", false));

        AssistantReplyResponse reply = service.reply(userId, ask("Analise meu teto"));

        assertEquals(AssistantService.ROUNDS_EXCEEDED_REPLY, reply.getReply());
        verify(gateway, times(3)).send(any());
    }

    @Test
    @DisplayName("Deve recusar sem consumir o limite quando a chave da IA não estiver configurada")
    void shouldFailWithoutConsumingLimitWhenNotConfigured() {
        when(gateway.isConfigured()).thenReturn(false);

        assertThrows(AssistantUnavailableException.class, () -> service.reply(userId, ask("Oi")));

        verify(gateway, never()).send(any());
        assertEquals(30, limiter.remaining(userId));
    }

    @Test
    @DisplayName("Deve converter falha da API da Anthropic em indisponibilidade do assistente")
    void shouldTranslateApiFailureIntoUnavailable() {
        when(gateway.isConfigured()).thenReturn(true);
        when(gateway.send(any())).thenThrow(mock(AnthropicException.class));

        assertThrows(AssistantUnavailableException.class, () -> service.reply(userId, ask("Como estão minhas vendas?")));
    }

    @Test
    @DisplayName("Deve exigir que a última mensagem da conversa seja do usuário")
    void shouldRequireLastMessageFromUser() {
        when(gateway.isConfigured()).thenReturn(true);

        assertThrows(InvalidRequestException.class, () -> service.reply(userId, ask("Oi", "Olá! Como posso ajudar?")));

        verify(gateway, never()).send(any());
    }

    @Test
    @DisplayName("Deve enviar ao Claude o modelo configurado e as ferramentas da plataforma")
    void shouldSendConfiguredModelAndTools() {
        when(gateway.isConfigured()).thenReturn(true);
        when(tools.definitions()).thenReturn(List.of(com.anthropic.models.messages.Tool.builder()
                .name(AssistantTools.MEI_CAP)
                .inputSchema(com.anthropic.models.messages.Tool.InputSchema.builder().build())
                .build()));
        when(gateway.send(any())).thenReturn(text("Tudo certo.", "end_turn", 100, 10));

        service.reply(userId, ask("Oi"));

        ArgumentCaptor<MessageCreateParams> sent = ArgumentCaptor.forClass(MessageCreateParams.class);
        verify(gateway).send(sent.capture());
        assertEquals("claude-haiku-5-5", sent.getValue().model().asString());
        assertEquals(AssistantTools.MEI_CAP, sent.getValue().tools().get().get(0).asTool().name());
    }

    @Test
    @DisplayName("Deve informar ao Claude em qual tela o usuário está")
    void shouldAddScreenContextToLastUserMessage() {
        when(gateway.isConfigured()).thenReturn(true);
        when(gateway.send(any())).thenReturn(text("Esse preço cobre seus custos.", "end_turn", 200, 30));

        service.reply(userId, new AssistantChatRequest(
                List.of(new AssistantMessageRequest("user", "Esse preço está bom?")), "pricing"));

        ArgumentCaptor<MessageCreateParams> sent = ArgumentCaptor.forClass(MessageCreateParams.class);
        verify(gateway).send(sent.capture());
        String content = sent.getValue().messages().get(0).content().asString();
        assertTrue(content.startsWith("Esse preço está bom?"));
        assertTrue(content.contains("«Calculadora Markup»"));
    }

    @Test
    @DisplayName("Deve pedir fallback do servidor só para modelos que o suportam")
    void shouldRequestServerFallbackOnlyForSupportedModels() {
        assertTrue(AssistantService.supportsServerFallback("claude-sonnet-5-5"));
        assertTrue(AssistantService.supportsServerFallback("claude-opus-5-5"));
        assertEquals(false, AssistantService.supportsServerFallback("claude-haiku-5-5"));

        AssistantProperties sonnet = new AssistantProperties("chave", "claude-sonnet-5-5", 8000, 3, 20, 30);
        AssistantService sonnetService = new AssistantService(gateway, tools,
                new AssistantUsageLimiter(sonnet, java.time.Clock.systemUTC()), sonnet);
        when(gateway.isConfigured()).thenReturn(true);
        when(gateway.send(any())).thenReturn(text("Ok.", "end_turn", 10, 2));

        sonnetService.reply(userId, ask("Oi"));

        ArgumentCaptor<MessageCreateParams> sent = ArgumentCaptor.forClass(MessageCreateParams.class);
        verify(gateway).send(sent.capture());
        assertEquals(JsonValue.from("default"), sent.getValue()._additionalBodyProperties().get("fallbacks"));
        assertEquals(List.of(AssistantService.FALLBACK_BETA), sent.getValue()._headers().values("anthropic-beta"));
    }

    @Test
    @DisplayName("Deve embutir a frase fixa de recusa nas instruções da Margô, sem marcador pendente")
    void shouldEmbedOutOfScopeReplyInSystemPrompt() {
        assertTrue(AssistantService.SYSTEM_PROMPT.contains("\"" + AssistantService.OUT_OF_SCOPE_REPLY + "\""));
        assertTrue(!AssistantService.SYSTEM_PROMPT.contains("{RECUSA}"));
        assertTrue(AssistantService.SYSTEM_PROMPT.startsWith("Escopo"));
    }
}
