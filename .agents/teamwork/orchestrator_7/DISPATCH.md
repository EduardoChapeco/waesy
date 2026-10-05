## 2026-10-05T06:29:10Z

You are the Project Orchestrator for the Waesy project.

Your Working Directory: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\orchestrator_7
Project Root: c:\Users\Eduardo Antônio Ramo\Documents\waesy
Authoritative User Request: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md (see header ## 2026-10-05T06:27:42Z)

Mission:
Restaurar a interatividade em toda a plataforma Waesy (produção em Cloudflare Pages). Centenas de botões, dropdowns, drawers e alternadores de contexto pararam de responder ao mesmo tempo: o alternador de perfil não expande, o avatar do topo não abre o drawer de conta, o botão "Sair" fica sobreposto a outro botão e o usuário não consegue entrar nos workspaces das lojas. Primeiro, encontrar e comprovar a causa raiz sistêmica; depois, inventariar e corrigir cada botão que continuar quebrado.

Core Requirements:
R1. Causa raiz sistêmica comprovada: Identificar por que a interatividade parou em todo o app com evidência reproduzível (erros de console/hidratação, bisseção ou trace). Corrigir na raiz.
R2. Fluxos de navegação de conta e contexto: Alternador de perfil/contexto expande e lista contextos reais; selecionar loja leva ao workspace; avatar do topo abre drawer de conta (desktop e mobile 390px); botão "Sair" e vizinhos alinhados e clicáveis sem sobreposição.
R3. Inventário completo e remediação de botões: Inventário legível por máquina de todos os elementos interativos em src/routes/ e src/components/ salvo em auditoria/ com contagem final de itens quebrados igual a 0.
R4. Nenhuma regressão de contrato ou design: Respeitar AGENTS.md (B.1–B.30), touch targets >= 44px, :focus-visible:ring-2, sem colchetes arbitrários nem cores literais. Teste E2E automatizado de navegador (Playwright ou equivalente) no repositório + crawler de cliques em >= 30 rotas com 0 cliques sem efeito. Typecheck limpo, vitest passando, design-lint ratchet passando, build e deploy no Cloudflare Pages (usewaesy). Entrada de handoff em docs/design/DECISIONS.md.

Orchestration Instructions:
1. Decompose the mission into clear milestones (e.g., Survey/Root-Cause Analysis -> Systematic Root-Cause Fix -> Account & Context Flow Fixes -> Interaction Inventory & Crawl Remediation -> E2E & Production Verification).
2. Spawn and coordinate specialized subagents (explorers, workers, reviewers, challengers) using isolated directories under .agents/teamwork/.
3. Maintain your plan.md, progress.md, and BRIEFING.md in c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\orchestrator_7\. Keep progress.md continuously updated with timestamps and concrete metrics.
4. Report completion back to the Sentinel when all acceptance criteria are met, providing explicit proof and paths to artifacts so independent victory audit can be conducted.
