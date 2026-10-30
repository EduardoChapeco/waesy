# Auditoria global do projeto e dos prompts

**Data:** 2026-10-30 (America/Sao_Paulo)  
**Branch:** `production-candidate`  
**Estado inicial:** worktree limpo; nenhum arquivo de código alterado nesta auditoria.  
**Objetivo:** confrontar os prompts, planos e conversas registradas com o código executável atual, sem confundir documentação, intenção, teste estático ou build com funcionamento de produção.

## Evidência executada

| Verificação | Resultado | Interpretação |
|---|---:|---|
| Auditoria semântica de ações | 8.262 controles em 1.277 arquivos; 5 P1 | Há 3 botões mortos e 2 ações falsas detectadas. |
| Testes do auditor de ações | 19/19 | O scanner reconhece ações mortas, toasts falsos, destinos inválidos e mutações com evidência estática. |
| Auditoria consolidada | 31/43 checks conformes; 12 abertos | O harness concluiu, mas não significa que o produto esteja completo. |
| Design lint atual | 4.084 violações em 744 arquivos | 9 P0, 3.288 P1, 486 P2 e 301 P3. O gate normativo continua não conforme. |
| Contratos BFF/tabelas | 636 tabelas referenciadas; 0 sem declaração local | A existência de migration local não prova migration aplicada no banco remoto. |
| Unicidade de tipos | 0 tipos duplicados detectados; Supabase Database sem `any` | Resultado positivo do scanner atual. |
| Schema/migrations | 563 migrations; 787 tabelas declaradas; 0 colisões | Coerência local de inventário, sem prova de drift remoto. |
| Ciclos de dependência | 1 ciclo | `travel-supply-orchestrator.service.ts` importa `travel-wooba-connector.service.ts` e o inverso. |
| Secret scan | 6.010 arquivos; 0 secrets não permitidos | Não cobre credenciais já vazadas no histórico nem configuração remota. |
| Rotas | 440 no inventário consolidado; 409 arquivos de rota no censo alternativo | O próprio repositório possui inventários com definições diferentes; precisa de uma fonte canônica. |
| Rotas monolíticas | 188 acima de 500 linhas | Há concentração de regras, UI e estado em arquivos difíceis de auditar. |
| Linhas de código | 949.544 | O tamanho aumenta o risco de duplicação, cobertura parcial e divergência entre módulos. |

## Findings confirmados

| ID | Severidade | Evidência | Impacto | Estado |
|---|---|---|---|---|
| ACT-001 | P1 | `src/routes/admin-master.marca.tsx:645` — botão “Botão de Acento” sem ação | Affordance interativa sem comportamento | Aberto |
| ACT-002 | P1 | `src/routes/workspace.b2b.index.tsx:302` — “Comprar no Atacado (CNPJ)” exibe toast de cotação sem fluxo persistente | Pode declarar sucesso sem pedido, cotação ou destinatário real | Aberto |
| ACT-003 | P1 | `src/routes/workspace.turismo.corporativo.tsx:551` — “Sincronizar Canal” apenas mostra toast | Usuário acredita que integração foi sincronizada sem chamada BFF/provider | Aberto |
| ACT-004 | P1 | `src/components/commerce/supermarket/SupermarketClubDashboardView.tsx:110` — “Extrato” sem ação | Módulo de clube oferece navegação inexistente | Aberto |
| ACT-005 | P1 | `src/components/workspace/CustomerDrawer360.tsx:237` — “Nova Anamnese” sem ação | A jornada clínica/atendimento termina em um controle morto | Aberto |
| ARCH-001 | P1 | `src/services/travel-supply-orchestrator.service.ts:12` ↔ `src/services/travel-wooba-connector.service.ts:13` | Ciclo impede fronteira clara entre orquestração e conector | Aberto |
| DESIGN-001 | P0 | Design lint: 9 DL-15; 8 DL-31 atribuídas a `components/app` | Acessibilidade e estrutura visual ainda bloqueiam entrega | Aberto |
| DESIGN-002 | P1 | Design lint: 1.460 DL-14, 786 DL-02, 656 DL-01 e 287 DL-30 | Débito amplo em touch targets, valores arbitrários, cores e overflow | Aberto |
| DESIGN-003 | P1 | Design lint: 29 DL-12, 19 DL-11 e 9 DL-13 | Há superfícies sem estados vazio, loading ou erro detectados | Aberto |
| ARCH-002 | P1 | C26: oito pares concorrentes, incluindo `crm.functions.ts`/`crm.ts`, `quotes.functions.ts`/`travel-proposal.functions.ts` e dois Kanbans | Mais de uma implementação pode resolver o mesmo domínio | Aberto |
| ARCH-003 | P1 | C28 em `src/routes/api.auth.confirm.ts:6` e `src/services/personal-finance.functions.ts:595` | Padrões de acesso/importação precisam de revisão de fronteira | Aberto |
| ARCH-004 | P1 | Censo: 188 rotas acima de 500 linhas | Dificulta propagação de contratos e cria risco de monólitos | Aberto |
| UX-001 | P1 | Inventários atuais divergem em quantidade de rotas e componentes | Menus, route tree, registry e auditorias podem usar universos diferentes | Aberto |
| DATA-001 | P1 | Auditorias históricas listam BFFs sem superfície; o relatório atual não prova que todos foram conectados | Existência de service function não prova consumidor legítimo nem jornada | Não verificado por domínio |
| GOV-001 | P1 | `AGENTS.md` exige `waesy-integrity-auditor` e seu evidence ledger, mas a skill não está presente no checkout atual | A governança obrigatória da auditoria não pode ser reproduzida integralmente | Aberto |

