# AGENTS.md — Margem.AI

The only instructions file for AI coding agents in this repository (`CLAUDE.md` just imports it).

Margem.AI is a pricing, cost and cash-flow tool for Brazilian MEIs (micro-entrepreneurs), based on SEBRAE guidance:
a Spring Boot REST API (`backend/`) and a React SPA (`frontend/`). All calculations are deterministic business rules;
the optional **Assistente IA** (Claude) only explains them — see *AI assistant* below.

**Language.** This file is in English; the product is Brazilian. UI text, error messages, commits, cards, PRs and test
names (`@DisplayName`, Vitest descriptions) are in **Brazilian Portuguese**.

**Precedence.** The card wins over this file. Record any deviation in the PR.

---

## Commands

```bash
scripts/setup.sh            # once per clone: enables git hooks, installs frontend deps
scripts/check.sh            # what CI runs: backend tests, lint, Vitest, build — prints the counts for the PR
scripts/check.sh frontend   # or: backend
```

Run `scripts/check.sh` before every commit. Never claim something passed without running it; if it fails, report the
real output.

**CI gates merges.** `develop`, `PPS` and `main` accept a PR only when the `CI OK` check passes (commit lint, backend on H2
and on PostgreSQL, frontend lint/tests/build) **and** the branch is up to date with its base: after another PR merges,
update yours (`git merge origin/develop`) and let CI run again. *Prévia de integração* merges every open PR into
its base (`develop`, `PPS`) and runs `scripts/check.sh`; its summary shows which PRs conflict or break together — fix those before
merging. Releases reuse `ci.yml` and publish only the artifacts CI tested.

---

## Workflow: card → branch → commits → PR

