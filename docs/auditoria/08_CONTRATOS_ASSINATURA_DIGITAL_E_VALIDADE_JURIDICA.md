# 🏛️ Auditoria Forense — Dossiê 08: Contratos Inteligentes, Assinatura Eletrônica & Validade Jurídica

> **Conselho Executivo de BigTech & Red Team de Engenharia (Waesy Platform)**  
> **Escopo:** Módulo Completo de Contratos, Assinatura Digital Avançada (MP 2.200-2/2001 & Lei 14.063/2020), Posicionamento Visual de Tags, Autopreenchimento via OCR, Cofre Criptográfico SHA-256, Despacho Multi-Canal (WhatsApp/Link/E-mail) e Experiência Responsiva Apple HIG.  
> **Data:** 16 de Setembro de 2026 | Sistema Operacional: Waesy Platform v4.2

---

## 1. 📋 Diagnóstico dos 6 Pilares de Engenharia & Validade Jurídica

| Pilar | Legislação & Norma Vinculante | Estado Atual no Repositório | Veredito & Gravidade |
| :--- | :--- | :--- | :---: |
| **1. Validade Jurídica Nacional** | **MP 2.200-2/2001 (Art. 10, § 2º) & Lei 14.063/2020 (Assinatura Avançada):** Exigência de autoria inequívoca, integridade criptográfica (SHA-256), carimbo de tempo UTC e consentimento explícito. | Temos geração de hash SHA-256 em `contracts.functions.ts` e `travel-contract.functions.ts`. Falta a **Folha de Rosto / Protocolo de Assinaturas (Audit Trail Sheet)** compilada automaticamente na exportação do PDF. | **ALTA** |
| **2. Posicionamento Visual de Tags** | **Padrão Autentique / DocuSign:** Tags arrastáveis de assinatura, rubrica, nome, CPF e data sobre o canvas do documento, com modal de repetição ("Apenas nesta página", "Todas as páginas", "Todas exceto a última"). | Não existe interface gráfica de posicionamento de coordenadas `(x, y, page)` no Workspace. As assinaturas ficam apenas no rodapé estático. | **ALTA** |
| **3. Despacho Multi-Canal & Ordem** | **Canais de Envio & Sequenciamento:** Disparo de links por WhatsApp direto (+55), SMS, E-mail e Link Copiável, com suporte a "Sem ordem" vs "Com ordem" (fluxo sequencial) e Observadores. | O backend só persiste `signer_email` básico, sem suporte nativo a `signer_phone`, `dispatch_channel`, `signing_order` e `observers`. | **ALTA** |
| **4. OCR de Documentos & Preenchimento** | **Visão Computacional & Automação:** Extração de Passaportes, RG, CNH e Vouchers para preenchimento de contratantes/passageiros sem digitação manual. | O motor Gemini Vision já existe em `travel-lifecycle.functions.ts:964`, mas não está conectado ao criador genérico de contratos (`workspace.contratos.novo.tsx`). | **MÉDIA** |
| **5. Documentos Nativos para WhatsApp** | **Leitura Mobile Fluida:** Visualização de contrato sem pinch-to-zoom forçado em telas de 360-390px, com editor de texto estruturado e prévia Mobile/Desktop. | A visualização pública em `assinar.$token.tsx` e `_store.contrato.$token.tsx` funciona, mas falta a diferenciação entre documento A4 paginado e documento corrido otimizado para smartphone. | **MÉDIA** |
| **6. Ergonomia Apple HIG & Telemetria** | **Regras 10, 12, 13 e 15 (AGENTS.md):** Alvos de toque de 44px, zona do polegar, zero dead-space (`px-0 sm:px-4 md:px-0`), sem AI smell, biometria facial e geolocalização. | Biometria facial existe em `assinar.$token.tsx`, mas faltam metadados forenses granulares (resolução de tela, porta lógica, cidade/estado) na evidência. | **MÉDIA** |

---

## 2. 🔍 Análise Comparativa dos Fluxos Autentique (Screenshots Reais)

