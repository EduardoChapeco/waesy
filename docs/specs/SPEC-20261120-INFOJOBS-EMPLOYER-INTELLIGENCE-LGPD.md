# SPEC-20261120: Editor de Currículo Profissional, Vagas & Inteligência de Empregador (InfoJobs / Glassdoor-style com Privacidade LGPD)

**Status:** APROVADA E IMPLEMENTADA  
**Data:** 2026-11-20  
**Eixo:** Eixo 6 — Editor de Perfil Profissional, Currículo, Vagas & Inteligência de Empregador  

---

## 1. Visão Geral & Objetivos
Consolidar a jornada completa de empregabilidade e inteligência de mercado no Waesy (`/conta/curriculo`, `/empregos`, `/vagas`, `/u/:username`, `/membro/:id` e `/workspace/empregos`), garantindo:
1. Persistência idempotente de múltiplos currículos (`public.resumes`) sem colisão de chave única `(profile_id, slug)` após o primeiro autosave.
2. Isolamento multi-tenant Zero-Trust (anti-BOLA) em `listStoreJobApplications`, `updateJobApplication` e `hireJobCandidate`.
3. Coleta opcional, anônima e com consentimento explícito LGPD de remuneração, motivo de saída e avaliação de ambiente de trabalho em `public.employer_reviews`.
4. Proteção de privacidade por **k-anonimato** ($k \ge 3$ para exibição de média salarial pública; supressão de valores individuais e mascaramento de `user_id` em `public.v_public_employer_reviews`).

---

## 2. Requisitos Estruturados em Sintaxe EARS

### R1 — Persistência Idempotente de Currículos (`saveUserResume`)
- **WHEN** o candidato salva ou aciona autosave no Editor de Currículo (`/conta/curriculo`) com identificador sintético `"default-resume"` ou sem `id` prévio, **THE SYSTEM SHALL** executar `UPSERT` atômico em `public.resumes` com conflito em `(profile_id, slug)`, retornar o `resumeId` real gerado pelo banco e atualizar o estado ativo do cliente (`activeResumeId`) para evitar erro `23505` nos salvamentos subsequentes.

### R2 — Isolamento Multi-Tenant no ATS do Lojista (`jobs.functions.ts`)
- **WHEN** um recrutador ou gestor consulta candidaturas (`listStoreJobApplications`), atualiza status (`updateJobApplication`) ou admite um candidato (`hireJobCandidate`), **THE SYSTEM SHALL** validar a identidade do servidor via `assertStoreAccess(identity)` e impor que `jobs.store_id === identity.store_id`, rejeitando qualquer acesso cruzado entre lojas e bloqueando recontratação duplicada (`status === "hired"`).

### R3 — Consentimento Explícito LGPD e Anonimato Real (`employer_reviews`)
- **WHEN** um profissional informa salário (`salary_cents`), motivo de saída (`exit_reason`) ou avaliação de empresa anterior/atual no currículo ou candidatura, **THE SYSTEM SHALL** registrar `is_anonymous = true` por padrão, armazenar `consent_lgpd_accepted` e `consent_accepted_at`, e nunca expor `user_id` em consultas públicas quando `is_anonymous = true` (através da view `public.v_public_employer_reviews` e sanitização de DTO na BFF).

### R4 — Agregação Salarial com k-Anonimato ($k \ge 3$)
- **WHILE** uma empresa possuir menos de 3 amostras salariais independentes publicadas (`salary_samples_count < 3`), **THE SYSTEM SHALL** retornar `avgSalaryCents: null` (e `average_salary_cents: null`) em `getCompanyEmployerStats` e `getEmployerProfileInsights`, impedindo a inferência reversa do salário individual de um ex-colaborador.

---

## 3. Contrato de Dados & Camadas Auditadas

| Camada | Artefato | Responsabilidade |
| :--- | :--- | :--- |
| **Migration / RLS** | `supabase/migrations/20270622000000_holistic_zero_trust_views_storage_and_infojobs_lgpd.sql` | Colunas `consent_lgpd_accepted`, `consent_accepted_at`, `reason_for_leaving`; `FORCE ROW LEVEL SECURITY`; view `v_public_employer_reviews`. |
| **BFF Currículos** | `src/services/resumes.functions.ts` | Upsert idempotente em `public.resumes` (`onConflict: "profile_id,slug"`) + sincronização bilateral com `profiles.resume_data` e `syncEmployerReviewsForUser`. |
| **BFF Empregos / ATS** | `src/services/jobs.functions.ts` | Guardas Zero-Trust em `listStoreJobApplications`, `updateJobApplication`, `hireJobCandidate`; sanitização PostgREST e k-anonimato em `getEmployerProfileInsights`. |
| **BFF Perfil Social** | `src/services/social.functions.ts` | Filtro `.eq("status", "published")`, k-anonimato salarial ($k \ge 3$) e remoção de spread bruto em `getCompanyEmployerStats`. |
| **UI Editor Civil** | `src/routes/_store.conta.curriculo.tsx` | Hidratação do `savedRes.resumeId` após o primeiro save do currículo default e redirecionamento canônico de `/workspace/curriculo/editor`. |