## Pontos positivos comprovados localmente

- O scanner de ações possui 19 casos de regressão e diferencia `navigate`, `submit`, `mutate`, modal com continuação, preview e ação desabilitada.
- O contrato BFF/tabela local não encontrou referências sem migration correspondente.
- O scanner de tipos não encontrou declarações concorrentes dentro de `src/`.
- O scan de secrets não encontrou vazamentos de alta confiança fora da allowlist de fixtures.
- A arquitetura já possui registries de nicho, componentes canônicos e shells separados; a auditoria precisa comprovar adoção real, não apenas existência desses arquivos.

## Limites da prova

- Não foi executado `typecheck`, build, suíte completa, browser E2E, reload com persistência, RLS com JWT real, migration em banco efêmero, provider externo, Cloudflare ou smoke de produção nesta auditoria.
- O design lint é uma evidência estática atual; seus contadores não substituem inspeção visual de cada rota.
- O scan de ações não valida por si só persistência, autorização, cache, reidratação ou resultado no banco.
- Documentos históricos afirmam fases concluídas, mas devem ser tratados como hipóteses até reprodução no SHA atual.

## Ordem de correção recomendada

1. Fechar ACT-002, ACT-003, ACT-004 e ACT-005 com fluxo real ou remover a affordance; ACT-001 deve ser ligado a uma ação de marca real ou removido.
2. Quebrar ARCH-001 por inversão de dependência: o conector não deve importar o orquestrador; tipos, cálculo e contratos devem viver em módulo neutro.
3. Resolver os 9 P0 e reduzir os P1 do design lint sem atualizar baseline para esconder dívida.
4. Escolher a fonte canônica de inventário de rotas e verificar route tree, registry, menu, sidebar e destino real em conjunto.
5. Auditar cada domínio concorrente de C26 e selecionar uma implementação; migrar callers, testes e documentação antes de remover o legado.
6. Executar a auditoria bilateral por nicho: configuração Master/Workspace → fonte canônica → BFF → banco/RLS → vitrine; e usuário → UI → BFF → persistência → Workspace/Admin.
7. Só então executar validações de tipo, testes, design, build, banco, browser e CI no SHA candidato.

`GOV-001` é pré-condição de qualquer nova onda: restaurar a skill canônica e registrar o preflight no ledger antes de mutar código.

## Veredito

O projeto tem infraestrutura substancial e alguns gates locais sólidos, mas a auditoria atual não sustenta “completo”, “sem legado”, “sem duplicações”, “0 P0” ou “pronto para produção”. O maior risco não é ausência total de arquitetura; é a distância entre arquitetura declarada e adoção uniforme: ações falsas, ciclo de dependência, duplicação de domínios, débito visual e inventários divergentes.