A análise minuciosa das 5 telas do sistema Autentique extrai com precisão cirúrgica a anatomia exigida pelo usuário:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ FLUXO INTEGRADO DE CRIAÇÃO, POSICIONAMENTO E ASSINATURA DE CONTRATOS                           │
├──────────────────────────┬──────────────────────────┬───────────────────────────────────────────┤
│ ETAPA 1: ORIGEM & PARTES │ ETAPA 2: POSICIONAMENTO  │ ETAPA 3: CONFIGURAÇÕES & COFRE            │
│ (Screenshots 4 e 5)      │ (Screenshots 1 e 2)      │ (Screenshot 3 + Validação Pública)        │
├──────────────────────────┼──────────────────────────┼───────────────────────────────────────────┤
│ • 3 Abas:                │ • Canvas do documento    │ • Nome do documento & Pasta               │
│   1. Enviar Arquivo      │ • Tags por signatário:   │ • Marcações de autenticação (Rodapé)      │
│   2. Modelos por Nicho   │   - [Assinatura]         │ • Observadores (recebem cópia sem assinar)│
│   3. Doc. para WhatsApp  │   - [Rubrica]            │ • Lembretes automáticos (a cada N dias)   │
│ • Ordem de Assinatura:   │   - [Nome] / [CPF]       │ • Selagem Criptográfica SHA-256           │
│   [Sem ordem] [Com ordem]│   - [Data da assinatura] │ • Geração de Link curto & WhatsApp        │
│ • Canais de envio:       │ • Modal "Repetir campo": │ • Folha de Rosto (Audit Trail Manifest)   │
│   Email / WhatsApp / Link│   ( ) Apenas nesta pág.  │ • QR Code com link de validação pública   │
│ • OCR de Documentos (IA) │   ( ) Todas as páginas   │   (/verify/document/:code)                │
│   Autopreenchimento CNH  │   ( ) Todas exceto últ.  │                                           │
└──────────────────────────┴──────────────────────────┴───────────────────────────────────────────┘
```

---

## 3. 🏛️ Matriz Forense de Tabelas, Schemas, Colunas & BFF

### 3.1. Extensões de Schema no Banco de Dados (`public`)

```sql
-- 1. Extensão da tabela public.contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dispatch_settings JSONB NOT NULL DEFAULT '{
    "signing_order": "parallel",
    "send_reminders": true,
    "reminder_days": 3,
    "auth_mark_position": "footer",
    "auth_mark_size": "standard",
    "force_signature_appearance": false,
    "delivery_channels": ["email", "whatsapp"]
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS observers JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_whatsapp_native BOOLEAN NOT NULL DEFAULT false;

-- 2. Extensão da tabela public.contract_versions
ALTER TABLE public.contract_versions
  ADD COLUMN IF NOT EXISTS signature_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_file_url TEXT,
  ADD COLUMN IF NOT EXISTS page_count INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS manifest_hash_sha256 TEXT;

-- 3. Extensão da tabela public.signature_envelopes
ALTER TABLE public.signature_envelopes
  ADD COLUMN IF NOT EXISTS signer_phone TEXT,
  ADD COLUMN IF NOT EXISTS signer_cpf TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_channel TEXT NOT NULL DEFAULT 'email'
    CHECK (dispatch_channel IN ('email', 'whatsapp', 'sms', 'direct_link')),
  ADD COLUMN IF NOT EXISTS signing_order_index INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS color_code TEXT NOT NULL DEFAULT '#2563eb',
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS require_facial_biometrics BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_cpf_confirmation BOOLEAN NOT NULL DEFAULT false;

-- 4. Extensão da tabela public.signature_evidence
ALTER TABLE public.signature_evidence
  ADD COLUMN IF NOT EXISTS screen_resolution TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS geo_latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS geo_longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS geo_city TEXT,
  ADD COLUMN IF NOT EXISTS geo_state TEXT,
  ADD COLUMN IF NOT EXISTS ntp_timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  ADD COLUMN IF NOT EXISTS facial_biometrics_hash TEXT;
```

---

## 4. 🚀 Plano Mestre de Implementação em Microfases REQ

### Fase 1: Fundação de Dados & Segurança (BFF & Banco de Dados)
- `[REQ-CONTRACT-01]` **Migration de Schema Criptográfico & Posicionamento:** Executar migration que adiciona `signature_fields`, `dispatch_settings`, `observers`, `signer_phone`, `signer_cpf`, `dispatch_channel`, `signing_order_index` e telemetria expandida.
- `[REQ-CONTRACT-02]` **BFF: Atualização e Selagem com Bounding Boxes:** Atualizar `createContract`, `updateContractVersion` e `sealAndIssueContract` em `src/services/contracts.functions.ts` com suporte rigoroso a Zod para caixas de assinatura e canais de entrega.
- `[REQ-CONTRACT-03]` **Motor de Despacho Multi-Canal (WhatsApp Direct Link & SMS):** Implementar gerador de mensagens e links diretos formatados para WhatsApp (`https://wa.me/55...?text=...`) e token individualizado por signatário.

### Fase 2: Gestão & Criação no Workspace (Desktop & Mobile)
- `[REQ-CONTRACT-04]` **Interface de Criação de 3 Modos (`workspace.contratos.novo.tsx`):**
  - Aba 1: Upload de Documento PDF/DOCX (Drag & Drop com preview de páginas).
  - Aba 2: Modelos Canônicos por Nicho (Turismo, Imóveis, Consignação, Honorários Advocatícios, TCLE Estética, Prestação de Serviços).
  - Aba 3: Documento Nativo para WhatsApp (Markdown/Rich Text com alternador de prévia Mobile/Desktop).
