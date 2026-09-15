# [MEGA MASTER PROMPT: PROTOCOLO OPERACIONAL DE ENGENHARIA DE BIGTECH — WAESY PLATFORM]

> **Diretriz Autônoma e Vinculante para Agentes de IA, Engenheiros e Execução de Melhorias Contínuas**  
> Padrão Operacional: Apple, Stripe, Airbnb, Linear & iFood  
> Cobertura: Multi-Tenant, Multi-Nicho, BFF TanStack Start, Supabase Postgres, Cloudflare Workers

---

## AS 7 CAMADAS DE COMPLETUDE INVIOLÁVEIS:
1. **Camada 1 (Banco de Dados):** Tabelas, tipos enums, índices, constraints e RLS Deny-by-Default com isolamento multi-tenant rigoroso via migrations rastreadas no Git.
2. **Camada 2 (BFF & Contratos):** Server Functions (`createServerFn`) com schemas Zod estritos, derivação de identidade por sessão segura (`getServerIdentity`) e transações atômicas (`.rpc` / ACID).
3. **Camada 3 (UI de Ação):** Componentes com feedback em tempo real, estados defensivos de loading, erro e validação sem quebras de layout.
4. **Camada 4 (Superfície de Governança):** Painel operacional no Workspace ou Admin Master para auditoria, curadoria e cancelamento das operações.
5. **Camada 5 (Higiene Visual Anti-AI Smell):** Eliminação total de cartões conversacionais artificiais, silêncio visual, tipografia refinada e sem jargões técnicos expostos.
6. **Camada 6 (Ergonomia dos 3 Toques):** Qualquer objetivo primário (compra, reserva, contato) deve ser atingido em até 3 toques na Thumb Zone móvel com alvos mínimos de 44px.
7. **Camada 7 (Fluidez & Zero Layout Shift):** Prevenção de FOUC, containers com largura consistente (`max-w-6xl`/`max-w-7xl`) e ausência de margens ociosas (1px mobile border).

---

## CRONOGRAMA EM 10 MACRO-FASES & CENTENAS DE MICRO-FASES EXECUTIVAS

### FASE 1: ISOLAMENTO SEMÂNTICO E SISTEMA DE NICHOS POLIMÓRFICOS
- **Micro-fase 1.1:** Mapear e blindar a função `resolveClassifiedNiche` para que nenhuma categoria de serviço, turismo, hospedagem ou vaga caia no fallback de bens físicos.
- **Micro-fase 1.2:** Garantir que Feature Cards em turismo apresentem Modalidade, Embarque, Duração e Parcelamento, banindo 'Usado Revisado' e 'Pronta Entrega'.
- **Micro-fase 1.3:** Em hospedagem, expor tipo de acomodação, capacidade em hóspedes, regras de check-in/out e comodidades com chips dedicados.
- **Micro-fase 1.4:** Em veículos, exibir laudo cautelar, quilometragem formatada, ano de fabricação/modelo e procedência de único dono.
- **Micro-fase 1.5:** Em doações solidárias, impor R$ 0,00 gratuito, ocultar opções de contraproposta financeira e enfatizar retirada comunitária.
- **Micro-fase 1.6:** Em alimentação/gastronomia, destacar tempo de preparo, cardápio do dia e integração de entrega local via MotoLink.
- **Micro-fase 1.7:** Em produtos digitais, integrar upload com geração de download seguro e controle estrito de downloads permitidos.
- **Micro-fase 1.8:** Em vagas de emprego, formatar regime de contratação (CLT/PJ), modalidade (presencial/remoto/híbrido) e faixa salarial.
- **Micro-fase 1.9:** Em assinaturas recorrentes, gerenciar ciclos de cobrança mensal/anual e períodos de teste gratuito (trial).
- **Micro-fase 1.10:** Em locação de equipamentos, gerenciar valores de diárias, depósito caução e opção de operador técnico incluso.

