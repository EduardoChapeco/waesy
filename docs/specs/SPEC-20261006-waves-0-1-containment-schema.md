# SPEC-20261006 — Ondas 0–1: contenção P0 e consolidação do schema

## Objetivo

Conter imediatamente os caminhos P0 confirmados pela reauditoria e remover drift estrutural de migrations sem alterar regras de negócio não verificadas.

## Escopo desta execução

1. Propostas de workspace: exigir staff/ownership para leitura e autosave interno.
2. Propostas públicas: aceitar somente `public_token`, nunca UUID interno como credencial.
3. Listings: exigir staff para criação, publicação e transição; remover ator fallback.
4. Upload BFF: autenticar uploads de loja/universal, limitar MIME/tamanho, usar buckets allowlisted e namespace derivado do tenant; não criar bucket público em request.
5. Migrations: eliminar versões duplicadas por renomeação semântica e adicionar gate automatizado de unicidade.
6. Schema: adicionar verificação estática de referências críticas e registrar limitações quando o Supabase CLI/DB real não estiver disponível.

## Requisitos EARS

- **Quando** uma Server Function de workspace receber ID de proposta/listing, **o sistema deve** derivar o tenant da sessão, exigir staff e consultar o alvo dentro do tenant.
- **Quando** um endpoint público receber proposta, **o sistema deve** aceitar somente token público válido e nunca interpretar UUID interno como autorização.
- **Quando** um upload for solicitado, **o sistema deve** exigir identidade, bucket allowlisted, MIME permitido e tamanho máximo antes de decodificar Base64.
- **Quando** um bucket estiver ausente, **o sistema não deve** criá-lo publicamente durante uma requisição de usuário.
- **Quando** uma migration for adicionada, **o CI deve** rejeitar versões numéricas duplicadas.
- **Quando** uma referência a tabela/RPC crítica não tiver objeto canônico no conjunto ativo, **o CI deve** reportar o caminho e bloquear o gate de schema.

## Invariantes

- Nenhum fallback de ator, loja padrão, UUID interno ou identidade anônima pode autorizar mutação.
- Nenhuma alteração financeira, contratual ou de dados já existente será feita nesta spec.
- Endpoints públicos continuam somente leitura/aceite tokenizado e allowlisted.
- A migration original permanece preservada em Git; somente o filename/ordem é reconciliado.
- Toda limitação de validação remota será explicitamente registrada, sem declarar RLS real validada.

## Gates de aceite

- Testes negativos para proposta/listing/upload sem identidade.
- Typecheck e build passam.
- Teste estático confirma zero versões duplicadas.
- Design lint não recebe novos P0/P1.
- Branch limpa e decisão registrada em `docs/design/DECISIONS.md`.

## Fora do escopo imediato

Reconciliação completa das centenas de policies, migração de todos os tipos gerados, Postgres efêmero, HMAC dos webhooks, transações de pagamento e refatoração completa do CRM/turismo. Esses itens permanecem nas tarefas subsequentes das Ondas 0–2 do plano mestre.


## Verificação da execução

Em 2026-10-06, o gate `npm run check:schema` confirmou 442 migrations e zero versões numéricas duplicadas. Os testes focados de isolamento passaram com 4 arquivos e 28 testes. Prettier, ESLint dos arquivos alterados e `npm run build` passaram; o build gerou o worker e o client-leak check confirmou 484 chunks de boot sem runtime server exposto.

`npm run typecheck` global permanece bloqueado por 136 erros legados em 48 arquivos de rotas/API não tocados por esta execução. Nenhum erro foi reportado nos três services alterados pela Onda 0. O aviso `Database = any` continua registrado como débito da Onda 1, pois a geração fiel depende de um schema Supabase/Postgres disponível.
