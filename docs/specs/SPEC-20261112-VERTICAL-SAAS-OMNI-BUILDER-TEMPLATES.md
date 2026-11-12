# SPEC-20261112 — Templates Canônicos de Vendas de Sistemas Verticais no OmniBuilder (Belasis, Avec, iFood, 99Food, Mercos, OSuper)

## 1. Contexto e Objetivos

O Waesy possui múltiplos sistemas e módulos verticais nativos de gestão e comércio (Gestão de Salões e Estética, Gestão e Delivery de Restaurantes, Força de Vendas e E-commerce B2B, Plataforma e Picking de Supermercados). 
Para comercializar esses sistemas para empresários, lojistas, distribuidores e redes, cada vertical precisa de sua **landing page / tela de vendas de software própria** dentro do **OmniBuilder**, inspirada na arquitetura de conversão, copywriting, identidade visual e blocos dos maiores benchmarks de mercado:

1. **Beleza & Estética (Belasis / Avec)**: Foco em agendamento online 24h, comanda eletrônica, cálculo de comissões, fichas de anamnese, clube de assinaturas e redução de faltas (no-show).
2. **Gastronomia & Delivery (iFood Restaurantes / 99Food Parceiros)**: Foco em atração de pedidos, gestor em tempo real no balcão, cardápio digital inteligente, logística flexível (Waesy Go com taxa fixa de R$ 0,99 vs taxas abusivas tradicionais) e antecipação de repasses.
3. **Indústria, Atacado & Força de Vendas B2B (Mercos)**: Foco em aplicativo de vendas 100% offline para equipe externa, catálogo digital, políticas comerciais rígidas, Saldo Flex e integração nativa com mais de 200 ERPs (Totvs, Sankhya, Bling, Senior, Omie).
4. **Supermercados & Varejo Alimentar (OSuper)**: Foco em e-commerce white label com marca própria da rede, separação inteligente nas gôndolas (Picking & Packing) com rota lógica, pesagem fracionada de hortifrúti/carnes, gestão de rupturas via WhatsApp e tabloide digital.

---

## 2. Requisitos em Sintaxe EARS

### 2.1 Requisitos Ubíquos (Ubiquitous Requirements)
- **EARS-UB-01**: O OmniBuilder DEVE disponibilizar no catálogo de templates os 4 novos templates canônicos de vendas de sistemas verticais (`template_saas_beauty_belasis`, `template_saas_food_restaurante`, `template_saas_b2b_mercos`, `template_saas_supermarket_osuper`).
- **EARS-UB-02**: Todo componente interativo nos blocos de vendas de software DEVE cumprir o piso WCAG 2.2 AA (área de toque >= 44x44px, `:focus-visible:ring-2`, contraste de texto >= 4.5:1 e controles >= 3:1).
- **EARS-UB-03**: Nenhum bloco ou template DEVE conter classes arbitrárias com colchetes, cores hexadecimais brutas fora dos tokens semânticos, `!important` ou padrões de containeritis (DL-31/DL-32).

### 2.2 Requisitos Orientados a Eventos (Event-Driven Requirements)
- **EARS-EV-01**: QUANDO um usuário selecionar qualquer um dos 4 templates de sistema vertical no CMS ou Studio, O SISTEMA DEVE hidratar a página atomicamente com todos os blocos especializados (Hero Split com stats, ribbon de marcas/ERPs, showcase de recursos em abas, calculadora interativa/ROI, demonstração em vídeo, tabela de planos com toggle mensal/anual, depoimentos reais, FAQ e formulário de trial).
- **EARS-EV-02**: QUANDO o visitante alternar as abas no bloco `software_feature_tabs`, O SISTEMA DEVE transicionar de forma suave o mockup visual, a lista de benefícios e a descrição detalhada do módulo correspondente.
- **EARS-EV-03**: QUANDO o visitante submeter o formulário de teste grátis ou diagnóstico (`contact_form_direct`), O SISTEMA DEVE enviar o lead ao CRM via `submitOmniPageLeadFn` e redirecionar para atendimento instantâneo via WhatsApp.

