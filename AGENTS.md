# Guia para agentes — Margem.AI

Leia este arquivo inteiro antes de implementar qualquer card do quadro
[Margem.AI (GitHub Project #2)](https://github.com/users/ErickHTF/projects/2).
Ele descreve o fluxo de trabalho e os padrões de UI/código que o projeto já segue.
Em caso de conflito entre o card e este guia, siga o card e registre a divergência no PR.

---

## 1. Fluxo de um card

1. **Leia o card e a issue vinculada** (critérios de aceite, IDs `US-xx`, `TECH-xx`, `INFRA-xx`).
2. **Branch** a partir da `main` atualizada:
   - `feature/us-12-historico-fluxo-caixa` (história de usuário)
   - `test/tech-01-financial-precision-tests` (técnico)
   - `fix/<id>-<descricao-curta>` (correção)
3. **Implemente em commits pequenos e separados por assunto** (um commit = uma mudança revisável).
   Conventional Commits em português, com o ID do card quando houver:
   - `feat(dashboard): [US-12] histórico e evolução mensal do fluxo de caixa`
   - `fix(taxas): status Personalizado calculado por taxa comparando com o padrão recomendado`
   - Tipos usados: `feat`, `fix`, `refactor`, `style`, `chore`, `test`, `docs`.
   - Escopos usados: `menu`, `vendas`, `taxas`, `markup`, `pricing`, `dashboard`, `ui`, `layout`, `alerts`, `sebrae`, `devops`, `infra`, `precision`.
4. **Valide antes de cada commit** (mesmos passos do CI em `.github/workflows/ci.yml`):
   ```bash
   cd backend  && ./mvnw test
   cd frontend && npx eslint src && npx vitest run && npx vite build
   ```
   Nunca diga que algo passou sem ter rodado. Se algo falhar, reporte a saída real.
5. **Pull Request** com o título igual ao commit principal e corpo neste formato:
   ```markdown
   ## 📌 Contexto
   Implementa a **[US-xx] (Issue #N) - <título>**, <objetivo para o MEI>.

   ## 🛠️ Alterações Realizadas
   ### Backend (Spring Boot 3.4.2)
   - ...
   ### Frontend (React + Vite)
   - ...

   ## 🧪 Validação
   - **Backend**: N testes executados e aprovados.
   - **Frontend**: N testes Vitest executados e aprovados.
   - **Lint & Build**: eslint e vite build verdes.

   Closes #N
   ```
6. **Não commite** `backend/src/main/resources/application-local.properties` (configuração local de cada dev).

---

## 2. Stack e organização

| Camada | Stack | Onde |
|---|---|---|
| Backend | Java 21, Spring Boot 3.4.2, JPA, PostgreSQL (H2 nos testes) | `backend/src/main/java/com/example/margemAI/{controller,service,repository,model,dto}` |
| Contrato | OpenAPI | `backend/src/main/resources/openapi.yaml` — **atualize sempre que mudar um DTO/endpoint** |
| Frontend | React 19, Vite, Tailwind CSS v4, lucide-react, Vitest | `frontend/src` |

Frontend:
- `services/` — clientes HTTP (axios em `api.js`), um por recurso, com teste `*.test.js`.
- `hooks/` — carregamento de dados por tela (`useSales`, `useMonthlyFlow`, `usePaymentFees`). Padrão: `cancelled` no `useEffect`, estados `loading`/`error`, mensagem de erro de `err.response?.data?.message` com fallback em português.
- `utils/` — regras puras e testáveis (`sebraeMethod`, `paymentFees`, `monthlyFlow`). Regra de negócio nova vai aqui, com teste.
- `constants/` — rótulos e listas fixas (não valores de negócio configuráveis pelo usuário).
- `components/` — telas e componentes compartilhados.

Backend:
- Valores monetários e percentuais sempre em `BigDecimal`, `setScale(2, RoundingMode.HALF_UP)`; compare com `compareTo`, nunca `equals`.
- Testes de serviço com Mockito (`@ExtendWith(MockitoExtension.class)`), de controller com MockMvc; `@DisplayName` em português.

---

## 3. Regras de negócio que viraram padrão

### 3.1 Taxas de pagamento vêm sempre da matriz configurada
A fonte única é **Configurações › Taxas de Pagamento** (`GET /settings/financial/payment-methods`).
- Frontend: use o hook `usePaymentFees()` (`getFee(metodo, parcelas)`) e as funções de `utils/paymentFees.js`
  (`resolvePaymentFee`, `calculateSaleFee`, `formatFeePercent`). **Nunca** escreva percentuais de taxa fixos em telas.
- A regra espelha o `PaymentFeeCalculator` do backend: configuração ativa → senão padrão recomendado;
  taxa = percentual (MDR) + tarifa fixa; taxa avulsa informada na venda substitui o percentual e não aplica tarifa fixa.
- Se mudar a regra de cálculo, mude **backend e `utils/paymentFees.js` juntos**, com testes nos dois.
- Toda tela que calcula preço ou valor líquido deve oferecer a taxa configurada (ex.: Calculadora Markup tem
  "Incluir taxa de pagamento configurada", somada às despesas variáveis e com aviso para não contar a taxa duas vezes).
- Quando uma tela permitir um valor avulso (só para aquela operação), deixe explícito que **não persiste** e
  ofereça atalho para a tela de configuração (ver aviso em `SalesForm.jsx`).

### 3.2 "Personalizado" x "Recomendado"
Um valor configurável só é "Personalizado" se **divergir do padrão recomendado**, comparando valor a valor
(não pela existência de registro salvo). O backend devolve os padrões (`default*`) junto da configuração para o
frontend comparar em tempo real e para "Restaurar Padrões" sem duplicar valores.

### 3.3 Alterações não salvas
Telas de edição com botão "Salvar" devem:
- rastrear o que mudou em relação ao último estado salvo (contador "N alterações não salvas" e marca "Não salvo" no item);
- desabilitar "Salvar" quando não houver alterações;
- informar o `App` via prop `onDirtyChange` — o `App` intercepta navegação e logout e abre o `ConfirmDialog`
  ("Sair sem salvar?", foco em "Continuar editando");
- registrar `beforeunload` enquanto houver alterações.
Referência: `PaymentMethodSettings.jsx`.

---

## 4. Padrões de UI/UX

Idioma da interface: **português do Brasil** (textos, mensagens de erro, rótulos). Evite jargão em inglês na UI.

### 4.1 Menu (`App.jsx` → `NAV_GROUPS`)
O menu é dirigido por dados. Para adicionar uma tela, inclua o item no grupo certo e o `case` em `renderSection`:
- **Conta** — perfil do usuário.
- **Cadastros** — entidades do dia a dia (Catálogo).
- **Financeiro** — operação e análise (Vendas, Fluxo de Caixa, Custos, Calculadora Markup).
- **Configurações** — regras e parâmetros definidos uma vez e reutilizados (Padrões de Preço, Taxas de Pagamento).
O ícone do item no menu é o mesmo do cabeçalho da tela. Navegação entre telas a partir de um componente: receba
`onNavigate` e chame `onNavigate('<key>')` (passa pela proteção de alterações não salvas).
O menu lateral é fixo (`sticky`, altura da tela) e a página reserva o espaço da barra de rolagem (`scrollbar-gutter: stable`).

### 4.2 Cabeçalho de tela
Toda tela usa `PageHeader`:
```jsx
<PageHeader
  Icon={ShoppingBag}                 // mesmo ícone do menu
  title="Registro de Vendas"         // nome do módulo
  description="Uma frase dizendo o que o usuário faz aqui."
  tip={<TipButton pill={pill} />}    // opcional
>
  {/* ações à direita (botões), opcional */}
</PageHeader>
```
Não crie cabeçalhos próprios (centralizados, com ícone em círculo etc.).

### 4.3 Largura e espaçamento
- A largura máxima é definida uma vez no `App` (`max-w-6xl`). **Telas não definem `max-w-*` no contêiner raiz**;
  use `<div className="w-full space-y-6">`.
- Abas/segmentos ficam alinhados à esquerda com largura natural (não esticados).

### 4.4 Dicas educativas (pílulas SEBRAE)
Não coloque cartões de dica no meio da tela. Use `TipButton` no `tip` do `PageHeader`: um "?" discreto que abre a
pílula em popover (fecha com clique fora/Esc) e balança ao entrar na tela e quando a dica contextual muda.
A animação respeita `prefers-reduced-motion`. Conteúdo das pílulas: `data/sebraePills.js`.

### 4.5 Listas longas
Agrupe opções repetitivas em linha expansível em vez de exibir tudo (ex.: parcelamentos acima de 3x em
Taxas de Pagamento mostram um resumo "Crédito Parcelado de 4x a 12x · 9 opções · faixa de taxas · N personalizadas").
Se o usuário filtrou explicitamente por aquele grupo, mostre tudo aberto.

### 4.6 Feedback e confirmação
- Cores: sucesso `emerald`, informação `sky`, atenção/aviso `amber`, erro/destrutivo `rose`, ação primária `indigo`.
- Aviso que não é erro (ex.: "vale só para esta venda") usa `amber` com ícone `Info`.
- Confirmações usam `ConfirmDialog` (nunca `window.confirm`); foco inicial na opção segura.
- Textos de botão dizem o efeito real ("Usar outra taxa só nesta venda", "Voltar para a taxa configurada").

### 4.7 Acessibilidade
`aria-expanded`/`aria-controls` em expansíveis, `role="dialog"`/`alertdialog` com `aria-modal` em diálogos,
`aria-label` em botões só com ícone, nada interativo dentro de `<h1>`.

---

## 5. Antes de abrir o PR — checklist

- [ ] Critérios de aceite do card atendidos.
- [ ] Commits separados por assunto, no padrão acima.
- [ ] `./mvnw test`, `eslint`, `vitest` e `vite build` rodados e verdes (com números no PR).
- [ ] `openapi.yaml` atualizado se algum contrato mudou.
- [ ] Nenhum valor de negócio configurável escrito fixo na UI (taxas, margens, prazos).
- [ ] Telas novas usam `PageHeader`, sem `max-w-*` próprio, ícone igual ao do menu.
- [ ] Textos em português, sem jargão em inglês.
- [ ] Falhas, pendências e o que não foi verificado (ex.: não testado no navegador) estão descritos no PR.
