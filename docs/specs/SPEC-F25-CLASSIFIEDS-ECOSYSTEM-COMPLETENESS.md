# SPEC-F25: Ecossistema Completo de Classificados — Unificação de Campos, Isolamento de Contexto (Civil vs Loja), Chat Nativo e Agendamento de Serviços

## 1. Contexto & Diagnóstico Forense
Auditoria profunda identificou inconsistências estruturais no ciclo de vida dos anúncios (`public.classifieds`):
1. **Omissão Sistemática de Atributos:** O formulário de criação/edição (`_store.conta.classificados.novo.tsx`) captura 138 campos distribuídos em 15 nichos, salvando na tabela e no JSONB `attributes`. No entanto, os visualizadores `ClassifiedDetailDesktop` e `ClassifiedDetailMobile` apenas inspecionam 11 chaves estáticas, descartando dezenas de especificações ricas (veículos, mercado, desapego, serviços, empresas, vagas).
2. **Divergência de Nomenclatura:** Chaves gravadas no banco não coincidem com as buscadas no visualizador (`parking_spots` vs `garage_spots`, `mileage_km` vs `mileage`, `year_model`/`year_fab` vs `year`).
3. **Vazamento de Contexto B7 (Formulário de Leads):** Usuários de Perfil Civil (sem loja) eram apresentados com opção de conectar formulários de marketing do Workspace (`/workspace/marketing/formularios`), um módulo restrito a lojistas com CRM ausente no perfil pessoal.
4. **Ausência de Botão de Chat Interno:** O backend (`startCustomerChatThread`) possui suporte a mensagens P2P e B2C, mas a UI só renderizava botões de WhatsApp, inclusive rotulando o botão externo mobile como "Conversar" sob ícone de chat nativo.
5. **Agendamento de Serviços Deformado:** O modal de agendamento na página de detalhes só possuía campos para diárias de hotel e viagens, impedindo agendamentos com horários comerciais para o nicho de serviços.
6. **Pedidos de Conveniência para Vendedor Civil:** Pedidos gerados via `createQuickOrder` para anúncios de conveniência sem `store_id` caíam em fallback atrelando a transação a uma loja aleatória do banco.

---

## 2. Requisitos Normativos em Sintaxe EARS

- **[EARS-1] Resolvedor Canônico Universal de Especificações:**
  - *Ubíquo:* O sistema deve resolver e normalizar os atributos técnicos de qualquer anúncio através de uma biblioteca canônica (`resolveClassifiedDetailedSpecs`), cruzando colunas dedicadas da tabela `classifieds` e atributos dinâmicos do JSONB `attributes` para todos os 15 nichos de negócio.
- **[EARS-2] Paridade Total de Renderização nos Visualizadores:**
  - *Ubíquo:* Tanto `ClassifiedDetailDesktop` quanto `ClassifiedDetailMobile` devem exibir a ficha técnica estruturada gerada pelo resolvedor canônico, garantindo que nenhum campo preenchido no CMS seja descartado silenciosamente.
- **[EARS-3] Exibição de Formulário de Leads no Detalhe Público:**
  - *Condicional:* Se o anúncio possuir `form_id` válido vinculado a uma loja oficial, o sistema deve renderizar o widget de captura de leads integrado tanto na visualização desktop quanto mobile.
- **[EARS-4] Isolamento Estrito de Contexto no CMS (Civil vs Loja - Regra B7):**
  - *Condicional:* Se o anúncio estiver sendo criado ou editado sob Perfil Pessoal (sem `store_id`), o formulário de classificados deve ocultar a seção de Formulários de Captura e CRM do Workspace, canalizando o contato para WhatsApp, Chat Nativo ou Propostas Diretas.
- **[EARS-5] Ação Explícita de Chat Nativo (In-App) e WhatsApp:**
  - *Ubíquo:* O sistema deve fornecer botões distintos e transparentes para "WhatsApp" (link externo) e "Conversar no App" (Chat P2P nativo via `startCustomerChatThread`), direcionando o comprador para `/_store/conta/conversas/$id`.
