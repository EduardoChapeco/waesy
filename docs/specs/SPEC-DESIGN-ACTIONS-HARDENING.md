# SPEC-DESIGN-ACTIONS-HARDENING

Data: 2026-10-06
Status: autorizado pelo pedido do usuario para revisar, padronizar, corrigir e sincronizar o repositorio.

## Entradas e Saidas

Entradas: contratos de DESIGN.md, DESIGN-LINT.md, SPEC-ACTION-COMPLETENESS-AUDIT e os controles existentes.
Saidas: primitivas corrigidas, scanner com testes de regressao, isolamento do Copilot corrigido e relatorio com evidencias.

## Requisitos EARS

- Quando Button renderizar um controle, o sistema deve preservar o elemento delegado por asChild durante loading e bloquear sua ativacao enquanto loading ou disabled.
- Quando um Button possuir handler de clique e nao declarar type, o sistema deve usar type button; submits explicitos e o comportamento historico dos submits sem handler devem permanecer compativeis.
- Quando controles canonicos forem renderizados, o sistema deve assegurar alvo minimo de 44px, foco visivel de 2px, dimensoes estaveis e tokens semanticos.
- Quando um campo estiver em erro, o sistema deve comunicar aria-invalid e manter o contrato fornecido pelo consumidor quando nao houver erro.
- Quando a auditoria encontrar handler vazio inline ou nomeado, sucesso baseado somente em toast transacional, destino vazio ou javascript, o sistema deve emitir P1 com evidencia.
- Se uma execucao do Copilot nao possuir store_id, entao apenas seu proprietario ou administrador deve poder le-la; ausencia de tenant nao deve conceder acesso publico.
- Quando persistencia do Copilot falhar, o servico deve propagar o erro e ordenar os passos antes de concluir a execucao.
- Quando a revisao terminar, o relatorio deve distinguir correcoes comprovadas, divida preexistente e fluxos nao verificados em producao.

## Escopo Autorizado

- src/components/ui/{button,input,textarea,select,toggle,tabs,dialog,sheet,pagination}.tsx e testes dos contratos.
- scripts/audit/audit-interactive-buttons.{mjs,test.mjs}, seus relatorios e testes de gate em package.json.
- src/services/copilot-execution-persistence.ts e seus testes; migrations e testes SQL das duas tabelas do Copilot.
- Componentes/rotas apontados por achados confirmados do scanner, com adendo neste documento antes da edicao.
- docs/design/DECISIONS.md e docs/AUDITORIA_DESIGN_ACOES_2026-10-06.md.

## Invariantes

Adendo confirmado: corrigir src/components/location/location-master-pill.tsx e seu teste para ativacao por teclado, limpeza de timers e compatibilidade com long press; adicionar scripts/audit/audit-copilot-access.mjs e testes SQL/servico de isolamento e persistencia.

Adendo de design: usar o MapLibreCanvas existente no seletor de localizacao, em lugar da simulacao de mapa sem tiles; centralizar dimensoes de overlays em src/styles.css e docs/design/tokens.json, validar seu espelho em scripts/token-sync.mjs; corrigir falso positivo de variantes data/aria em scripts/design-lint.mjs com teste em scripts/design-lint.test.mjs. Nenhuma regra, threshold ou allowlist sera relaxada.

Preservar as alteracoes locais existentes e o arquivo nao rastreado. Nao substituir negocios por sucesso simulado. Nao enfraquecer lint, RLS ou gates. Nao confundir gate ratchet com ausencia de divida global.

## Evidencia

Testes do scanner e de Button, persistencia e isolamento. Auditorias de acoes e forense. Typecheck, testes, lint, lint visual e build de producao. Verificacao final do estado Git e referencias remotas antes do push.