### FASE 2: ERGONOMIA MOBILE & DESIGN OPS HIGIENIZADO
- **Micro-fase 2.1:** Impor o container raiz de 1px da borda da tela móvel (`px-[1px]`) eliminando margens duplas e caixas flutuantes.
- **Micro-fase 2.2:** Ocultar TopBars repetitivas em telas de fluxo focado (Perfil, Checkout, Conversas, Agendamentos) via `isCleanMobileAppPage`.
- **Micro-fase 2.3:** Fixar barra de ação comercial no terço inferior da tela móvel (Thumb Zone) com botões de 44px a 48px de altura.
- **Micro-fase 2.4:** Erradicar selos prolixos de IA como 'VITRINE OFICIAL', 'Morador Verificado' e caixas de texto redundantes.
- **Micro-fase 2.5:** Garantir proporção canônica de capa de perfil 3:1 (1200x400px) com máscara precisa no Brand Kit e sincronização em `stores`.
- **Micro-fase 2.6:** Ajustar a largura da barra lateral do Workspace para 268px, garantindo que botões e menus nunca transbordem ou sejam cortados.
- **Micro-fase 2.7:** Aplicar scroll suave e ausência de barras de rolagem horizontais em toda a área de navegação administrativa.
- **Micro-fase 2.8:** Unificar tipografia com `clamp()` responsivo prevenindo quebras de linha indesejadas em smartphones compactos (360px).
- **Micro-fase 2.9:** Aplicar sombras refinadas (`shadow-2xs` a `shadow-xs`) e bordas sutis (`border-border/60`) seguindo o Paradigma Clean.
- **Micro-fase 2.10:** Auditar contraste visual WCAG AA em botões primários, estados de hover e badges de status.

### FASE 3: SUPER-HUB CENTRALIZADO DE APIS & CARTOGRAFIA CANÔNICA
- **Micro-fase 3.1:** Centralizar todas as integrações de APIs em um único hub administrativo em `/admin-master/integracoes`.
- **Micro-fase 3.2:** Configurar OpenStreetMap Standard como provedor padrão oficial de mapas da plataforma, sem marcas d'água comerciais de chaves pagas.
- **Micro-fase 3.3:** Implementar sincronização atômica das preferências de mapa em `stores.settings.public_apis_governance` e `integration_credentials`.
- **Micro-fase 3.4:** Garantir renderização reativa do `MapLibreCanvas` ao alternar o provedor de mapa selecionado pelo Admin Master.
- **Micro-fase 3.5:** Tratar fallbacks defensivos caso tiles externos estejam temporariamente inacessíveis ou sob alta latência.
- **Micro-fase 3.6:** Integrar widgets meteorológicos com a API pública wttr.in, garantindo previsão do tempo baseada na cidade de destino.
- **Micro-fase 3.7:** Proibir coordenadas hardcoded como fallback silencioso; exibir estado descritivo quando coordenadas não forem cadastradas.
- **Micro-fase 3.8:** Tokenizar credenciais sensíveis de webhooks com Transactional Outbox e idempotência estrita.
- **Micro-fase 3.9:** Prover logs de auditoria de chamadas de APIs externas com registro de latência, status HTTP e payloads anonimizados.
- **Micro-fase 3.10:** Testar cobertura de 100% das funções de governança de APIs públicas com Vitest.

### FASE 4: ARQUITETURA FINANCEIRA, FATURAS, CRUDS & GATEWAYS
- **Micro-fase 4.1:** Segregar rigidamente gateways da plataforma (cobrança de mensalidades e comissões) de gateways dos lojistas (vendas aos clientes).
- **Micro-fase 4.2:** Bloquear pessoas físicas de conectar gateways privados; restringir pagamentos diretos de pessoas físicas a Pix ou dinheiro.
- **Micro-fase 4.3:** Implementar CRUD completo de faturas em `/admin-master/faturas` (Criar, Visualizar, Editar, Duplicar, Arquivar, Cancelar).
- **Micro-fase 4.4:** Corrigir a máscara de moeda brasileira para manipulação de centavos inteiros (Integer Cents), impedindo truncamento de valores.
- **Micro-fase 4.5:** Criar fluxo de envio de comprovante bancário (PDF ou imagem) pelo lojista e aprovação manual pelo administrador.
- **Micro-fase 4.6:** Implementar visualizador e download direto do comprovante anexado na fatura via Storage seguro.
- **Micro-fase 4.7:** Validar transações e mutações de faturas exclusivamente no servidor via `getServerIdentity` e `requirePlatformAdmin`.
- **Micro-fase 4.8:** Implementar cálculo dinâmico de parcelas (1x a 24x) com e sem juros baseado exclusivamente nas configurações do anunciante.
- **Micro-fase 4.9:** Integrar telemetria de transações financeiras com detecção de anomalias e tentativas de adulteração de valores.
- **Micro-fase 4.10:** Garantir conformidade com conciliação fiscal e emissão de notas de serviço correspondentes.

