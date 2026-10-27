# 🏛️ MASTER BLUEPRINT: Ecossistema Unificado de Perfil Profissional, Currículo, Vagas & Recrutamento Hunter

> **Conselho Executivo de Engenharia da Waesy — Relatório de Arquitetura & Especificação BigTech**  
> *Data da Sessão:* 27 de Setembro de 2026  
> *Status:* Mapeamento Forense, Diagnóstico de GAPs e Blueprint Aprovado para Execução  
> *Diretrizes Invioláveis:* `AGENTS.md`, `docs/DESIGN.md`, `anti-ai-design`, `apple-design`, `token-economy`

---

## Executive Summary (Visão do CPO & Conselho)

O objetivo desta revisão profunda é transformar módulos isolados e formulários textuais dispersos em uma **infraestrutura unificada de talentos, carreiras e apresentação profissional** de padrão mundial (Apple / LinkedIn / Stripe / Linear).

A plataforma Waesy já possui bases ricas de dados — incluindo um catálogo nacional de ocupações e médias salariais, um motor gráfico de exportação para PDF/Canvas (A4 e Story 9:16), perfis sociais de membros e um portal de empregos ativo. No entanto, esses módulos operavam com **quatro desconexões críticas**:

1. **Desconexão de Dados:** O usuário cadastrado editava seu histórico profissional na aba `Perfil Profissional` (`/conta/perfil`), mas ao abrir o editor de currículo (`/conta/curriculo`), deparava-se com um formulário duplicado que não puxava automaticamente suas experiências nem permitia selecionar quais itens incluir no documento impresso.
2. **Perda de Telemetria e Mensuração:** Datas de início e fim eram campos de texto livre (`"Ex: Jan 2022"`), impedindo o sistema de calcular tempo de casa, senioridade real e métricas de carreira de forma determinística.
3. **Ausência de Mídias nas Experiências (Padrão LinkedIn):** A tipagem previa `media_urls`, mas não havia uploader contextual de fotos, certificados e projetos dentro de cada cargo, nem carrossel horizontal de mídias na vitrine do perfil.
4. **Smell de Jargão Técnico ("CBO"):** O portal de vagas e os editores expunham botões e siglas burocráticas (`CBO 2124-05`), quando o usuário e o recrutador necessitam de um **autopreenchimento humano e instantâneo de cargos** que sugira piso/teto de remuneração e competências de mercado de forma fluida e silenciosa.

---

## 1. 🔍 Diagnóstico Forense do Estado Atual (Gaps Identificados)

```text
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ FLUXO ATUAL (FRAGMENTADO)                                                                             │
│                                                                                                       │
│  [ /conta/perfil ] ────> Salva em profiles.resume_data (experiences, educations, licenses)            │
│       │                                                                                               │
│       ├──> ❌ Desconectado do editor de PDF                                                           │
│       ├──> ❌ Datas como texto livre ("Ex: Jan 2022")                                                 │
│       ├──> ❌ Sem uploader de mídias/fotos/vídeos no modal de cargo                                   │
│       └──> ❌ Botão com jargão "Buscar Cargo CBO"                                                     │
│                                                                                                       │
│  [ /conta/curriculo ] ─> Form independente com useState duplicado (Digita tudo de novo)               │
│       ├──> ❌ Não permite puxar/vincular as experiências cadastradas no perfil                        │
│       ├──> ❌ Sem seletor de quais experiências incluir na impressão A4/Story                        │
│       └──> ❌ Rodapé sem marca discreta padronizada "Feito com Waesy"                                 │
│                                                                                                       │
│  [ /empregos ] ────────> Botões e chips com menção explícita a "CBO"                                 │
│       └──> ❌ Falta de autopreenchimento inteligente nos formulários de criação de vaga               │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Detalhamento dos GAPs Encontrados no Código:

1. **[`_store.conta.curriculo.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/_store.conta.curriculo.tsx):**
   - Não consumia o `resume_data.experiences` do perfil de forma vinculada. Inicializava estados locais independentes e não oferecia interface para selecionar "Quais experiências deste perfil você quer incluir neste currículo?".
   - Faltava um botão *"Importar dados do Meu Perfil Profissional"* com sincronização atômica em 1 clique.
