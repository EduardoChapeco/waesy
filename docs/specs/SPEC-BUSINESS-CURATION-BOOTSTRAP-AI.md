# SPEC-BUSINESS-CURATION-BOOTSTRAP-AI: Curadoria Ativa Bootstrap com IA e Enriquecimento Profundo de Empresas

## 1. Contexto e Motivação
A auditoria forense do ecossistema de mineração revelou que dos 37 estabelecimentos físicos cadastrados em `directory_listings` (18 OpenStreetMap/Overpass, 8 leiloeiros, 6 imobiliárias, 3 manuais e 2 Nominatim), 0% possuíam CNPJ registrado, 94.6% não possuíam avatar/logotipo, 97.3% estavam sem banner de cabeçalho, 100% sem galeria de fotos e 73% com descrições nulas ou genéricas de uma linha.
Além disso, informações vitais para a conversão local — como horários de funcionamento, contatos de WhatsApp, perfis de Instagram, links da bio e quadro societário — estavam ausentes, empobrecendo a experiência do usuário nas rotas públicas `_store.places.$placeSlug` e `_store.diretorio.$id`.

## 2. Requisitos em Sintaxe EARS

### 2.1 Descoberta e Extração Multicanal (Firecrawl / Steel.dev / Web)
- **WHEN** um estabelecimento cadastrado em `directory_listings` for submetido à curadoria ativa:
  - **THE SYSTEM SHALL** resolver o website oficial, domínio ou perfil social (Instagram, Facebook) a partir dos metadados existentes ou por busca heurística estruturada.
  - **THE SYSTEM SHALL** inspecionar a página inicial e a página de contato/sobre utilizando o cliente unificado `scrapeUrl` (Firecrawl com fallback Steel.dev / native-fetch com detecção de cooldown).
  - **THE SYSTEM SHALL** extrair recursivamente:
    1. Logotipo / Avatar em alta resolução (OpenGraph `og:image`, `apple-touch-icon`, `favicon` HD 128px).
    2. Imagem de banner / capa (imagens hero em tags `<header>`, `meta[property="og:image"]` de alta resolução ou imagem temática de alta fidelidade).
    3. Galeria de fotos de produtos, instalações e portfólio (`photos: string[]`).
    4. Links de redes sociais: Instagram (`instagram.com/*`), WhatsApp (`wa.me/*`), Facebook, LinkedIn, YouTube, TikTok.
    5. Links da Bio: detecção de agregadores (Linktree, Beacons) e extração dos destinos comerciais internos.

### 2.2 Enriquecimento Cadastral e Fiscal do CNPJ
- **WHEN** um CNPJ for identificado no rodapé do website, nos metadados ou na razão social:
  - **THE SYSTEM SHALL** validar o dígito verificador via algoritmo Módulo 11 da Receita Federal antes de qualquer mutação.
  - **THE SYSTEM SHALL** consultar a BrasilAPI (`/api/cnpj/v1/{cnpj}`) e enriquecer o registro com:
    1. Razão Social e Nome Fantasia oficiais.
    2. CNAE Principal (código e descrição canônica) e CNAEs secundários.
    3. Endereço fiscal padronizado (Logradouro, número, complemento, bairro, CEP, município, UF).
    4. Telefones fiscais e E-mails corporativos.
    5. Situação cadastral na Receita (Ativa, Inapta, Baixada) e Data de Abertura.
    6. Quadro de Sócios e Administradores (QSA com nomes e qualificações).
    7. Capital Social e Natureza Jurídica.

### 2.3 Horários de Funcionamento (Google Places / OpenStreetMap / Schema.org)
- **WHEN** o estabelecimento possuir tags de horário (`opening_hours` do OSM ou JSON-LD `LocalBusiness.openingHoursSpecification`):
  - **THE SYSTEM SHALL** normalizar os horários brutos em um dicionário canônico estruturado por dia da semana (`working_hours: Record<string, string>`).
  - **THE SYSTEM SHALL** computar o indicador de abertura em tempo real (`is_open_now: boolean`) com base no fuso horário oficial de Brasília (`America/Sao_Paulo`).

### 2.4 Curadoria Editorial e Anti-AI-Smell
- **WHEN** o estabelecimento possuir dados brutos coletados:
  - **THE SYSTEM SHALL** submeter o contexto ao motor de síntese editorial para redigir uma descrição institucional concisa, informativa e humana, destacando especialidades, diferenciais, localização e formas de atendimento, banindo adjetivos vazios ou jargões corporativos.
  - **THE SYSTEM SHALL** gerar resumo SEO de até 160 caracteres.

### 2.5 Auto-População no CMS e Biolinks
- **WHEN** os links sociais e de contato forem consolidados:
  - **THE SYSTEM SHALL** injetar os botões de ação rápida no `metadata.social_links` e `metadata.biolink_cards`:
    - "Conversar no WhatsApp" (com mensagem inicial contextualizada).
    - "Ver no Instagram".
    - "Ligar para a Empresa".
    - "Como Chegar" (rota via coordenadas OSM / Google Maps).
    - "Visitar Website".

### 2.6 Exibição Pública no Padrão Canônico Apple HIG (`_store.places.$placeSlug.tsx`)
- **WHEN** a rota pública do estabelecimento for acessada:
  - **THE SYSTEM SHALL** renderizar o banner em proporção estável com fallback refinado sem layout shifts (CLS < 0.1).
  - **THE SYSTEM SHALL** exibir avatar circular em alta definição com anel de contraste e tratamento defensivo `onError`.
  - **THE SYSTEM SHALL** exibir badge de Verificação Cadastral de CNPJ com detalhamento em gaveta expansível (Situação Ativa, CNAE, Sócios, Data de Fundação).
  - **THE SYSTEM SHALL** exibir painel tátil com Horários de Funcionamento e indicador visual dinâmico ("Aberto Agora" verde / "Fechado no Momento" neutro).
  - **THE SYSTEM SHALL** renderizar a galeria de fotos e cluster de biolinks com alvos de toque mínimos de 44x44px (`h-11 min-h-11`) e anéis de foco explícitos (`:focus-visible`).

## 3. Critérios de Aceite e Verificação
1. Zero erros no `npm run typecheck` (`tsc --noEmit`).
2. Suíte de testes unitários dedicada `business-curation-bootstrap.test.ts` 100% aprovada.
3. Catraca de Design Lint sem regressões (`node scripts/design-lint.mjs --ratchet` Exit Code 0).
4. Execução de curadoria ativa nos 37 estabelecimentos elevando as taxas de avatar, descrição, horários e CNPJ.
5. Registro de decisão técnica DEC-215 em `docs/design/DECISIONS.md`.