- **[EARS-6] Escalada da IA (AiSdrChat) para o Vendedor Humano:**
  - *Condicional:* Quando o cliente estiver interagindo com o `AiSdrChat` e desejar falar com o anunciante, o assistente deve fornecer um botão de transição direta para abrir o chat nativo com o proprietário do anúncio.
- **[EARS-7] Agendamento Especializado para Serviços:**
  - *Condicional:* Se o anúncio for do nicho `service`, o modal de agendamento deve apresentar seleção de data comercial dentro dos dias permitidos (`available_weekdays`), seleção de horário entre `working_hours_start` e `working_hours_end` e tempo de duração do serviço, registrando o agendamento em `deals`.
- **[EARS-8] Pedidos de Conveniência Seguros para Pessoa Física:**
  - *Comportamento Indesejado:* Se um comprador solicitar um item de conveniência/mercado publicado por pessoa física (`store_id` nulo), o sistema não deve vincular o pedido a uma loja aleatória de terceiros, devendo gerar uma proposta/pedido civil atrelado ao `author_profile_id`.

---

## 3. Matriz de Rastreabilidade Séptupla

| Camada | Arquivos Impactados | Responsabilidade |
| :--- | :--- | :--- |
| **1. Domínio & Especificações** | `src/lib/classifieds/canonical-specs-resolver.ts` | Extração, mapeamento de sinônimos e tipagem dos atributos dos 15 nichos |
| **2. Testes de Domínio** | `src/lib/classifieds/canonical-specs-resolver.test.ts` | Testes unitários para validar extração sem perda de dados |
| **3. Visualizadores Públicos** | `src/components/classifieds/classified-detail-desktop.tsx`<br>`src/components/classifieds/classified-detail-mobile.tsx` | Renderização completa de specs, botão de Chat Nativo e Lead Form |
| **4. Agendamento Especializado** | `src/components/classifieds/detail/classified-booking-dialog.tsx`<br>`src/components/classifieds/detail/use-classified-detail.ts` | Bifurcação entre agenda de serviços e reservas de hospedagem/turismo |
| **5. CMS / Formulário** | `src/routes/_store.conta.classificados.novo.tsx` | Ocultação de Lead Form corporativo para perfis pessoais e sanitização de dados |
| **6. IA & Transição Humana** | `src/components/commerce/ai-sdr-chat.tsx` | Ação de escalada do assistente virtual para chat humano |
| **7. BFF & Transações** | `src/services/quick-order.functions.ts`<br>`src/services/chat.functions.ts` | Prevenção de fallback aleatório em pedidos civis e integridade de threads |

---

## 4. Parecer do Conselho Executivo BigTech (5 Personas)

1. **CPO & Presidente do Conselho:** "Aprovado. O usuário civil agora tem uma experiência honesta e fluida sem ser jogado em ferramentas corporativas de CRM de lojas. A separação entre WhatsApp e Chat Nativo respeita as escolhas de privacidade de compradores e vendedores."
2. **Chief Software Architect:** "Aprovado. A criação do `canonical-specs-resolver` elimina a duplicação de regras em desktop e mobile, centralizando a lógica de leitura com garantia MECE em todos os 15 nichos."
3. **Staff Security & Data Engineer:** "Aprovado. Corrigida a vulnerabilidade lógica de pedidos civis serem atrelados a lojas arbitrárias de terceiros em `quick-order`. RLS e integridade de isolamento tenant preservados."
4. **Principal Design Ops & Web Performance:** "Aprovado. Design tokens rigorosamente mantidos, ausência de valores arbitrários, touch targets >= 44px (`h-11`) e feedback visual claro sem decorators redundantes."
5. **Staff QA & Verification Gatekeeper:** "Aprovado com exigência de suíte de testes verdes, validação de design lint e zero regressões em rotas públicas e privadas."
