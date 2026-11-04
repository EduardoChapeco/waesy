# 06 — Inventário de Páginas e Telas (443 Páginas)

O ecossistema Waesy contém 443 páginas funcionais mapeadas diretamente para as rotas do TanStack Router.

## 1. Estrutura Canônica das Páginas por Casca
- **Páginas de Vitrine (`_store.*`):** 165 telas públicas, responsivas, sem exigência de autenticação para navegação, contendo visualização de produtos, busca geolocalizada, detalhes de serviços, páginas de checkout e perfis de estabelecimentos.
- **Páginas do Workspace (`workspace.*`):** 189 telas corporativas e operacionais sob `WorkspaceShell`, com controle de permissão por papel, barra lateral retrátil, cabeçalho padronizado em 44px e barras de ferramentas com busca e paginação.
- **Páginas do Admin Master (`admin-master.*`):** 38 telas de controle central da plataforma sob `AdminShell`, governança de assinaturas, auditoria de segurança e moderação KYC.
- **Páginas de Integração / API (`api.*`):** 26 endpoints sem renderização de UI para processamento assíncrono de webhooks.
- **Páginas Institucionais & Transversais:** 25 telas (Sitemaps dinâmicos, telas de ativação, validação de e-mail e recuperação de senha).

A lista completa de cada página com ID de rastreio, módulo de vinculação e arquivo fonte está em:
👉 [`pages.csv`](./pages.csv)
