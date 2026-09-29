# 00-superficie.md — Superfície Operacional do Módulo de Marca

| Dimensão | Especificação Canônica |
| :--- | :--- |
| **Módulo** | Marca, Identidade Empresarial & Multi-Tenancy |
| **Documentação Fonte** | `docs/marca/ATIVOS.md`, `docs/marca/NICHOS.md` |
| **Data da Auditoria** | 2026-09-29 |

---

## 1. Inventário de Rotas

| Rota | Arquivo Fonte | Guarda / Autenticação | Papel Exigido | Finalidade |
| :--- | :--- | :--- | :--- | :--- |
| `/criar-negocio` | `src/routes/_store.criar-negocio.tsx` | Sessão ativa via `getUserSession` | Qualquer usuário logado | Wizard híbrido (Expresso 1-tela ou Completo 6-etapas) |
| `/criar-negocio/avancado` | `src/routes/_store.criar-negocio.avancado.tsx` | Sessão ativa via `getUserSession` | Qualquer usuário logado | Assistente avançado com geolocalização e raio de entrega |
| `/workspace` | `src/routes/workspace.tsx` | `getUserSession` + `hasStore` | Membro da loja (`owner`, `admin`, `staff`) | Shell operacional, alternador de lojas e visão executiva |
| `/workspace/lojas` | `src/routes/workspace.lojas.index.tsx` | `assertStoreAccess` | Membro/Owner | Gestão de multi-lojas, filiais e alternância rápida |
| `/workspace/marketing/brand-kit` | `src/routes/workspace.marketing.brand-kit.tsx` | `assertStoreAccess` | Owner/Manager | Download de logos, paleta cromática e ativos da marca |
| `/conta/empresa` | `src/routes/_store.conta.empresa.tsx` | `getUserSession` | Owner da empresa | Mini-painel web de leads, WhatsApp e catálogo |
| `/conta/perfil` | `src/routes/_store.conta.perfil.tsx` | `getUserSession` | Usuário logado | Gestão de identidade civil e upload de avatar/capa pessoal |

---

## 2. Telas & Assistentes de Criação

1. **Modo Expresso (`FastCompanyOnboarding.tsx`):**
   - Entrada única de 1 minuto: Nome Fantasia, Segmento, WhatsApp comercial, Cidade/UF, Endereço e Logotipo/Capa.
   - Enriquecimento nativo via motor CNPJ (Razão Social, CNAE, endereço e sócios).
   - Conclusão direta com provisionamento atômico em `organizations`, `stores`, `workspace_members` e `directory_listings`.
2. **Modo Completo (`_store.criar-negocio.tsx` - 6 Etapas):**
   - **Etapa 1 — Nicho:** Seleção estruturada entre 17 verticais de negócio.
   - **Etapa 2 — Identificação:** Nome, CNPJ/CPF, WhatsApp, e-mail e picker de mapa com raio de atendimento.
   - **Etapa 3 — Identidade Visual:** Upload de Logo (`1:1`) e Capa/Banner (`21:9`).
   - **Etapa 4 — Operação:** Horários de funcionamento (semanal) e zonas/taxas de entrega por bairro.
   - **Etapa 5 — Documentos:** Upload de documentos KYC e alvarás fiscais em bucket seguro.
   - **Etapa 6 — Equipe:** Convite imediato de colaboradores com atribuição de papéis (`manager`, `seller`, `finance`).

---

## 3. Tabelas de Persistência

| Tabela | Chave Primária | Colunas Críticas | Relacionamento |
| :--- | :--- | :--- | :--- |
| `organizations` | `id` (uuid) | `name`, `slug`, `cnpj`, `status` | 1:N com `stores` |
| `stores` | `id` (uuid) | `organization_id`, `name`, `slug`, `cnpj`, `city`, `state`, `address`, `phone`, `logo_url`, `settings` | 1:N com `workspace_members` |
| `workspace_members` | `id` (uuid) | `profile_id`, `store_id`, `role`, `created_at` | Vínculo canônico RBAC |
| `profiles` | `id` (uuid) | `full_name`, `username`, `avatar_url`, `cover_url`, `role`, `store_id` | Identidade civil do operador |
| `theme_settings` | `id` (uuid) | `store_id`, `logo_url`, `banner_url`, `favicon_url` | 1:1 com `stores` |
| `directory_listings` | `id` (uuid) | `store_id`, `category`, `business_name`, `city`, `state`, `status` | Espelho público no Guia Comercial |
| `audit_logs` | `id` (uuid) | `store_id`, `user_id`, `action`, `payload_snapshot` | Trilha imutável de auditoria |

---

## 4. Funções BFF (Server Functions)

| Função | Arquivo Fonte | Método | Validação Zod | Descrição |
| :--- | :--- | :--- | :--- | :--- |
| `provisionBusiness` | `src/services/onboarding.functions.ts` | POST | `ProvisionBusinessSchema` | Criação completa com 6 etapas, carteira de tokens e categorias iniciais |
| `fastRegisterCompany` | `src/services/company-mvp.functions.ts` | POST | `FastRegisterCompanySchema` | Registro rápido com enriquecimento CNPJ e cookies de tenant |
| `createBusinessProfile` | `src/services/identity.functions.ts` | POST | Zod Object (`name`, `type`, `document`) | Criação básica de organização e loja com cookie de tenant |
| `setTenantContext` | `src/services/identity.functions.ts` | POST | Zod Object (`store_id`) | Alternância e persistência de tenant ativo via cookie |
| `uploadStoreMedia` | `src/services/storage.functions.ts` | POST | Zod Object (`fileName`, `fileType`, `base64Data`, `bucket`) | Upload direto com auto-healing de bucket para lojas |
| `uploadProfileMediaDirect`| `src/services/storage.functions.ts` | POST | Zod Object (`base64Data`, `target`) | Upload atômico para avatar e capa pessoal/criador |
| `getSignedUploadUrl` | `src/services/storage.functions.ts` | POST | Zod Object (`fileName`, `bucket`, `contentType`) | Geração de signed URL com limitação de taxa e verificação MIME |

---

## 5. Buckets de Armazenamento

| Bucket | Tipo | Limite | MIME Types | Finalidade |
| :--- | :--- | :--- | :--- | :--- |
| `store-assets` | Público | 10 MB | WebP, PNG, SVG | Logos e ícones de lojas |
| `banners` | Público | 10 MB | WebP, PNG, JPEG | Capas panorâmicas (`21:9`) de perfil e loja |
| `avatars` | Público | 5 MB | WebP, PNG, SVG | Fotos de perfil civil e avatares |
| `cms-media` | Público | 25 MB | WebP, PNG, JPEG, PDF | Ativos institucionais e documentos gerais |
| `brand-assets` | Público | 10 MB | WebP, PNG, SVG | Lockups horizontais (`4:1`) e materiais gráficos |
| `post-media` | Público | 100 MB | WebP, JPEG, MP4, WebM | Mídias de feed social e mural |
| `classifieds` | Público | 12 MB | WebP, JPEG, PNG | Fotos de anúncios, imóveis e veículos |
| `legal-documents` | Privado | 10 MB | PDF, DOCX, JPEG | Contratos, alvarás, CNH e documentos KYC |
