# Margem.AI — Gestão Inteligente para Microempreendedores Individuais (MEI)

Plataforma inteligente de precificação, controle de custos e fluxo de caixa simplificado para MEIs brasileiros, integrando recomendações do SEBRAE e inteligência assistiva.

---

## Navegação Rápida e Documentação

* [**Guia de Deploy e Releases (Homologação & Produção)**](DEPLOY.md)
* [**Padrões de Arquitetura Backend (Java 21 / Spring Boot 3.4)**](backend/STANDARDS.md)
* [**Padrões de Arquitetura Frontend (React 19 / Vite / Tailwind)**](frontend/STANDARDS.md)
* [**Quadro Kanban Trunk-Based no GitHub Projects**](https://github.com/users/ErickHTF/projects/2/views/2)

---

## Stack Tecnológica

* **Backend:** Java 21, Spring Boot 3.4.2, Spring Data JPA, Spring Security, JJWT 0.12.6, PostgreSQL 16 (Docker via `docker-compose.yml`) — H2 apenas nos testes.
* **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide Icons, Axios.
* **CI/CD:** GitHub Actions com testes automatizados, Pre-Releases de homologação e Releases de produção.
* **Banco Local:** suba o PostgreSQL 16 com `cd backend && docker compose up -d` e rode com `SPRING_PROFILES_ACTIVE=local`.
