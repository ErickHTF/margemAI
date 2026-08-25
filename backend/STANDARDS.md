# 📐 Padrão Arquitetural e Diretrizes de Desenvolvimento — Backend (Margem.AI)

Este documento define os padrões arquiteturais obrigatórios para o desenvolvimento do **Backend** no ecossistema **Margem.AI** (Spring Boot 3.4 + Java 21).

---

## 1. 🏛️ Arquitetura em Camadas (MVC / Clean Architecture)

O código deve ser estritamente dividido nas seguintes camadas de responsabilidade:

```
backend/src/main/java/com/example/margemAI/
├── config/          # Configurações globais (Segurança, CORS, Beans)
├── controller/      # Endpoints REST e serialização de requisições/respostas
├── dto/
│   ├── request/     # Objetos de transferência de dados de entrada com validações
│   └── response/    # Objetos de transferência de dados de saída
├── exception/       # Exceções de domínio e Tratador Global (@RestControllerAdvice)
├── model/           # Entidades JPA de domínio (no SINGULAR) e Enums
├── repository/      # Interfaces de persistência Spring Data JPA
└── service/         # Regras de negócio, cálculos financeiros e integrações
```

---

## 2. 🔤 Convenções de Nomenclatura

* **Entidades de Domínio:** **SEMPRE NO SINGULAR**
  * ✅ `User`, `Product`, `Sale`, `FixedCost`, `VariableCost`, `Pricing`, `CashFlow`
  * ❌ `Users`, `Products`, `Sales`, `Costs`
  * **Tabelas do Banco de Dados:** Singular em minúsculo (`user`, `product`, `sale`, `fixed_cost`).
* **Identificadores (ID):** Utilizar preferencialmente `UUID` para chaves primárias.
* **Campos de Auditoria:** Toda entidade persistida deve conter `createdAt` e `updatedAt`.
* **Valores Financeiros:** **SEMPRE utilizar `BigDecimal`** para qualquer cálculo monetário, percentual ou taxa. É terminantemente proibido o uso de `double` ou `float` em operações financeiras.

---

## 3. 🚫 Regra Crítica: Código Sem Comentários

* **NÃO incluir comentários explicativos no código-fonte** (`//` ou `/* */`).
* O código deve ser legível por design:
  * Nomes claros e descritivos para métodos, classes e variáveis.
  * Funções curtas com responsabilidade única.
  * Tratamento explícito de exceções.

---

## 4. 🔒 Segurança e Validação

* Toda requisição de entrada no Controller deve utilizar `@Valid @RequestBody`.
* Validações de campos obrigatórios, formatos e tamanhos devem ser declaradas nos DTOs de Request via Bean Validation (`@NotBlank`, `@NotNull`, `@Email`, `@Pattern`, `@Size`).
* Autenticação e autorização centralizadas via Spring Security com tokens JWT stateless.
* Conflitos de recursos existentes (ex: e-mail ou CNPJ duplicado) devem lançar `DuplicateResourceException` e responder com `HTTP 409 Conflict`.
* Erros de validação devem retornar `HTTP 400 Bad Request` no formato padronizado `ErrorResponse`.

---

## 5. 🧪 Padrão de Testes Automatizados (TDD)

* Toda nova funcionalidade deve ser acompanhada de testes unitários e de integração:
  * **Testes de Serviço (`*ServiceTest`):** JUnit 5 + Mockito cobrindo regras de negócio, cálculos e cenários de exceção.
  * **Testes de Controlador (`*ControllerTest`):** MockMvc validando status HTTP, formato JSON e contratos OpenAPI.
