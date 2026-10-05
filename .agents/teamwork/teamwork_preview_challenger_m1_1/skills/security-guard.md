# Security Guard Methodology (Local Snapshot)
Source: .agents/skills/security-guard/SKILL.md

1. Zero Client Trust (Confiança Zero no Frontend):
   - Preços, taxas, estoques, saldos e permissões nunca são aceitos a partir do payload do cliente.
2. RLS Deny-by-Default com (SELECT auth.uid()):
   - Todas as tabelas têm Row Level Security ativo. Operações de mutação direta do cliente são bloqueadas.
3. Validação Estrita de Schemas Zod:
   - Todo input de Server Function deve ser tipado e validado.
4. Proteção Contra Replay & Idempotência.
5. Ledger Imutável & Prova de Solvência.
