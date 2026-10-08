

## Continuação executada — Onda 5: Builder CMS modular

Foi auditado o contrato entre `src/lib/builder/builder-registry.ts`, `BuilderInspector`, `ExperienceRenderer` e os painéis CMS. O primeiro gap real encontrado foi o manifesto `office_contract_viewer`: ele estava descrito no registry e disponível no componente visual, mas não estava conectado ao `componentMap` canônico do renderer. Em produção isso resultava em bloco vazio/fallback silencioso fora do modo de edição.

Entregas desta etapa:

- conexão de `office_contract_viewer` ao `ExperienceRenderer`;
- exportação da cobertura efetiva do renderer e dos aliases estruturais;
- novo gate que compara automaticamente todos os manifests do registry com structural handlers, aliases e componentes leaf;
- cobertura dos blocos Omni preservada no mesmo contrato;
- detecção preventiva de novos blocos órfãos antes da publicação.

**Validação incremental:** renderer + contratos Studio: 6 testes aprovados; typecheck e `git diff --check` passaram. O próximo incremento da Onda 5 deve evoluir esse gate para validar também schemas/defaultProps e registrar a versão do contrato no CMS.