### FASE 5: MOTOR DE SORTEIOS, CONCURSOS & AUDITORIA DE PREMIAÇÕES
- **Micro-fase 5.1:** Blindar a tabela `public.raffles` garantindo a presença da coluna `updated_at` e triggers de atualização automática.
- **Micro-fase 5.2:** Implementar rotinas administrativas de sorteio eletrônico auditado com verificação de entropia criptográfica.
- **Micro-fase 5.3:** Construir animação imersiva de sorteio com celebração visual de confetti e revelação segura do bilhete premiado.
- **Micro-fase 5.4:** Permitir cancelamento auditado de sorteios sem erros de schema cache no PostgREST.
- **Micro-fase 5.5:** Permitir que o administrador liste todos os bilhetes emitidos, cruzando usuário, data de compra e pontos consumidos.
- **Micro-fase 5.6:** Implementar regulamentos claros e transparentes acessíveis pelo participante antes da confirmação da entrada.
- **Micro-fase 5.7:** Garantir que cada bilhete premiado seja notificado via canal direto e registrado no histórico de prêmios do usuário.
- **Micro-fase 5.8:** Proteger contra emissão de bilhetes acima do limite máximo por usuário (`max_tickets_per_user`).
- **Micro-fase 5.9:** Implementar auditoria de sorteios encerrados com exibição dos ganhadores em modo de consulta pública.
- **Micro-fase 5.10:** Validar integridade dos testes de concursos de sorte com zero dependência de dados mockados.

### FASE 6: HUB DE TURISMO, EXCURSÕES & TEMPLATE INSTAGRAM EDITORIAL
- **Micro-fase 6.1:** Aplicar migration completa com colunas de excursão (`destination`, `departure_city`, `departure_date`, `seats`, `rooms`).
- **Micro-fase 6.2:** Remover restrições ultrapassadas da check constraint `tourism_experiences_category_check` permitindo `'group_tour'`.
- **Micro-fase 6.3:** Remover restrições de status permitindo `'open'`, `'confirmed'`, `'closed'`, `'completed'` e `'cancelled'`.
- **Micro-fase 6.4:** Conectar `NewGroupTourWizard` com inserção segura em `tourism_experiences` gerando mapa de 46 poltronas ou frota vinculada.
- **Micro-fase 6.5:** Estender o renderizador público de excursões para suportar o template Instagram Editorial em modo imersivo.
- **Micro-fase 6.6:** Exibir destaques em story highlights circulares com upload contextual de fotos por dia de viagem.
- **Micro-fase 6.7:** Exibir previsão meteorológica precisa do destino final via wttr.in.
- **Micro-fase 6.8:** Permitir reserva direta de poltrona com seleção interativa no mapa de assentos do ônibus.
- **Micro-fase 6.9:** Exibir rooming list de hospedagem com tipos de quartos (Individual, Duplo, Triplo, Família) e regras de check-in.
- **Micro-fase 6.10:** Garantir sincronização automática entre pacote cadastrado na agência e vitrine pública em `/turismo`.

### FASE 7: RIGOR JURÍDICO, LGPD & AUSÊNCIA DE FALSAS GARANTIAS
- **Micro-fase 7.1:** Erradicar de ponta a ponta qualquer menção de 'Garantia Waesy' ou garantia universal da plataforma.
- **Micro-fase 7.2:** Deixar evidente que as condições de garantia, devolução e prazos são de responsabilidade exclusiva do anunciante.
- **Micro-fase 7.3:** Disponibilizar a opção de 'Ocultar endereço completamente' no cadastro de classificados e no perfil de usuário.
- **Micro-fase 7.4:** Quando a privacidade estiver ativada, omitir latitude, longitude, mapa, bairro e cidade na vitrine pública.
- **Micro-fase 7.5:** Implementar consentimento explícito LGPD em formulários de contato e transações entre partes.
- **Micro-fase 7.6:** Prover links acessíveis para termos de uso e políticas de privacidade em todas as interfaces públicas.
- **Micro-fase 7.7:** Garantir que dados de contato (WhatsApp, telefone) sejam acessados mediante rate limit defensivo anti-scraping.
- **Micro-fase 7.8:** Armazenar logs de auditoria de consentimento de dados para fins de conformidade legal.
- **Micro-fase 7.9:** Proibir o compartilhamento de dados cadastrais de compradores entre lojas distintas sem autorização explícita.
- **Micro-fase 7.10:** Implementar cláusulas de cancelamento flexíveis, moderadas e rígidas padronizadas pelo anunciante.