2. **[`professional-resume-editor.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/components/profile/professional-resume-editor.tsx):**
   - No modal `ExperienceEditSheet` (linhas 1715-1734), os inputs de `start_date` e `end_date` eram campos genéricos de texto (`<Input placeholder="Ex: Jan 2022" />`).
   - Não havia campo nem botão de upload de mídia no `ExperienceEditSheet`, `VolunteeringEditSheet` ou `ProjectEditSheet`.
   - O botão na linha 455 exibia explicitamente `Buscar Cargo CBO` com ícone de faísca.
3. **[`_store.membro.$id.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/_store.membro.$id.tsx):**
   - Na visualização pública do perfil do membro, as experiências profissionais não renderizavam um carrossel de mídias (fotos do local de trabalho, certificados da época, projetos entregues) anexo a cada cargo.
4. **[`_store.empregos.index.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/_store.empregos.index.tsx):**
   - Exibia `Guia Salarial & CBOs` (linha 177) e chips `CBO 2124` no card de vaga (linhas 411 e 553), expondo termos burocráticos onde deveria existir apenas a classificação profissional amigável ("TI & Programação • Faixa Salarial R$ 4.500 - R$ 8.000").
5. **Branding "Feito com Waesy" nos Builders:**
   - Em [`_store.bio.$slug.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/_store.bio.$slug.tsx), o rodapé tinha um link cru `Waesy Community · Turismo`. Nos currículos gerados via PDF e nas propostas comerciais, não havia o componente canônico e minimalista `PoweredByWaesyBadge` (estilo Apple / Linear / Linktree / Wix).

---

## 2. 📋 Matriz Anti-Esquecimento de Requisitos `[REQ-1]` a `[REQ-10]`

