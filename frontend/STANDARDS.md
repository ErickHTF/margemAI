# 📐 Padrão Arquitetural e Diretrizes de Desenvolvimento — Frontend (Margem.AI)

Este documento define os padrões arquiteturais obrigatórios para o desenvolvimento do **Frontend** no ecossistema **Margem.AI** (React 19 + Vite + Tailwind CSS).

---

## 1. 🏛️ Estrutura e Organização em Camadas

O código deve ser modular e organizado dentro de `frontend/src/` nas seguintes camadas:

```
frontend/src/
├── assets/          # Imagens, logotipos e ilustrações estáticas
├── components/      # Componentes reutilizáveis de interface (PascalCase.jsx)
├── constants/       # Enums, listas fixas e parâmetros alinhados ao backend
├── hooks/           # Custom React Hooks para estados complexos e lógicas reutilizáveis
├── services/        # Clientes HTTP (Axios) e integração com endpoints da API
├── utils/           # Funções utilitárias (máscaras, validadores, formatadores BRL)
├── App.jsx          # Componente raiz da aplicação
├── index.css        # Estilos globais e diretivas do Tailwind CSS
└── main.jsx         # Ponto de entrada da aplicação React/Vite
```

---

## 2. 🔤 Convenções de Nomenclatura

* **Entidades e Domínios:** **SEMPRE NO SINGULAR**, espelhando o backend:
  * Exemplo: `user`, `product`, `sale`, `fixedCost`, `variableCost`, `pricing`.
* **Componentes:** Nomes em **PascalCase** descritivos da sua função:
  * ✅ `RegisterForm.jsx`, `PricingCalculator.jsx`, `CashFlowSummary.jsx`, `AlertCard.jsx`
* **Serviços de API:** Nomes em **camelCase** terminando em `Service.js`:
  * ✅ `authService.js`, `productService.js`, `saleService.js`, `pricingService.js`
* **Arquivos Utilitários:** Nomes em **camelCase**:
  * ✅ `validators.js`, `formatters.js`, `masks.js`

---

## 3. 🚫 Regra Crítica: Código Sem Comentários

* **NÃO incluir comentários no código-fonte** (`//` ou `{/* */}`).
* O código deve ser autoexplicativo através de:
  * Nomes expressivos para funções, hooks e variáveis de estado.
  * Estruturas JSX limpas e componentes com responsabilidade única.

---

## 4. 🌐 Integração com a API e Serviços

* Todas as requisições HTTP devem ser centralizadas na camada `services/` utilizando o cliente `api.js` (`Axios`).
* A URL base da API deve ser dinâmica via `import.meta.env.VITE_API_URL` com fallback para `http://localhost:8080/v1`.
* Respostas de erro da API (`ErrorResponse`) devem ser tratadas de forma uniforme, exibindo mensagens amigáveis e claras para o usuário.

---

## 5. 🎨 Design System e Usabilidade (MEI)

* **Tailwind CSS:** Utilizar classes utilitárias para estilização, mantendo a consistência visual.
* **Mobile-First e Responsividade:** A interface deve ser 100% utilizável tanto em celulares quanto em desktops.
* **Validação em Tempo Real:** Fornecer feedback imediato em formulários (força de senha, máscara de CNPJ, formatação de moeda em R$).
