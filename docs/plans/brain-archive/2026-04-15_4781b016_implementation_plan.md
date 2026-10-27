# 🚀 Auditoria e Refatoração Master — Turis Agências (ERP V3)

Recebi o seu **Prompt Master** de Auditoria Global da arquitetura Lovable. Como este é um escopo colossal e a plataforma já está em um estágio maduro (ERP ativo), irei executar as 9 Fases em **Blocos Milestones** metódicos. 

Assim garantimos a segurança extrema e qualidade Enterprise sem quebrar nada do que está rodando. O Supabase, o Web App (React) e as Edge Functions serão tratados.

---

## 🚦 Fases de Execução e Milestones

### 🔴 Milestone 1: Segurança Crítica (Blocos 1, 2, 3 e 7)
Foco imediato e isolamento de vulnerabilidades.
- **Auditoria de FKs Ativas e Restrições:** Varredura detalhada no Supabase buscando `ON DELETE CASCADE / RESTRICT` nas tabelas principais (`clients`, `trips`, `financial_*`).
- **Verificação RLS Absoluta:** O banco já aponta que *todas as tabelas* têm RLS ativado (verifiquei agora). Minha missão será auditar ativamente se há alguma `USING (true)` mascarada em tabelas core.
- **Edge Functions e Secrets:** Procurar no código `.env` references missing, hardcoded tokens e garantir JWT validation obrigatória nas Edge Functions (principalmente webhook e `extension-sync`).
- **IA Guardrails:** Arquitetar a injeção contra Prompt Leaks diretamente no extrator de PDFs e geradores de texto.

### 🟠 Milestone 2: Hardening Anti-Abuso (Bloco 4 e 8)
Blindagem de rede e browser.
- **XSS & CSRF:** Checar uso de `dangerouslySetInnerHTML` no Web App (comuns na exibição de logs e contratos) e envelopar em `DOMPurify`.
- **CORS Estrito:** Limpar `*` do arquivo global do Supabase (`cors.ts` das Edge Functions) para apontar unicamente ao Portal Web App autorizado.
- **Taxa Limite (Rate Limit):** Avaliar necessidade de limiter via Redis/Postgres nas funções de webhook (ingestão automática). 

### 🟡 Milestone 3: Dívida Técnica e Consistência UI/UX (Blocos 5 e 6)
Arrumando a casa a nível de código base (React).
- **Hooks e Redux/Store:** Centralizar lógicas soltas em `/hooks` únicos (a exemplo do forte `useFinance.ts` que fizemos).
- **TypeScript Strictness:** Elevação da rigidez dos tipos `AppRole`, Enums de Kanban status, e checagem de nulos na UI.
- **Responsividade C-Level:** Assegurar via varredura que Grid/Bento no Dashboard não estoure em telas de celular, aplicar overflow safe. Ajustar botões base via Tailwind.

### 🟢 Milestone 4: Teste de Stress e Deployment (Bloco 9)
Selo de qualidade final.
- Build verificado de todo o Typescript (via Vite).
- Testes falsificando `auth.uid()` para tentar bypass em outras Orgs.
- Entrega final pronta para Deploy.

---

## 🛑 User Review Required

Para conseguirmos acelerar e operar este monstro, **precisamos da sua aprovação formal para começar a rodar as "migrações e refatorações no código" listadas no MILESTONE 1.**

> [!WARNING]  
> Você deseja que eu comece AGORA a execução do **Milestone 1** gerando as SQL de checagens finas de restrição (Cascades) e atualizando o bloqueio das Edge Functions? Ou quer alinhar alguma regra de negócio primeiro antes de aplicarmos a camada Master?
