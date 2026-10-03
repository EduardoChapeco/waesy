# SPEC-AUDIT-FORENSIC-SANEAMENTO-GERAL.md — Especificação e Plano Mestre de Saneamento Forense

## 1. Contexto e Motivação
Auditoria forense profunda no ecossistema Waesy identificou gaps estruturais:
1. Presença de dados sintéticos e 58 ocorrências de mocks Unsplash em rotas de vitrine e workspace.
2. Motores de IA com quebra de timeout (8s no Gemini), modelo inválido no failover Groq (`qwen/qwen3.8-27b` excedendo tokens e `gemini-*` gerando 404 e desativando chaves).
3. Pipeline de onboarding descartando prints reais em texto sem processar no Vision Multimodal do Gemini.
4. Restrição de chave estrangeira `store_id NOT NULL` em `lead_forms` e `lead_form_submissions`, impedindo usuários civis de capturar leads nos classificados.
5. Necessidade de equalização completa entre formulários do catálogo do Workspace e anúncios dos Classificados com zero duplicações.

---

## 2. Requisitos em Sintaxe EARS

### Onda 1: Erradicação de Mocks e Dados Sintéticos
- **REQ-EARS-01 (Receitas)**: QUANDO um usuário acessar `/receitas` ou `/receitas/:id`, O SISTEMA DEVE renderizar dados reais do banco ou empty state editorial canônico com ícone temático, NUNCA utilizando URLs da Unsplash.
- **REQ-EARS-02 (Doações & Campanhas)**: QUANDO um usuário acessar `/doacoes`, O SISTEMA DEVE buscar campanhas reais da tabela `solidarity_campaigns` ou exibir empty state canônico de ausência de campanhas, NUNCA mock data com fotos sintéticas.
- **REQ-EARS-03 (Eventos & Turismo)**: QUANDO eventos ou propostas turísticas forem renderizados sem capa, O SISTEMA DEVE exibir placeholder geométrico com tokens canônicos, NUNCA fallback para Unsplash.
- **REQ-EARS-04 (Marketing & Studio)**: QUANDO os módulos de Studio e Redes Sociais do Workspace forem abertos sem arte prévia, O SISTEMA DEVE carregar o logotipo/banner real da loja ou tela neutra com dropzone de upload.

### Onda 2: Saneamento e Ativação Real dos Motores de IA
- **REQ-EARS-05 (Higienização do Orquestrador)**: QUANDO `executeUnifiedAiCall` despachar chamadas para Groq, O SISTEMA DEVE mapear qualquer modelo de outro provedor para `llama-3.3-70b-versatile` ou `llama-3.1-8b-instant`, NUNCA enviando nomes de modelos Gemini/OpenAI para o Groq.
- **REQ-EARS-06 (Resiliência de Timeout)**: QUANDO chamadas forem feitas ao Gemini ou Groq, O SISTEMA DEVE aplicar timeout de no mínimo 30s para Gemini e 20s para Groq, evitando abortos prematuros.
- **REQ-EARS-07 (Multimodal Vision no Onboarding)**: QUANDO um print for capturado via Steel.dev durante o onboarding de empresa, O SISTEMA DEVE fazer download da imagem e injetá-la como payload visual no Gemini Vision para extração real de paleta de cores, tipografia, logotipo e conteúdo visual.
- **REQ-EARS-08 (Memória de Marca & Brand Kit)**: QUANDO a extração do onboarding for concluída, O SISTEMA DEVE persistir os resultados estruturados em `brand_kits`, `brand_dna_profiles` e `ai_memory_layers` vinculados ao tenant.

### Onda 3: Formulários de Leads e SDR IA nos Classificados
- **REQ-EARS-09 (Suporte Civil a Formulários de Leads)**: QUANDO um usuário pessoa física (sem loja) criar ou ativar formulário de lead em anúncio de classificados, O SISTEMA DEVE permitir persistência com `store_id NULL` e `author_profile_id` preenchido.
- **REQ-EARS-10 (Transferência de Lead para Chat com SDR)**: QUANDO um interessado submeter o formulário de lead no anúncio dos classificados, O SISTEMA DEVE persistir a submissão, abrir a thread de chat com o anunciante e disparar o bot SDR IA com o contexto completo das respostas coletadas.
- **REQ-EARS-11 (Autopreenchimento de Perfil)**: QUANDO o lead estiver autenticado na plataforma, O SISTEMA DEVE autopreencher nome, email e WhatsApp nos formulários de contato.

### Onda 4: Equalização de Catálogo Workspace vs. Classificados
- **REQ-EARS-12 (Consumo de Insumos em Serviços)**: QUANDO uma ordem de serviço for executada, O SISTEMA DEVE deduzir automaticamente os insumos configurados na Ficha Técnica (BOM) do estoque do tenant.
- **REQ-EARS-13 (Proteção de Dados Internos e Fiscais)**: QUANDO visualizações públicas de produtos ou anúncios forem geradas, O SISTEMA DEVE omitir estritamente custo, margem de lucro, comissão e NCM/CEST.

### Onda 5: Design System e Usabilidade
- **REQ-EARS-14 (Ergonomia e Touch Targets)**: TODA superfície interativa móvel DEVE possuir altura mínima de 44px (`h-11`) e anel de foco `:focus-visible`.
