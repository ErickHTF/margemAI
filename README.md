# Margem.AI — Gestão Inteligente para Microempreendedores Individuais (MEI)

Plataforma de precificação, controle de custos e fluxo de caixa simplificado para MEIs brasileiros, baseada nas recomendações do SEBRAE.

O Margem.AI ajuda o microempreendedor sem formação financeira a responder, antes de fechar uma venda, quanto realmente sobra depois de custos, taxas da maquininha e impostos. É uma aplicação web (API REST em Spring Boot + interface em React) desenvolvida como Projeto Integrador do curso de Análise e Desenvolvimento de Sistemas do IFSP, Campus Salto.

---

## Navegação Rápida e Documentação

* [**Guia de Deploy e Releases (Homologação & Produção)**](DEPLOY.md)
* [**Padrões de Arquitetura Backend (Java 21 / Spring Boot 3.4)**](backend/STANDARDS.md)
* [**Padrões de Arquitetura Frontend (React 19 / Vite / Tailwind)**](frontend/STANDARDS.md)
* [**Guia de fluxo de trabalho e padrões para implementar cards**](AGENTS.md)
* [**Contrato da API (OpenAPI 3)**](backend/src/main/resources/openapi.yaml)
* [**Quadro Kanban no GitHub Projects**](https://github.com/users/ErickHTF/projects/2/views/2)

---

## Funcionalidades

Todas as funcionalidades abaixo estão implementadas no backend (endpoints em `/v1/...`) e possuem tela no frontend.

| Módulo (menu) | O que o MEI faz | Card |
|---|---|---|
| **Conta › Meu Perfil** | Cadastro e login com JWT (access + refresh token); perfil com segmento de atuação (Comércio, Serviços, Indústria, Alimentação...) e teto anual de faturamento. | `feature/auth` |
| **Cadastros › Catálogo** | Catálogo de produtos e serviços com custo base calculado a partir dos custos variáveis vinculados. | US-06 |
| **Financeiro › Vendas** | Registro rápido de vendas com várias formas de pagamento (dinheiro, Pix, débito, crédito à vista e parcelado), prévia do valor líquido após a taxa configurada e resumo do período. | US-10 |
| **Financeiro › Fluxo de Caixa** | Histórico e evolução mensal de receita, custos fixos e variáveis, taxas de pagamento e saldo. | US-12 |
| **Financeiro › Custos** | Gestão de custos fixos (com rateio) e custos variáveis por produto/serviço, com filtros por categoria. | US-04, US-05 |
| **Financeiro › Calculadora Markup** | Precificação por markup no método SEBRAE, simulador de descontos e cálculo de ponto de equilíbrio (break-even); opção de incluir a taxa de pagamento configurada nas despesas variáveis. | US-07, US-09 |
| **Configurações › Padrões de Preço** | Categorias com parâmetros de precificação (margem de lucro alvo, alíquota de impostos, percentual de despesas variáveis e desconto máximo) reutilizados pela calculadora, com revalidação dos preços dos produtos da categoria. | — |
| **Configurações › Taxas de Pagamento** | Matriz global de taxas (MDR + tarifa fixa) e prazos de liquidação por forma de pagamento e número de parcelas (1x a 12x), comparada ao padrão recomendado. | US-17 |
| **Alerta de teto MEI** | Monitoramento do faturamento anual em relação ao teto do MEI (R$ 81.000,00 por padrão), proporcional aos meses de atividade no ano de abertura, com modo de simulação. | US-13 |
| **Pílulas educativas SEBRAE** | Dicas contextuais de educação financeira em cada tela (botão "?"). | US-14 |

Também fazem parte do projeto: health check via Spring Boot Actuator (`/actuator/health`, INFRA-05), conteinerização com Docker Compose (INFRA-04) e uma suíte de testes de precisão financeira com `BigDecimal` (TECH-01).

> Apesar do nome, a versão atual **não** integra nenhum modelo de IA/LLM: os cálculos e recomendações são regras determinísticas baseadas no método SEBRAE.

---

## Stack Tecnológica

* **Backend:** Java 21, Spring Boot 3.4.2 (Web, Validation, Data JPA, Security, Actuator), JJWT 0.12.6, Lombok, Maven Wrapper.
* **Banco de dados:** PostgreSQL (16 no `docker-compose.yml` da raiz; 13 no `backend/docker-compose.yml` de desenvolvimento) — H2 em memória apenas nos testes.
* **Frontend:** React 19, Vite, Tailwind CSS v4, lucide-react, Axios, Vitest, ESLint.
* **Infra:** Docker multi-stage (JRE 21 Alpine e Nginx Alpine com proxy reverso para `/v1` e `/actuator`).
* **CI/CD:** GitHub Actions — testes do backend, lint e build do frontend em todo PR; Pre-Releases de homologação, Releases de produção e esteira de rollback (ver [DEPLOY.md](DEPLOY.md)).

---

## Como executar

### Pré-requisitos

* Docker com Docker Compose (opção 1), ou
* JDK 21, Node.js 20+ e Docker apenas para o banco (opção 2).

### Opção 1 — tudo com Docker Compose

Na raiz do repositório:

```bash
docker compose up -d --build
```

| Serviço | Endereço |
|---|---|
| Frontend (Nginx) | http://localhost:3000 |
| API | http://localhost:8080/v1 |
| Health check | http://localhost:8080/actuator/health |
| PostgreSQL 16 | `localhost:5432` (banco/usuário `margemai`) |

A senha do banco pode ser definida pela variável `POSTGRES_PASSWORD` (há um valor padrão de desenvolvimento). Para parar: `docker compose down` (acrescente `-v` para apagar os dados).

### Opção 2 — desenvolvimento local

1. **Banco** (PostgreSQL na porta `5435`, já esperada pelo perfil padrão do backend):

   ```bash
   cd backend
   docker compose up -d
   ```

2. **Backend** (http://localhost:8080):

   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```

   Variáveis úteis: `SERVER_PORT`, `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`, `JWT_SECRET` (obrigatório trocar fora do ambiente de desenvolvimento) e `CORS_ALLOWED_ORIGINS`.
   O perfil `local` (`SPRING_PROFILES_ACTIVE=local`) aponta para `localhost:5432`, ou seja, para o banco do `docker-compose.yml` da raiz (`docker compose up -d db`).

3. **Frontend** (http://localhost:3000):

   ```bash
   cd frontend
   npm ci
   npm run dev
   ```

   A URL da API pode ser alterada com `VITE_API_URL` (padrão: `http://localhost:8080/v1`).

### Testes e verificações (os mesmos do CI)

```bash
cd backend  && ./mvnw test
cd frontend && npm run lint && npm test && npm run build
```

---

## API

O contrato completo está em [`backend/src/main/resources/openapi.yaml`](backend/src/main/resources/openapi.yaml) (OpenAPI 3). Ele pode ser visualizado colando o arquivo no [Swagger Editor](https://editor.swagger.io/).

Recursos principais (todos sob `/v1`; exceto `auth`, `segments` e `actuator`, exigem `Authorization: Bearer <token>`):

`/auth` · `/me` · `/profile` · `/segments` · `/products` · `/categories` · `/costs/fixed` · `/costs/variable` · `/pricing` · `/sales` · `/dashboard/monthly-flow` · `/alerts/mei-cap` · `/settings/financial/payment-methods` · `/settings/operational`

---

## Estrutura do projeto

```
.
├── backend/                      # API REST Spring Boot
│   ├── src/main/java/com/example/margemAI/
│   │   ├── config/               # Carga inicial de dados (segmentos)
│   │   ├── controller/           # Endpoints REST
│   │   ├── dto/{request,response}/
│   │   ├── event/                # Eventos de domínio (recalcular custos/preços)
│   │   ├── exception/            # Exceções e tratador global
│   │   ├── model/                # Entidades JPA e enums
│   │   ├── repository/           # Spring Data JPA
│   │   ├── security/             # JWT, filtro e configuração do Spring Security
│   │   └── service/              # Regras de negócio e cálculos financeiros
│   ├── src/main/resources/       # application*.properties e openapi.yaml
│   ├── src/test/                 # Testes de controller (MockMvc) e de serviço (Mockito)
│   ├── docker-compose.yml        # PostgreSQL para desenvolvimento
│   ├── margem.md                 # Relatório científico do projeto (conversão do PDF)
│   └── STANDARDS.md
├── frontend/                     # SPA React + Vite
│   ├── src/{components,hooks,services,utils,constants,data,security}/
│   ├── nginx.conf                # Servidor e proxy reverso usados na imagem Docker
│   └── STANDARDS.md
├── .github/workflows/            # CI, releases e rollback
├── docker-compose.yml            # Stack completa: db + backend + frontend
├── AGENTS.md                     # Fluxo de trabalho e padrões de código/UI
└── DEPLOY.md
```

---

## Fluxo de trabalho

A branch de integração é a `develop`: cada card do quadro gera uma branch (`feature/us-xx-...`, `fix/...`, `test/...`) e um Pull Request para a `develop`, com commits no padrão Conventional Commits em português. Detalhes em [AGENTS.md](AGENTS.md).

---

## Contexto acadêmico

Projeto desenvolvido na disciplina **Projeto Integrador 1 (PI1)** do curso de **Análise e Desenvolvimento de Sistemas** do **Instituto Federal de Educação, Ciência e Tecnologia de São Paulo (IFSP) — Campus Salto**, 2026.

### Equipe

* Mario Henrique Martins Alves Pedrao
* Adriano Camocardi Junior
* Erick Henrique Toaliari Fortunato

### Orientadores

* Prof. Me. Francisco Diego Garrido da Silva
* Prof. Dr. Paulo Sérgio Prampero