### FASE 8: LIVE TRUTHFUL PREVIEW & SEPARAÇÃO DO MODO PROPRIETÁRIO
- **Micro-fase 8.1:** Garantir que a prévia em tempo real (Live Preview) no editor de anúncios execute rigorosamente com `isOwner={false}`.
- **Micro-fase 8.2:** Ocultar botões de edição, faixas de aviso de proprietário e botões de exclusão na área de prévia de compra.
- **Micro-fase 8.3:** Sincronizar todos os campos digitados no formulário à esquerda com o preview à direita sem delay perceptível.
- **Micro-fase 8.4:** Simular a exibição de cálculo de parcelas, formas de pagamento aceitas e comodidades no preview fiel.
- **Micro-fase 8.5:** Manter paridade visual 1:1 entre a prévia do editor e a página pública `/classificados/$id`.
- **Micro-fase 8.6:** Suportar alternância fluida entre visualização padrão e vitrine imersiva editorial no próprio editor.
- **Micro-fase 8.7:** Tratar estados vazios de imagens com placeholders elegantes que não deformem o aspecto proporção 16:10.
- **Micro-fase 8.8:** No mobile, permitir alternância instantânea entre a aba 'Formulário' e a aba 'Prévia' com scroll preservado.
- **Micro-fase 8.9:** Proteger contra loops infinitos de re-renderização em `useMemo` de objetos de prévia complexos.
- **Micro-fase 8.10:** Validar integridade dos componentes de prévia com testes de regressão visual.

### FASE 9: SRE, TELEMETRIA FORENSE & LOADERS RESILIENTES
- **Micro-fase 9.1:** Impor o Zero-Crash Loader Mandate em todas as rotas TanStack Router com blocos defensivos try/catch e fallbacks seguros.
- **Micro-fase 9.2:** Substituir caixas pretas de erro genéricas pelo `WorkspaceErrorComponent` transparente, exibindo diagnóstico técnico legível.
- **Micro-fase 9.3:** Centralizar captura de exceções em `system_error_logs` com rota, stack trace, severidade e metadados contextuais.
- **Micro-fase 9.4:** Integrar telemetria de visualizações e engajamento via componente canônico `ProductTelemetry`.
- **Micro-fase 9.5:** Implementar painel de monitoramento de saúde de serviços em `/admin-master/logs` com filtros por severidade.
- **Micro-fase 9.6:** Eliminar warnings de build do Vite e dependências depreciadas para manter tempos de compilação abaixo de 30 segundos.
- **Micro-fase 9.7:** Monitorar taxa de erros 4xx/5xx em tempo real acionando alertas executivos em incidentes SEV-1.
- **Micro-fase 9.8:** Blindar rotas administrativas com checagens de autorização server-side via `requirePlatformAdmin`.
- **Micro-fase 9.9:** Garantir isolamento de cache HTTP no Cloudflare Workers com cabeçalhos Cache-Control apropriados por rota.
- **Micro-fase 9.10:** Executar suite completa de 330 testes automatizados com taxa de aprovação mandatória de 100%.

### FASE 10: CONTINUOUS DELIVERY, DEPLOY AUTOMATIZADO & GOVERNANÇA
- **Micro-fase 10.1:** Automatizar pipeline de empacotamento com Vite e injeção do wrapper de worker para Cloudflare Pages.
- **Micro-fase 10.2:** Executar deploy em produção via Wrangler Pages com o projeto `usewaesy` ativo e commit rastreado.
- **Micro-fase 10.3:** Validar a injeção contínua de variáveis de ambiente de produção (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- **Micro-fase 10.4:** Sincronizar scripts de migração do Supabase com o repositório Git sob versionamento semântico timestamped.
- **Micro-fase 10.5:** Manter documentação mestre em `docs/` atualizada a cada modificação substancial de contratos ou banco.
- **Micro-fase 10.6:** Estabelecer ciclo de melhorias Kaizen quinzenal para auditar feedbacks do lojista e do consumidor final.
- **Micro-fase 10.7:** Gerar relatórios forenses automatizados de conformidade com as regras do `AGENTS.md` e `MASTER_PLAN.md`.
- **Micro-fase 10.8:** Garantir que todo commit possua mensagem semântica detalhada vinculando os requisitos atendidos.
- **Micro-fase 10.9:** Monitorar o tempo de resposta inicial (TTFB) e Core Web Vitals no Cloudflare Analytics.
- **Micro-fase 10.10:** Concluir cada ciclo de trabalho com gravação em vídeo no navegador real como evidência de validação funcional.
