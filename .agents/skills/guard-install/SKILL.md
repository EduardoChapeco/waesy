---
name: guard-install
description: Instalação de barreiras defensivas permanentes (S1 a S7) para evitar telas brancas, laços de redirecionamento e falhas silenciosas.
---

# Guard Install — Instalação de Guardas Permanentes

## Gatilho
Após isolar e corrigir uma quebra, para blindar o sistema contra reincidência futura.

## Quando NÃO Usar
- Durante prototipagem descartável ou testes exploratórios locais.

## Entradas
1. Ponto de falha corrigido.
2. Contrato da rota, loader ou função do servidor.

## Saídas
- Guardas permanentes (S1 a S7) implementadas e ativas no código.

## Procedimento
1. **S1 Barreira de Erro por Rota:** Instalar `errorComponent` explícito que exibe rota, erro técnico e botão de recarregar. Zero tela branca.
2. **S2 Guarda com 3 Estados:** Estruturar guardas de rota com `verificando`, `liberado` e `negado`. Nunca redirecionar durante o estado `verificando`.
3. **S3 Propagação de Erro de Rede:** Garantir que falhas de API exibam estado de erro na UI, nunca lista vazia silenciosa.
4. **S4 Telemetria de Erro:** Registrar falhas com rota, contexto ativo e ID de requisição via `logSystemError`.
5. **S5 Coerência de Sessão:** Validar integridade entre sessão e cookies no boot da aplicação.
6. **S6 Alerta de Divergência:** Emitir warning explícito em desenvolvimento quando cookies divergirem.
7. **S7 Auto-Heal de Storage:** Implementar verificação proativa de existência de bucket com criação resiliente.

## Regras Duras
- Nenhum loader de rota TanStack Router pode dar throw não tratado (Zero-Crash Loader Mandate).
- O `errorComponent` nunca pode ser uma caixa preta opaca; deve exibir diagnóstico real.
- Falha de rede não pode mascarar dados reais simulando banco vazio.

## Anti-Padrões
- Usar `try/catch` engolindo o erro e retornando array vazio sem avisar o usuário.
- Deixar rotas protegidas sem verificação de papel (RBAC/RLS) no backend.

## Critério de Pronto
Guarda instalada com diagnóstico transparente, fallback gracioso e telemetria ativa.