- `[REQ-CONTRACT-05]` **Configurador de Signatários & Sequenciamento:**
  - Toggle "Sem ordem" vs "Com ordem".
  - Seletor de canal por signatário (E-mail, WhatsApp com DDI +55, SMS, Link de assinatura).
  - Papel (Assinar, Testemunhar, Rubricar).
  - Opções: "Exigir CPF", "Exigir Selfie Facial".
  - Seção de Observadores (notificados com cópia assinada).
- `[REQ-CONTRACT-06]` **Canvas de Posicionamento Visual de Tags (`SignaturePositionerCanvas`):**
  - Painel com tags coloridas por signatário: `Assinatura`, `Rubrica`, `Nome`, `CPF`, `Data`, `Botão de Opção`.
  - Drag-and-drop ou clique para posicionar caixas com redimensionamento e coordenadas relativas `(x%, y%, w%, h%)`.
  - Modal "Repetir Campo" com as 3 opções: "Apenas nesta página", "Todas as páginas", "Todas exceto a última".
- `[REQ-CONTRACT-07]` **Painel de Configurações Adicionais:**
  - Nome do documento, seleção de pastas, aparência da autenticação eletrônica (rodapé/tamanho), lembretes automáticos e botão "Salvar como modelo".

### Fase 3: Inteligência Artificial, OCR & Preenchimento Automático
- `[REQ-CONTRACT-08]` **Integração do OCR de Documentos (Vision AI):**
  - Conectar o motor Gemini Vision em `travel-lifecycle.functions.ts` a uma nova função universal `extractDocumentDataForContract`.
  - Ler imagens de RG, CNH e Passaporte, extraindo nome, documento, validade, data de nascimento e endereço.
  - Preencher automaticamente as variáveis do contrato (`{{cliente_nome}}`, `{{cpf}}`, etc.) e os campos dos signatários sem digitação manual.

### Fase 4: Experiência do Signatário (Apple HIG Mobile WebView & Desktop)
- `[REQ-CONTRACT-09]` **WebView do Signatário Otimizada (`assinar.$token.tsx`):**
  - Layout limpo, 100% responsivo, sem termos técnicos prolixos.
  - Modo Mobile Nativo: visualização fluida com tamanho de fonte confortável (16px), sem necessidade de pinça/zoom, com barra fixa na Thumb Zone inferior.
  - Modo Desktop: leitor com visualizador lado a lado e zoom fluido.
- `[REQ-CONTRACT-10]` **Coleta de Telemetria Forense & Biometria:**
  - Captura transparente de IP, User-Agent, Resolução de tela, Fuso horário e Geolocalização (com consentimento).
  - Pad de assinatura tátil ultrassuave (SVG/Canvas em alta resolução) com opção de digitação cursiva legal.
  - Biometria facial opcional via câmera frontal com detecção de vivacidade e hash da selfie gravado no cofre.

### Fase 5: Validade Jurídica, Protocolo de Assinaturas & Validação Universal
- `[REQ-CONTRACT-11]` **Folha de Rosto / Protocolo de Autenticidade (Audit Trail Manifest):**
  - Compilação da página final de auditoria no PDF gerado (`exportElementAsPdf`).
  - Tabela com todos os signatários, carimbos UTC, IPs, hashes individuais e SHA-256 do documento.
  - Carimbo do Tempo e declaração de conformidade com a MP 2.200-2/2001 e Lei 14.063/2020.
- `[REQ-CONTRACT-12]` **QR Code Criptográfico Assinado:**
  - Inserção de QR Code dinâmico no rodapé de cada página e na folha de rosto, apontando para `/verify/document/:code`.
- `[REQ-CONTRACT-13]` **Página de Verificação Pública Refinada (`verify.document.$code.tsx`):**
  - Validação instantânea por código alfanumérico ou por hash SHA-256 de 64 caracteres.
  - Exibição limpa do status de integridade, signatários que assinaram, data/hora UTC e download do PDF autêntico original.

---

## 5. 🛡️ Garantias de Engenharia & Zero-Mock Mandate

1. **Persistência Total no Supabase:** Todo bounding box posicionado, todo signatário com WhatsApp e todo log de IP/Selfie é gravado nas tabelas reais do banco de dados. Zero toasts fictícios.
2. **Isolamento Multi-Tenant:** `store_id` e `creator_id` validados estritamente no BFF via sessão segura.
3. **Resiliência a Falhas:** Loaders com fallbacks defensivos para garantir ausência de erros em tempo de execução.
4. **Build 100% Limpo:** Compilação obrigatória com 0 erros via `npm run build`.
