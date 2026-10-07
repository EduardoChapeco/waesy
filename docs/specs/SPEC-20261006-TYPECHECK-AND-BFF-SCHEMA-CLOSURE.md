# SPEC-20261006 — Fechamento de TypeScript e contratos BFF↔banco

## Escopo

Esta fase corrige os diagnósticos TypeScript existentes por grupos de domínio e fecha as referências BFF que não possuem declaração local verificável. Nenhuma tabela, coluna, view ou policy será inventada a partir de uma chamada isolada; cada contrato deve ser confirmado por uso, documentação, histórico Git, migration remota autorizada ou removido do código.

## Invariantes

1. O typecheck final deve terminar com exit code 0 sem desligar `noImplicitAny` ou esconder arquivos.
2. Correções de tipos não podem mudar a semântica de tenant, publicação, preço, estoque, checkout ou autenticação.
3. Cada referência BFF deve ser classificada como tabela/view local, contrato remoto comprovado, referência obsoleta removida ou migration real necessária.
4. Migrations novas devem conter DDL mínimo, índices, RLS/RBAC e testes de contrato; não devem criar dados demo.
5. `service_role` não substitui ownership no BFF; toda nova função deve derivar tenant da sessão.
6. O gate `check:bff-tables` só passa com zero referências desconhecidas ou uma fonte de verdade explicitamente registrada e verificável.

## Método

O typecheck será corrigido em grupos disjuntos: rotas públicas de vitrine, rotas de autenticação/API, rotas financeiras/integrações, marketing/social, rotas públicas especiais e contratos de infraestrutura. Cada grupo deve passar por typecheck direcionado, testes relacionados e diff check antes da integração.

Os 28 contratos de banco serão inventariados por arquivo, operação e colunas usadas. Só haverá migration após confirmação de que o recurso é realmente necessário e de que não existe em outra nomenclatura/view. Referências externas sem fonte verificável permanecerão bloqueadas e documentadas, não serão convertidas em tabelas fake.

## Aceite

- `npm run typecheck` retorna exit code 0.
- `npm run check:bff-tables` retorna exit code 0.
- Testes focados e suíte completa passam.
- Migrations novas são sintaticamente válidas, possuem RLS adequado e não introduzem fallback cross-tenant.
- `git diff --check`, build, lint canônico e auditoria de design passam sem P0/P1.
