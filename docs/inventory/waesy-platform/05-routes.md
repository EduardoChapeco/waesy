# 05 — Inventário Exaustivo de Rotas (443 Rotas Ativas)

As rotas da aplicação são organizadas hierarquicamente através do TanStack Router baseadas em arquivos em `src/routes/`.

## 1. Distribuição Geral das Rotas por Prefixo
- **Admin Master (`/admin-master/*`):** 38 rotas de governança global.
- **Workspace Empresarial (`/workspace/*`):** 189 rotas corporativas.
- **Vitrines & Experiência Pública (`_store.*`):** 165 rotas públicas.
- **Endpoints de API & Webhooks (`api.*`):** 26 rotas de backend.
- **Rotas Institucionais & Utilitárias:** 25 rotas (sitemaps, verificação, painel, viajante, etc.).
- **Total Ativo:** **443 rotas** (467 incluindo suítes de testes unitários de rota).

## 2. Relação Completa em Arquivo Estruturado
O mapeamento individual de cada uma das 443 rotas, com caminho relativo, layout utilizado, presença de loader assíncrono e serviços consumidos, está integralmente documentado em:
👉 [`routes.csv`](./routes.csv)