Every change starts from a card on the [PPS-margemAI board (GitHub Project #1)](https://github.com/users/Camocardi/projects/1).
Always use `scripts/card`; prefix with `DRY_RUN=1` to preview.

| Step | Command | Result |
|---|---|---|
| Create card | `scripts/card new US "Reaproveitar venda registrada" --layer frontend --priority should --domain sales` | Next free ID (`[US-36] — …`), body template, labels, column *Backlog* |
| Start card | `scripts/card start 91` | Branch `feature/us-35-reaproveitar-…` from fresh `origin/develop`, assignee, column *In Progress* |
| Commit | `git commit -m "feat(vendas): reaproveitar venda registrada"` | Hook validates the format and inserts `[US-35]` from the branch |
| Existing branch | `scripts/card link 95` | Associates the current branch with the card, column *In Progress* |
| Adopt a branch | `scripts/card link 95` | Links the current branch to an existing card, column *In Progress* |
| Open PR | `scripts/card pr --body-file <arquivo.md>` | Lints commits, pushes, PR to `develop` titled like the main commit, `Closes #N`, column *In Review* |

**Cards.** Types `US` (value for the MEI), `TECH` (refactor/tests/tooling), `BUG`, `INFRA`, `DOCS`. Title
`[<TYPE>-<NN>] — <título no infinitivo>`. Body: Contexto, Critérios de aceite (verifiable), Fora do escopo, Dependências.
Read the card and the issues it links before coding.

**Branches.** `<prefix>/<type>-<nn>-<slug>` from an up-to-date `develop` (`main` never receives card PRs). Prefixes:
`feature` (US), `fix` (BUG), `test`, `refactor`, `chore` (TECH/INFRA), `docs`. Branching from another feature branch:
`scripts/card start <n> --base <branch>`, and say so in the PR.

**Commits.** `<type>(<scope>): [<CARD>] <descrição>` — lowercase, no final period, header ≤ 100 chars, one topic each.
- Types: `feat` `fix` `refactor` `perf` `test` `style` `docs` `chore` `ci` `build` `revert`
  (the first six require a scope).
- Scopes: `auth` `perfil` `produtos` `categorias` `custos` `vendas` `contas` `dashboard` (fluxo de caixa) `pricing`
  (markup) `taxas` `alerts` `sebrae` `tours` `ui` `layout` `menu` `precision` `security` `api` `db` `infra` `devops`
  `ci` `deps` `docs` `agentes` `assistente`.
- Card ID: `[US-12]`, `[TECH-08]`, `[US-32 a US-35]`.
- Source of truth: `scripts/lib/conventions.sh` (change it and this list together). Stage files by path, never `git add -A`.

**Pull requests.** Target `develop`. Body:

```markdown
## 📌 Contexto
Implementa a **[US-xx] (Issue #N) — <título>**, <objetivo para o MEI>.

## 🛠️ Alterações
### Backend
- ...
### Frontend
- ...

## 🧪 Validação
<resumo final de scripts/check.sh>

## ⚠️ Pendências e o que não foi verificado
<ex.: não testado no navegador; divergências deste guia; "Nenhuma">
```

---

## Shared business rules

**Payment fees come from the configured matrix** (Configurações › Taxas de Pagamento,
`GET /settings/financial/payment-methods`): active configuration → otherwise the recommended default; fee = percentage
(MDR) + fixed charge; a one-off fee on a sale replaces the percentage and skips the fixed charge; Crédito Parcelado has at least 2 installments (fewer counts as 2x); amounts
round HALF_UP at each step, exactly (frontend uses `utils/decimal.js`, never float math). The rule exists in
`PaymentFeeCalculator` (backend) and `utils/paymentFees.js` (frontend); both run the same cases in
`shared/fixtures/payment-fees.json` (decimals as strings; `customFeePercent: null` = none, `"0.00"` = zero fee).
To change the rule: **edit the fixture first, then both implementations**; never delete a case to make a side pass.

**"Personalizado" vs. "Recomendado".** A value is "Personalizado" only if it differs from the recommended default,
compared value by value (not by whether a record exists). The backend returns `default*` values with the configuration.

**Configurable values are never hard-coded** (fees, margins, deadlines, MEI cap). `constants/` holds labels and fixed
lists only. Screens that compute a price or net amount offer the configured fee; one-off values say they **are not
saved** and link to the settings screen (see `SalesForm.jsx`).

---

## Frontend (`frontend/src`, React 19 + Vite + Tailwind v4)

| Folder | Contents |
|---|---|
| `components/ui/` | **The UI kit.** Every button, field, card, badge, notice, empty state and segmented control comes from here. |
| `components/` | Screens (PascalCase) and app-level components (`PageHeader`, `TipButton`, `ConfirmDialog`, `SectionTour`). |
| `hooks/` | Per-screen data hooks built on `useApiResource`; `useDraft` for unsaved changes. |
| `services/` | One axios client per resource (singular names: `saleService.js`), on `api.js` (`VITE_API_URL`). Tested in `endpoints.test.js`. |
| `utils/` | Pure business rules and formatters. **New rules go here, with tests.** |
| `constants/`, `data/` | Fixed labels; SEBRAE tips (`sebraePills.js`) and tours (`menuTours.js`). |

### UI kit — no hand-written look

Import from `components/ui` (`import { Button, Card, Field, Input } from './ui'`). Screens write layout classes only
(`grid`, `flex`, `gap-*`, `space-y-*`, widths). Never write color/border/radius/shadow strings for controls or
surfaces in a screen; if the kit lacks a variant, add it to the kit.

| Primitive | Props (besides native ones and `className` for layout) |
|---|---|
| `Button` | `variant` primary·secondary·soft·danger·ghost·link, `size` sm·md, `Icon`, `TrailingIcon`, `loading`, `fullWidth` (`type` defaults to `"button"`) |
| `IconButton` | `label` (required → `aria-label`), `Icon`, `tone` slate·indigo·emerald·amber·rose, `size` sm·md·lg |
| `Card` | `as`, `tone` white·muted·indigo·emerald·sky·amber·rose, `padding` none·xs·sm·md·lg, `inset` (nested panel) |
| `Field` | `label`, `hint`, `error`, `size`, `htmlFor` (only for compound children) — wires `id`, `aria-invalid`, `aria-describedby` |
| `Input` · `Select` · `Textarea` | `size` sm·md, `Icon` (leading), `prefix`/`suffix` (`"R$"`, `"%"`), `TrailingIcon`, `action` |
| `Checkbox` | native checkbox props |
| `Badge` | `tone`, `Icon` |
| `Notice` | `tone`, `size`, `title`, `Icon`, `role` (`alert` for rose, `status` otherwise) |
| `EmptyState` | `Icon`, `title`, `description`, `action`, `tone` slate·rose, `loading` |
| `SegmentedControl` | `options` `[{ value, label, Icon }]`, `value`, `onChange`, `size`, `label` |

```jsx
<Field label="Preço de venda" error={errors.price}>
  <Input prefix="R$" type="number" inputMode="decimal" value={price} onChange={onPriceChange} />
</Field>
<Button Icon={Plus} onClick={addItem}>Novo item</Button>
```

Bespoke visuals (sidebar, payment-method tiles, sliders, dialog surfaces) may keep their own classes; anything reused
twice belongs in the kit.

Colors: success `emerald`, info `sky`, warning `amber`, error/destructive `rose`, primary `indigo`.

### Mobile-first (mandatory for every design)

Most MEIs use the app on a phone. Design for ~360px first, then enhance:

- Base classes target the phone; add `sm:`/`md:`/`lg:` only to *enhance* larger screens (never `max-*:` to fix desktop
  layouts after the fact). Grids start at one column (`grid gap-4 sm:grid-cols-2 lg:grid-cols-3`).
- No horizontal page scroll at 360px. Wide tables become stacked cards on small screens, or scroll inside their own
  container (`overflow-x-auto`) when columns must stay aligned.
- Touch targets ≥ 44px tall for primary actions; form actions stack full-width on phones (`w-full sm:w-auto`).
- Inputs use the right `type`/`inputMode` (`decimal` for money, `numeric` for counts) so phones show the right keyboard.
- Nothing essential depends on hover; popovers, tours and dialogs fit the phone viewport.
- Check every screen at 360px wide before calling it done, and state in the PR if you couldn't.

### Screens

- **Header:** every screen uses `PageHeader` (`Icon` = same icon as the menu, `title`, one-sentence `description`,
  optional `tip={<TipButton pill={pill} />}`, actions as children). No custom headers.
- **Width:** set once in `App` (`max-w-6xl`). Screen root is `<div className="w-full space-y-6">`, no `max-w-*`.
  Tabs/segments are left-aligned at natural width.
- **Menu:** data-driven `NAV_GROUPS` in `App.jsx` — Conta (perfil), Cadastros (entidades do dia a dia), Financeiro
  (operação e análise), Configurações (parâmetros reutilizados). Navigate with `onNavigate('<key>')`.
- **Tips:** SEBRAE pills only through `TipButton` in the header, never as cards mid-screen.
- **Tours:** each menu key has steps in `MENU_TOURS`; each step `target` matches a `data-tour="…"` element. Short,
  objective Portuguese.
- **Unsaved changes:** forms with "Salvar" use `useDraft(value, baseline)` → `{ dirty, changes, markSaved, guard }`.
  `App` blocks navigation/logout/reload while dirty with `ConfirmDialog` ("Sair sem salvar?"). Show
  "N alterações não salvas", mark changed items "Não salvo", disable "Salvar" when clean, call `markSaved` after saving.
- **Confirmation:** `ConfirmDialog` only (never `window.confirm`), initial focus on the safe option, button text states
  the effect ("Usar outra taxa só nesta venda").
- **Long lists:** collapse repetitive options into an expandable summary row; show expanded when filtered to that group.
- **Accessibility:** `aria-expanded`/`aria-controls` on expandables, `role="dialog"`/`alertdialog` + `aria-modal`,
  `IconButton` always has `label`, nothing interactive inside `<h1>`, motion respects `prefers-reduced-motion`.

### Data hooks

```js
const { data: flowData, loading, error } = useApiResource(
  () => dashboardService.getMonthlyFlow({ months }), [months],
  { errorMessage: 'Erro ao carregar o histórico do fluxo de caixa.' }
)
```

`useApiResource(fetcher, deps, { initialData, errorMessage })` → `{ data, loading, error, reload, setData }` handles
stale responses and maps errors with `getApiErrorMessage` (`services/apiError.js`). Don't hand-roll
`useEffect` + `cancelled` + `loading` again.

### Adding a screen

1. Component in `components/` using `PageHeader` and the UI kit.
2. Item in `NAV_GROUPS` + `case` in `renderSection` (same icon in both places).
3. Tour steps in `data/menuTours.js` with matching `data-tour` attributes; SEBRAE pill in `data/sebraePills.js` if any.
4. Service methods + rows in `services/endpoints.test.js`; hook on `useApiResource`; rules in `utils/` with tests.

`src/app.consistency.test.js` fails if a menu item lacks a `case`, a tour or `PageHeader`, if a tour target has no
`data-tour` element, or if `window.confirm` appears.

---

## Backend (`backend/`, Java 21 + Spring Boot 3.4)

- **Layers** (`com.example.margemAI`): `controller` (REST only) → `service` (rules, calculations) → `repository`
  (Spring Data). `dto/request` (Bean Validation) and `dto/response`; `model` (JPA entities, **singular** names; tables
  plural snake_case); `exception` (+ `GlobalExceptionHandler`); `event`; `config`; `security`; `util`.
- **Money:** always `BigDecimal`, never `double`/`float`. Use `util.Money`: `Money.round(x)` (scale 2, HALF_UP),
  `Money.percentOf(amount, percent)`, `Money.percentageOf(part, whole)`, `Money.ZERO`. Compare with `compareTo`.
  Use another scale/rounding only on purpose (e.g. markup at scale 4) and keep it local.
- **Entities:** UUID ids, `createdAt`/`updatedAt`, every query scoped to the authenticated user.
- **Validation and errors:** `@Valid @RequestBody`; constraints in request DTOs; duplicates throw
  `DuplicateResourceException` → 409; validation → 400 with `ErrorResponse`; missing → `ResourceNotFoundException` → 404.
- **Contract:** update `src/main/resources/openapi.yaml` with every DTO/endpoint change.
- **Tests:** services with JUnit 5 + Mockito (`@ExtendWith(MockitoExtension.class)`), controllers with MockMvc,
  `@DisplayName` in Portuguese, H2 in tests (avoid vendor-specific SQL). CI also runs the suite on PostgreSQL, the
  production database.

**Adding an endpoint:** request/response DTOs → service + test → controller + MockMvc test → `openapi.yaml` →
frontend service method + row in `endpoints.test.js`.

---

## AI assistant — Margô (`service/assistant`; screens `AssistantChat`, `AssistantBubble`, `MargoChat`)

- **Numbers come from tools, never from the model.** Each tool in `AssistantTools` calls an existing service with the
  authenticated `userId`, validates the model's arguments with Bean Validation and returns JSON. The assistant is
  read-only: never add a tool that creates, updates or deletes records.
- New tool: definition + `case` + Portuguese label in `LABELS` + test in `AssistantToolsTest`, and a renderer in
  `AssistantCards.jsx` keyed by the tool name (the card shows the tool's raw result; never let the model write numbers
  into a card). Mention it in the system prompt only if the analysis method changes.
- Projection (`BusinessProjectionService`) and diagnosis (`BusinessDiagnosisService`) are deterministic and tested;
  "good/bad" always compares with platform references (minimum price, recommended fee, MEI cap, configured risk).
- One conversation per session lives in `AssistantProvider` (shared by the tab and the floating bubble); the bubble
  sends the current menu key as `screen` for context.
- Claude is reached only through `ClaudeGateway` (official SDK `com.anthropic:anthropic-java`); tests mock it — never
  call the real API in tests.
- Config: `ANTHROPIC_API_KEY` (no key → assistant disabled, 503), `MARGEMAI_AI_MODEL` (default `claude-sonnet-5-5`, with server-side refusal fallback),
  `MARGEMAI_AI_DAILY_MESSAGE_LIMIT`. Locally in `.env` (git-ignored; template `.env.example`), in production in AWS SSM
  `/margemai/prod/*`. Never commit a key.

---

## Tests that earn their place

A test exists to fail when the behavior it names breaks. Name the bug it would catch before writing it.

- **Distinguishable data:** different values for fields that could be swapped; prices other than 100; a mock never
  returns the value the test then asserts.
- **Observable effects:** returned values, persisted entities, HTTP status/body, rendered text. Verify interactions only
  at boundaries (HTTP verb/URL/payload, published events).
- **Table-driven variations** (`it.each`, `@ParameterizedTest`) instead of copy-pasted cases.
- **Bug fix → regression test** that fails before the fix.
- **Don't write:** snapshots, CSS-class assertions, "is defined"/"renders without crashing", getters/setters,
  framework behavior, a second test for a covered scenario.
- Removing a test is fine when it asserts nothing or duplicates another; name the covering test in the PR.

---

## Boundaries

- ✅ **Always:** `scripts/check.sh` before committing; `openapi.yaml` with contract changes; tests per the policy above.
- ⚠️ **Ask first:** new dependency; non-additive schema change; CI/deploy workflow change; changing a shared
  calculation (fees, markup, MEI cap); deleting more than a handful of tests.
- 🚫 **Never:** commit `backend/src/main/resources/application-local.properties` or secrets; hard-code configurable
  business values; PR a card into `main`; `--no-verify`; report validation you didn't run; add new `.md` docs —
  agent-facing rules go in this file.

## Gotchas

- `develop` often lags open feature PRs (stacked work): check `gh pr list` before assuming something is missing.
- Sales and expenses do **not** post into Contas Empresariais automatically; account movements are separate records.
- Code is comment-free by convention: no comments restating *what* the code does; a short *why* is fine.
