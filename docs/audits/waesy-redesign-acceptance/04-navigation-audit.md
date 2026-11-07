# 04 — Auditoria da Arquitetura de Informação e Navegação

## 1. Avaliação Estrutural da Sidebar do Workspace
- **Arquivo Analisado:** `src/components/workspace/workspace-shell.tsx` e `workspace-navigation.ts`.
- **Diagnóstico:** A sidebar possui colapsamento funcional e preservação de estado, porém apresenta a não-conformidade **NC-010**: exibe seções e itens de menu irrelevantes para o nicho da loja logada.
- **Evidência:** Uma loja do nicho `turismo` tem visíveis no menu módulos como "Mesas & Comandas" e "WMS Logístico", aumentando a carga cognitiva do operador.
- **Remediação Obrigatória:** Aplicar filtro obrigatório baseado em `getNicheManifest(store.niche_id)` antes de renderizar os grupos de navegação.

---

## 2. Avaliação da Barra Global de Topo (TopBar)
- **Arquivo Analisado:** `src/components/layout/TopBar.tsx` e `UtilityCluster.tsx`.
- **Conformidade com Invariante B.26:** O seletor de localização (`LocationMasterPill`), o campo de busca global e o gatilho de perfil compartilham a altura de 44px (`h-11 min-h-11`).
- **Conformidade com Invariante B.27:** O avatar civil é renderizado diretamente via tag `<img>` com fallback defensivo para inicial textual em caso de falha de carregamento.
