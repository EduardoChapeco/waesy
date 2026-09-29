# 05-buckets.md — Auditoria de Armazenamento, Políticas RLS & Convenção de Caminhos

| Dimensão | Especificação Canônica |
| :--- | :--- |
| **Referência de Protocolo** | `.agents/skills/storage-audit/SKILL.md` (Verificações F1 a F8) |
| **Infraestrutura** | Supabase Storage (S3-compatible) + CDN Cloudflare |
| **Serviço Central** | `src/services/storage.functions.ts` |

---

## 1. Inventário de Buckets & Políticas de Acesso

| Nome do Bucket | Visibilidade | Limite de Tamanho | Operações Permitidas | Formatos Aceitos |
| :--- | :--- | :--- | :--- | :--- |
| `store-assets` | Público | 10 MB | INSERT (Autenticado), SELECT (Público), DELETE (Owner) | WebP, PNG, SVG |
| `banners` | Público | 10 MB | INSERT (Autenticado), SELECT (Público), DELETE (Owner) | WebP, PNG, JPEG |
| `avatars` | Público | 5 MB | INSERT (Autenticado), SELECT (Público), DELETE (Owner) | WebP, PNG, SVG |
| `cms-media` | Público | 25 MB | INSERT (Autenticado), SELECT (Público), DELETE (Staff/Admin) | WebP, PNG, JPEG, PDF |
| `brand-assets` | Público | 10 MB | INSERT (Admin), SELECT (Público), DELETE (Admin) | WebP, PNG, SVG |
| `post-media` | Público | 100 MB | INSERT (Autenticado), SELECT (Público), DELETE (Autor) | WebP, JPEG, MP4, WebM |
| `classifieds` | Público | 12 MB | INSERT (Autenticado), SELECT (Público), DELETE (Anunciante) | WebP, PNG, JPEG |
| `product-media` | Público | 10 MB | INSERT (Staff/Owner), SELECT (Público), DELETE (Staff) | WebP, PNG, JPEG |
| `destination-media` | Público | 25 MB | INSERT (Admin/Agência), SELECT (Público), DELETE (Admin) | WebP, PNG, JPEG |
| `legal-documents` | **Privado** | 10 MB | INSERT (Owner), SELECT (Owner / Master Admin), DELETE (Nenhum) | PDF, DOCX, JPEG |
| `receipts` | **Privado** | 5 MB | INSERT (Servidor/Sistema), SELECT (Comprador/Vendedor) | PDF, PNG, JPEG |
| `identity-vault` | **Privado** | 10 MB | INSERT (Autenticado KYC), SELECT (Master Admin Auditor) | PDF, JPEG |

---

## 2. Verificação das 8 Diretrizes de Storage (F1 a F8)

- **F1 — Referência Órfã:** 100% dos buckets invocados no código constam na lista canônica e contam com rotina de auto-healing em tempo de execução via `getServerClient().storage.createBucket`.
- **F2 — Bucket Morto:** Não há buckets zumbis; todos os 12 buckets mapeados possuem componentes ou fluxos ativos consumidores.
- **F3 — Política por Operação:** Acesso público delimitado rigorosamente ao `SELECT` de arquivos estáticos. Mutações (`INSERT`, `UPDATE`, `DELETE`) bloqueadas contra escrita anônima via RLS e token de sessão SSR.
- **F4 — Convenção Canônica de Caminho:**
  - Padrão estrutural: `{tipo-dono}/{id-dono}/{tipo-ativo}/{timestamp}_{hash}.{ext}`
  - Exemplos auditados:
    - Logo de loja: `stores/{store_id}/logo/{timestamp}_{hash}.webp`
    - Capa de loja: `stores/{store_id}/cover/{timestamp}_{hash}.webp`
    - Documento de compliance: `stores/{store_id}/compliance/{timestamp}_{hash}.pdf`
- **F5 — Limites e Tipos:** Validação rigorosa centralizada em `validateMimeType` antes de qualquer alocação de buffer ou assinatura de URL.
- **F6 — Visibilidade Segregada:** Documentos contratuais e comprovantes fiscais são mantidos exclusivamente em buckets privados com acesso auditado.
- **F7 — Forma de Acesso:** URLs armazenadas em colunas de banco de dados são links públicos permanentes gerados por `getPublicUrl`, nunca tokens assinados efêmeros que expiram após horas.
- **F8 — Órfãos Cruzados:** Ao atualizar foto de perfil ou logotipo, a nova URL substitui atomicamente o campo da tabela e gera log no ledger.
