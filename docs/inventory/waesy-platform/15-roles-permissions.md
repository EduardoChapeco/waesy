# 15 — Perfis de Acesso e Matriz RBAC

A segurança do Waesy é governada por autorização em duas camadas: **BFF Server-Side** e **RLS Deny-by-Default** no banco de dados.

## 1. Papéis de Usuário (Roles)
1. **`admin_master`:** Administrador global da infraestrutura Waesy. Acesso irrestrito a todas as organizações, lojas, métricas globais e auditoria de segurança.
2. **`tenant_owner`:** Proprietário da organização e loja. Acesso completo ao Workspace corporativo, faturamento, permissões de equipe e chaves de integração.
3. **`store_manager`:** Gerente operacional. Gerencia catálogo, pedidos, clientes e financeiro operacional; bloqueado de alterar dados societários do tenant.
4. **`clerk` / `attendant`:** Atendente de balcão / vendedor. Acesso ao PDV, comandas, chat e atendimento ao cliente; bloqueado de relatórios fiscais e financeiro global.
5. **`courier`:** Entregador parceiro Waesy Go. Acesso exclusivo à interface de rotas, aceite de corridas e confirmação de entrega.
6. **`civil_user`:** Consumidor final e visitante. Acesso irrestrito à navegação em vitrines, busca, compras, perfil próprio e histórico de pedidos pessoais.
