# SPEC-20261107-EXTENSION-STORE-AND-ACCESS-GOVERNANCE.md
# Vitrine Chrome Web Store de Extensões, Governança de Acesso e Gestão no Admin Master

## 1. Contexto e Problema
Na implementação anterior (DEC-463), as extensões de navegador (`infotravel_extension`, `whatsapp_extension`, `infotravel_miner`) foram encapsuladas com empacotamento PKZIP puro em memória e proteção de download restrita ao Admin Master e à agência parceira padrão Excelência Tour São Miguel do Oeste.
Para os demais tenants da plataforma, o acesso era bloqueado diretamente com erro 403 Forbidden.
O requisito atual demanda:
1. Em vez de uma rejeição opaca ou botão inativo, exibir para os lojistas/agências uma **Vitrine Estilo Chrome Web Store**, apresentando claramente o propósito de cada ferramenta, screenshots conceituais, recursos de produtividade, políticas de privacidade LGPD e requisitos de sistema.
2. Disponibilizar um fluxo formal e descomplicado de **"Pedir Autorização" (Solicitar Acesso)**, onde o operador informa os dados da agência e a demanda operacional.
3. No **Admin Master** (`/admin-master/modulos`), disponibilizar painel de gestão de solicitações onde o administrador visualiza a fila em tempo real, avalia a demanda e pode liberar ou revogar o acesso para qualquer loja individualmente com 1 clique.
4. Integrar o controle de acesso de forma que, ao ser aprovada, a loja ganhe permissão imediata para baixar e sincronizar com a respectiva extensão.

---

## 2. Requisitos em Sintaxe EARS

### EARS-01: Exibição da Vitrine Chrome Web Store (Ubíquo)
O sistema DEVE disponibilizar o componente `ExtensionWebStoreModal` com estética canônica de Web Store (ícone, selos de verificação, resumo de recursos, compatibilidade e guias de instalação), acessível a partir do painel de fornecedores de turismo, modal de ingestão do WhatsApp e governança de módulos.

### EARS-02: Estado Condicional da Ação Primária (Orientado a Eventos)
QUANDO um usuário autenticado abrir a vitrine de uma extensão:
1. SE a loja já estiver autorizada (Admin Master, Excelência Tour SMO ou whitelisted no banco), o sistema DEVE renderizar o botão primário "Baixar Extensão (.zip)" (`h-11 min-h-11`) e badge de status "Acesso Autorizado".
2. SE a loja NÃO estiver autorizada e houver solicitação pendente, o sistema DEVE exibir o alerta "Solicitação em Análise pelo Administrador Master" com data do pedido e desabilitar nova solicitação.
3. SE a loja NÃO estiver autorizada e NÃO houver solicitação ativa, o sistema DEVE renderizar o botão primário "Pedir Autorização" (`variant="default"` `h-11 min-h-11`) com badge "Acesso sob Demanda".

### EARS-03: Submissão de Solicitação de Acesso (Orientado a Eventos)
QUANDO o operador civil/lojista clicar em "Pedir Autorização" e preencher a justificativa:
O sistema DEVE registrar a solicitação em `extension_access_requests` (com fallback em `stores.settings.extension_access_requests`), marcando status `'pending'`, e notificar o usuário com toast de confirmação.

### EARS-04: Gestão de Solicitações no Admin Master (Orientado a Eventos)
QUANDO o Admin Master acessar a aba de Extensões em `/admin-master/modulos`:
O sistema DEVE carregar a fila de solicitações pendentes e aprovadas, exibindo nome da loja, cidade, solicitante, justificativa e botões de ação tátil para "Liberar Acesso" e "Rejeitar/Revogar".

### EARS-05: Concessão Direta de Acesso a Qualquer Loja (Opcional / Master)
O Admin Master DEVE poder pesquisar e selecionar qualquer loja cadastrada no ecossistema Waesy para conceder ou revogar autorização imediata a qualquer pacote de extensão, persistindo em `stores.settings.authorized_extensions`.

### EARS-06: Verificação de Segurança no Servidor (Invariante)
QUANDO qualquer requisição de download for disparada em `/api/v1/extensions/download`:
O servidor DEVE autorizar se:
1. O usuário for Admin Master (`isPlatformAdminUser`), OU
2. A loja for Excelência Tour SMO (`isExcelenciaTourStore`), OU
3. A loja possuir a extensão listada em `stores.settings.authorized_extensions`, OU
4. Houver registro com status `'approved'` em `extension_access_requests`.
Caso contrário, DEVE responder HTTP 403 Forbidden com payload estruturado contendo `{ error: "...", can_request: true }`.

---

## 3. Matriz de Estados de Interface (4 Estados Canônicos)

| Estado | Comportamento Visual na Vitrine |
| :--- | :--- |
| **Autorizado** | Badge de verificação esmeralda ("Acesso Autorizado"), botão ativo "Baixar Extensão (.zip)" e guia passo a passo de instalação. |
| **Pendente** | Badge âmbar ("Em Análise pelo Admin Master"), card informativo com data do envio e bloqueio de reenvio concorrente. |
| **Não Solicitado** | Badge neutro ("Acesso sob Demanda"), botão primário "Pedir Autorização" e formulário com preenchimento automático. |
| **Rejeitado** | Badge vermelho ("Acesso Não Liberado"), justificativa do administrador e opção para solicitar reavaliação. |

---

## 4. Evidências de Validação
1. Testes automatizados em `extensions-distributor.server.test.ts` cobrindo aprovação via `settings.authorized_extensions`.
2. Build limpo sem erros de tipo TypeScript (`npm run typecheck`).
3. Catraca de CI de design lint (`node scripts/design-lint.mjs --ratchet`) aprovada com 0 violações P0/P1.
4. Registro canônico em `docs/design/DECISIONS.md`.