### 2.3 Requisitos Orientados a Estado (State-Driven Requirements)
- **EARS-ST-01**: ENQUANTO o visitante estiver visualizando a tabela de planos (`pricing_tables_clean`), O SISTEMA DEVE permitir alternar entre ciclo mensal e ciclo anual, atualizando os preços formatados em BRL e destacando o selo de economia anual.
- **EARS-ST-02**: ENQUANTO o administrador estiver no editor WYSIWYG do OmniBuilder, O SISTEMA DEVE renderizar os blocos em modo de edição e permitir personalização de títulos, badges, imagens e textos através do `UniversalBlockInspector`.

### 2.4 Requisitos de Comportamento Indesejado (Unwanted Behavior Requirements)
- **EARS-UN-01**: SE um bloco de vídeo ou galeria não possuir URL configurada, O SISTEMA NÃO DEVE quebrar a página nem renderizar elementos quebrados; DEVE renderizar um empty state honesto com instruções de configuração.
- **EARS-UN-02**: SE uma aba no showcase de software não tiver imagem informada, O SISTEMA DEVE exibir um preview conceitual com ícone semântico e checklist sem distorção de layout.

---

## 3. Matriz de Componentes e Blocos por Template

| Template ID | Vertical / Benchmark | Blocos Integrados |
| :--- | :--- | :--- |
| `template_saas_beauty_belasis` | Beleza, Salões & Barbearias (Belasis / Avec) | `hero_minimal_split`, `infinite_marquee_ribbon`, `software_feature_tabs`, `interactive_quote_calculator`, `video_section`, `pricing_tables_clean`, `testimonials_social_proof`, `faq_clean_accordion`, `contact_form_direct` |
| `template_saas_food_restaurante` | Gastronomia, Restaurantes & Delivery (iFood / 99Food) | `hero_minimal_split`, `infinite_marquee_ribbon`, `software_feature_tabs`, `interactive_quote_calculator`, `video_section`, `pricing_tables_clean`, `testimonials_social_proof`, `faq_clean_accordion`, `contact_form_direct` |
| `template_saas_b2b_mercos` | Indústria, Distribuidoras & Força de Vendas (Mercos) | `hero_minimal_split`, `infinite_marquee_ribbon`, `software_feature_tabs`, `interactive_quote_calculator`, `video_section`, `pricing_tables_clean`, `testimonials_social_proof`, `faq_clean_accordion`, `contact_form_direct` |
| `template_saas_supermarket_osuper` | Supermercados & Picking (OSuper) | `hero_minimal_split`, `infinite_marquee_ribbon`, `software_feature_tabs`, `interactive_quote_calculator`, `video_section`, `pricing_tables_clean`, `testimonials_social_proof`, `faq_clean_accordion`, `contact_form_direct` |

---

## 4. Invariantes de Design e Arquitetura

1. **Invariante de Isolamento Semântico**: Nenhum componente de bloco acessa banco de dados diretamente; o consumo se dá por props tipadas via Zod.
2. **Invariante de Anti-Containeritis (DL-31)**: Cards de planos e abas não devem ser aninhados em contêineres redundantes com borda e sombra sobrepostos.
3. **Invariante de Acessibilidade (WCAG 2.2 AA)**: Todos os botões possuem altura mínima de 44px (`h-11 min-h-11`), anel de foco `:focus-visible:ring-2` e contraste auditado.
4. **Invariante de Zero Dados Fictícios / Honestidade**: Preços expressos em centavos de BRL com cálculos matemáticos exatos e textos fiéis aos modelos reais de negócio.

---

## 5. Critérios de Aceite e Evidências

- [ ] Novo bloco `software_feature_tabs` registrado em `CANONICAL_BUILDER_BLOCK_IDS`, schemas Zod e `SITE_BUILDER_BLOCKS`.
- [ ] Implementação de `SoftwareFeatureShowcase.tsx` com tabs acessíveis, checklist de benefícios, mockup e botões tátil.
- [ ] 4 Templates completos configurados em `src/lib/builder/omni-templates.ts`.
- [ ] Templates mapeados no Studio Catalog (`studio-catalog.ts`) com metas, tags e slots de assets.
- [ ] Templates visíveis na criação de páginas em `workspace.cms.paginas.index.tsx`.
- [ ] Validação por testes unitários dedicados em `omni-builder.test.ts`.
- [ ] Zero regressões visuais no design-lint (`node scripts/design-lint.mjs --ratchet`).
- [ ] Aprovação plena no typecheck TypeScript.