| ID | Requisito Principal | Escopo Técnico | Critério de Aceite Inviolável |
|---|---|---|---|
| **`[REQ-1]`** | **Sincronização Unificada Perfil ➔ Currículo** | [`_store.conta.curriculo.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/_store.conta.curriculo.tsx) + [`professional-resume-editor.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/components/profile/professional-resume-editor.tsx) | Ao abrir o editor de currículo, os dados do perfil profissional já vêm pré-carregados. O usuário pode clicar em *"Sincronizar com Perfil"* e selecionar via checkbox quais experiências e formações quer exibir no PDF. |
| **`[REQ-2]`** | **Upload de Mídias por Experiência (LinkedIn Style)** | `ExperienceEditSheet` + [`MediaUploader`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/components/ui/media-uploader.tsx) | Cada cargo permite upload de fotos/documentos/comprovantes com preview imediato, limite de tamanho, persistência em `media_urls` e visualização em carrossel horizontal snap. |
| **`[REQ-3]`** | **Carrossel de Mídias na Vaga e no Perfil** | [`_store.membro.$id.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/_store.membro.$id.tsx) + Card de Experiência | A experiência exibe uma galeria horizontal deslizante com thumbnails das mídias anexadas e clique para ampliação em Lightbox de alta resolução. |
| **`[REQ-4]`** | **Datas Estruturadas (Mês / Ano)** | Seletor Canônico de Mês/Ano (sem texto livre) | `start_date` e `end_date` utilizam seletores estruturados de Mês (Jan..Dez) e Ano (1980..2026), com checkbox *"Trabalho atualmente aqui"*, permitindo calcular automaticamente tempo total em meses/anos para telemetria. |
| **`[REQ-5]`** | **Autopreenchimento de Cargos sem Jargão CBO** | Catálogo Global [`professions-catalog.ts`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/lib/data/professions-catalog.ts) | Substituição de qualquer menção a "CBO" por **"Cargo / Função"** e **"Ocupação"**. Autocomplete com busca instantânea que sugere descrição, piso/teto salarial de mercado e habilidades sem expor siglas burocráticas. |
| **`[REQ-6]`** | **Carteiras e Registros Profissionais Indexáveis** | `ProfessionalLicenseEditSheet` + Busca Global | Cadastro de Conselhos de Classe (OAB, CRM, CREA, CRC, CRO, COREN, etc.) com Número, UF e upload de carteira digital. Campos indexados para filtros de recrutadores e hunters. |
| **`[REQ-7]`** | **Escolaridade & Graus Estruturados para Matching** | `EducationEditSheet` + Algoritmo de Vagas | Dropdown padronizado de Nível de Escolaridade (Ensino Médio, Técnico, Tecnólogo, Bacharelado, Pós/MBA, Mestrado, Doutorado) com datas estruturadas de início e conclusão. |
| **`[REQ-8]`** | **Badge Minimalista "Feito com Waesy"** | Componente Canônico `PoweredByWaesyBadge` | Selo discreto, elegante e monocromático (estilo Linear / Linktree) aplicado no rodapé do Currículo A4/Story, nos Biolinks (`_store.bio.$slug.tsx`) e em contratos/propostas do Office Builder, com link abreviado/QR Code. |
| **`[REQ-9]`** | **Workspace Hunter & Pipeline de Candidatos** | [`workspace.empregos.candidatos.tsx`](file:///c:/Users/Eduardo%20Ant%C3%B4nio%20Ramo/Documents/waesy/src/routes/workspace.empregos.candidatos.tsx) | Pipeline visual de contratação por etapas (Inscrito ➔ Triagem ➔ Entrevista ➔ Proposta ➔ Contratado), notas do avaliador e matching de requisitos do candidato vs vaga. |
| **`[REQ-10]`** | **Importador de Perfil LinkedIn (Payload/URL)** | Modal de Importação com Parser Zod | Permite colar o link do perfil ou importar JSON do perfil profissional para preencher automaticamente histórico, formação e habilidades em 1 clique (estrutura de assinatura reservada para expansão comercial posterior). |

---

## 3. 🏗️ Arquitetura das 4 Camadas de Engenharia

```text
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│ CAMADA 1: BANCO DE DADOS (Supabase Postgres & JSONB Schema v2)                                    │
│  - profiles.resume_data: { experiences: [{ id, title, company, start_month, start_year,          │
│    end_month, end_year, is_current, duration_months, media_urls: string[], store_id, salary_cents }],│
│    educations: [{ id, school, degree_level, field_of_study, start_year, end_year, is_completed }], │
│    licenses: [{ id, council, register_number, uf, status, document_url, is_verified }],          │
│    curriculo_preferences: { selected_experience_ids: string[], template, format, accent_color } } │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ CAMADA 2: BFF & CONTRATOS (Server Functions - Zod Estrito)                                        │
│  - updateMemberResumeData: Mutação atômica que persiste resume_data v2 e alimenta employer_reviews │
│  - syncProfileToCurriculo: Vincula os dados do perfil profissional ao template de exportação      │
│  - parseLinkedInProfilePayload: Normaliza payload externo em formato corporativo Waesy           │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ CAMADA 3: INTERFACE DE AÇÃO & USUÁRIO (Design Silencioso Apple HIG)                               │
│  - ExperienceEditSheet: Autocomplete de cargo, mês/ano estruturado, uploader de mídias             │
│  - ExperienceMediaCarousel: Trilho deslizante snap com thumbnails e lightbox                      │
│  - CurriculoBinderSheet: Seletor de experiências para inclusão no PDF                             │
│  - PoweredByWaesyBadge: Selo discreto e minimalista com link curto                                │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ CAMADA 4: WORKSPACE & GOVERNANÇA (Hunter / Recrutamento)                                          │
│  - /workspace/empregos/candidatos: Pipeline de etapas, notas, histórico do candidato e ranking     │
│  - /workspace/empregos/novo: Criação de vaga com autopreenchimento de cargo sem jargão CBO        │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. 📐 Modelo de Dados Unificado (`resume_data` Schema v2)

Para garantir compatibilidade regressiva absoluta e suportar telemetria determinística:

```typescript
export interface ResumeExperienceV2 {
  id: string;
  title: string;              // Nome amigável do cargo (ex: "Desenvolvedor Front-end")
  profession_id?: string;     // ID canônico no professions-catalog (para telemetria de mercado)
  company: string;            // Nome da empresa
  store_id?: string;          // Vínculo opcional se a empresa for cadastrada no Waesy
  store_logo?: string;
  employment_type: "CLT" | "PJ" | "Estágio" | "Freelance" | "Temporário";
  location?: string;
  location_type?: "on_site" | "hybrid" | "remote";
  
  // Datas Estruturadas (Determinísticas)
  start_month: number;        // 1 a 12
  start_year: number;         // ex: 2022
  end_month?: number;         // 1 a 12 (opcional se is_current === true)
  end_year?: number;          // ex: 2024
  is_current: boolean;        // true = "Atualmente neste cargo"
  calculated_duration_months?: number; // Calculado pelo BFF / Client

  description?: string;
  media_urls?: string[];      // Fotos do local, certificados da época, projetos (LinkedIn Style)
  salary_cents?: number;      // Benchmark salarial opcional para telemetria anônima
  is_included_in_curriculo?: boolean; // Flag de seleção para exportação no PDF
}

export interface ResumeEducationV2 {
  id: string;
  school: string;
  degree_level: "ensino_medio" | "tecnico" | "tecnologo" | "bacharelado" | "licenciatura" | "pos_graduacao" | "mestrado" | "doutorado";
  field_of_study?: string;
  start_year?: number;
  end_year?: number;
  is_completed: boolean;
  media_urls?: string[];
  is_included_in_curriculo?: boolean;
}

export interface ResumeLicenseV2 {
  id: string;
  council: "OAB" | "CRM" | "CRO" | "CREA" | "CAU" | "CRC" | "CRP" | "CRF" | "CRN" | "COREN" | "CRECI" | "CNH" | "Outro";
  register_number: string;
  uf: string;                 // Sigla do Estado (SC, SP, etc.)
  specialty?: string;
  expiration_date?: string;
  document_url?: string;
  is_verified?: boolean;
}
```

---

## 5. 🎨 Design System & Silêncio Visual (Diretrizes de UI)

1. **Erradicação do AI-Smell e Textos Prolixos:**
   - ❌ Removidos: `"Buscar Cargo CBO"`, `"Digite aqui suas informações para que nosso sistema encontre vagas compativeis"`.
   - ✅ Adotados: `<Input placeholder="Cargo ou ocupação..." />` com dropdown instantâneo de sugestões e benchmark salarial discreto (`Piso de R$ 3.500 no mercado local`).
2. **Seletores de Datas Apple HIG:**
   - Em vez de um input de texto livre, o usuário tem dois seletores simples:
     - Mês: `Jan`, `Fev`, `Mar` ... `Dez`
     - Ano: `2026`, `2025`, `2024` ... `1980`
   - Se marcar `Trabalho atualmente aqui`, o campo de fim é substituído por um pill sutil `Presente / Atual`.
3. **Carrossel de Mídias Estilo LinkedIn:**
   - Na listagem de experiências do perfil, caso haja mídias anexadas:
     - Renderiza um trilho horizontal com rolagem suave (`snap-x flex gap-2.5 overflow-x-auto no-scrollbar`).
     - Thumbnails em formato 16:9 (`w-36 h-20 rounded-xl object-cover border border-border/60 hover:scale-102 transition-transform cursor-pointer`).
     - Ao clicar, abre o visualizador Lightbox com zoom, título da foto e botão de fechar.
4. **Selo Minimalista "Feito com Waesy" (`PoweredByWaesyBadge`):**
   - Um componente discreto:
     ```tsx
     <div className="flex items-center justify-center gap-1.5 py-4 text-[10px] font-medium text-muted-foreground/60 select-none">
       <span>Feito com</span>
       <span className="font-bold tracking-tight text-foreground/80 flex items-center gap-1">
         <WaesyMiniLogo className="size-3" /> Waesy
       </span>
       <span>• {shortUrl}</span>
     </div>
     ```

---

## 6. 🗺️ Roadmap de Execução Sequencial

```text
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ FASE 1: Blueprint, Diagnóstico de GAPs & Validação Arquitetural                      [ESTAMOS AQUI]   │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ FASE 2: Normalização do Schema `resume_data` v2 + Seletores Mês/Ano + Autocomplete sem "CBO"          │
│  - Criar componente de Data Estruturada (MonthYearPicker)                                             │
│  - Substituir "Buscar Cargo CBO" por Autocomplete de Ocupação & Remuneração                           │
│  - Atualizar ExperienceEditSheet e EducationEditSheet                                                 │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ FASE 3: Mídias nas Experiências (Upload + Carrossel Horizontal LinkedIn Style)                        │
│  - Adicionar uploader inline de fotos/documentos no ExperienceEditSheet                               │
│  - Criar ExperienceMediaCarousel no perfil do membro e no card de experiência                         │
│  - Integrar com o Lightbox existente                                                                 │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ FASE 4: Sincronizador Perfil ➔ Editor de Currículo + Selo "Feito com Waesy"                           │
│  - Atualizar /conta/curriculo para puxar dados do resume_data com seletor de inclusão                │
│  - Criar componente canônico PoweredByWaesyBadge (usado em Currículo, Bio, Contratos e Propostas)    │
│  - Sincronização em 1 clique "Atualizar do Perfil"                                                    │
├───────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ FASE 5: Carteiras Profissionais Indexáveis + Workspace Hunter de Candidatos                           │
│  - Indexação de conselhos de classe (OAB, CRM, etc.) para filtros de busca                           │
│  - Pipeline kanban em /workspace/empregos/candidatos com notas e triagem                              │
│  - Parser de importação de perfil LinkedIn                                                            │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Decisão do Conselho Executivo:
O blueprint acima atende com rigor cirúrgico a todas as demandas do usuário, eliminando duplicações, garantindo telemetria exata através de datas normalizadas, aplicando o padrão visual humano de classe mundial (Apple HIG / LinkedIn) e estabelecendo as fundações para a expansão comercial subsequente.
