# SPEC-F19: Roadmap Vivo e Changelog Automatizado

## 1. Contexto e Escopo
A Fase F19 estabelece os geradores determinísticos de documentação viva e rastreabilidade contínua da plataforma Waesy.
O sistema deve gerar o `CHANGELOG.md` diretamente do log do Git e dos registros formais em `docs/design/DECISIONS.md`, mantendo `docs/canonico/ROADMAP_VIVO.md` sincronizado com os marcos reais concluídos e capacidades ativas, sem texto estático defasado.

## 2. Requisitos EARS

### [REQ-F19-01] Gerador Automatizado de Changelog
- **Quando** o script `scripts/generate-changelog.mjs` for executado,
- **o sistema DEVE** extrair o histórico estruturado do Git (commits convencionais `feat`, `fix`, `docs`, `security`, `release`), correlacionar com as decisões `DEC-XXX` de `docs/design/DECISIONS.md` e atualizar deterministicamente o arquivo `CHANGELOG.md` no formato Keep a Changelog.

### [REQ-F19-02] Roadmap Vivo com Rastreabilidade por Pilar
- **Quando** a equipe ou agentes consultarem o status do produto em `docs/canonico/ROADMAP_VIVO.md`,
- **o sistema DEVE** apresentar o estado homologado dos 4 pilares canônicos (Places, Classificados, Marketplace, Workspace) com seus respectivos hashes de commit, rotas públicas ativas e contratos de governança.

### [REQ-F19-03] Script Executável e Idempotente
- **Quando** o gerador for chamado em pipelines locais ou CI,
- **o sistema DEVE** executar com Exit Code 0, sem dependências externas não instaladas e sem introduzir quebras ou violações na catraca do design lint.

## 3. Invariantes e Regras Pétreas
- **Zero Mocks (M01):** Todo item listado no roadmap ou changelog deve corresponder a arquivos e commits reais existentes no repositório.
- **Formatação Canônica:** Formatação Markdown sem emojis ou caracteres ilegais em conformidade com `AGENTS.md`.
- **Qualidade de Código:** 0 erros no typecheck, 0 regressões de design lint, 100% dos testes vitest verdes e build de produção aprovado.

## 4. Critérios de Aceite
- [ ] `scripts/generate-changelog.mjs` criado e executável via Node.js.
- [ ] `docs/canonico/ROADMAP_VIVO.md` criado e atualizado com as capacidades entregues (F01–F18).
- [ ] `CHANGELOG.md` gerado/atualizado na raiz do repositório.
- [ ] 4 Gates de qualidade aprovados (vitest, design-lint --ratchet, typecheck, build).
- [ ] `DEC-145` registrado em `docs/design/DECISIONS.md`.
