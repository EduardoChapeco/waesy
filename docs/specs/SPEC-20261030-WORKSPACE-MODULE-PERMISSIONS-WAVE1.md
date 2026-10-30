# SPEC-20261030-WORKSPACE-MODULE-PERMISSIONS-WAVE1

## Objetivo
Aplicar no BFF as chaves de habilitação de módulos salvas em `workspace_role_permissions`.

## Requisitos EARS
- Quando um colaborador executar uma operação ERP, o BFF DEVE consultar a matriz do papel no tenant ativo antes da mutação.
- Quando a matriz declarar o módulo como desabilitado, a função DEVE rejeitar a operação sem tocar nos dados.
- Quando o papel for `owner` ou `admin`, a operação DEVE permanecer autorizada pelo bypass administrativo existente.
- Quando a matriz não declarar uma chave, a função DEVE preservar o comportamento vigente e permitir a operação mediante o guard de papel atual.
- Quando houver erro ao carregar a matriz, a função DEVE falhar fechada e não executar a mutação.

## Escopo
Operações de serviços ERP e emissão fiscal que já utilizam `assertStoreAccess`.

## Evidência
Testes focados das Server Functions, inspeção de diff e auditoria de contratos BFF.
