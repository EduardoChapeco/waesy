# SPEC: Encapsulamento, Governança de Download e Modernização de Popups das Extensões Waesy

**Código:** `SPEC-20261107-EXTENSIONS-ENCAPSULATION-AND-DISTRIBUTION`
**Data:** 2026-11-07
**Status:** Aprovado para Execução
**Autor:** Antigravity (BigTech Architecture & Security Guard)
**Escopo de código previsto:**
- `src/lib/zip-packager.ts`: Compactador ZIP puro em memória (zero dependências externas).
- `src/services/extensions-distributor.server.ts`: Serviço de montagem de pacotes, metadados e controle de permissões.
- `src/services/extensions-distributor.functions.ts`: Funções de servidor TanStack Start para autorização e status.
- `src/routes/api.v1.extensions.download.ts`: Endpoint HTTP autenticado para streaming de download de arquivos `.zip`.
- `tools/infotravel-extension/`: Atualização de `manifest.json`, `popup.html` (540px), `popup.js`, `background.js`, `content.js`, `README.md`.
- `tools/whatsapp-extension/`: Criação de `manifest.json`, `popup.html` (540px), `popup.js`, `background.js`, `content.js`, `README.md`.
- `tools/infotravel-miner/`: Modernização de scripts e guias de extração.
- `src/components/admin/infotravel-integration-panel.tsx`: Botões funcionais de 1 clique para baixar a extensão e os scripts.
- `src/components/commercial/whatsapp-group-ingest-modal.tsx`: Botão funcional de 1 clique para baixar a extensão do WhatsApp.
- `src/routes/workspace.turismo.fornecedores.tsx`: Integração visível do painel de operadoras e extensões no Workspace de Turismo.

---

## 1. Problema e Justificativa

1. As extensões de navegador e scripts de automação estavam isolados no diretório local `tools/` da máquina do desenvolvedor, sem mecanismo de entrega ou distribuição pelo sistema web.
2. Em `InfotravelIntegrationPanel`, os botões de ação emitiam apenas mensagens de orientação em toast (`toast.info("A pasta da extensao esta localizada...")`), impedindo o operador de baixar e instalar a extensão diretamente pelo painel.
3. Não havia extensão compilada física para o módulo de ingestão de contatos de grupos do WhatsApp, embora a API `/api/v1/ingest/whatsapp-contacts` já estivesse homologada no backend.
4. Risco de vazamento de propriedade intelectual e credenciais: as extensões e scripts não podem ficar abertos a visitantes públicos ou concorrentes. Devem exigir autenticação rígida e autorização exclusiva para a agência **Excelência Tour São Miguel do Oeste** e administradores globais (**Admin Master**).
5. O popup da extensão Infotravel era excessivamente estreito (380px), sem abas e com URLs fixas, destoando da sofisticação e amplitude do Waesy Design System 4.0.

---

## 2. Princípios de Segurança e BigTech Standards

- **Zero Unauthenticated Access (Barreira Zero-Trust):** Nenhuma extensão ou script pode ser baixado sem autenticação de sessão ou token.
- **Isolamento de Tenant & Reconhecimento Canônico:** O acesso ao download é concedido estritamente para `isAdminMaster` ou `isExcelenciaTourStore(store)`. Qualquer outra requisição recebe `HTTP 403 Forbidden`.
- **Zero Dependências Pesadas:** Geração de arquivos `.zip` em memória via padrão PKZIP e `node:zlib` nativo, garantindo performance submilisegundo e compatibilidade com ambientes serverless.
- **Ergonomia e Consistência Visual:** Popups com largura ampla de 540px, tipografia estruturada, alvos de toque >= 44px (`h-11 min-h-11`), foco visível `:focus-visible:ring-2`, e erradicação total de AI-Smell.

---

## 3. Requisitos EARS

### 3.1 Governança de Autorização e Download
- **QUANDO** um usuário autenticado com perfil de Admin Master ou vinculado à loja Excelência Tour São Miguel do Oeste solicitar o download de uma extensão (`infotravel_extension`, `whatsapp_extension` ou `infotravel_miner`), o sistema **DEVE** gerar e transmitir o arquivo compactado `.zip` correspondente via streaming HTTP com cabeçalhos `Content-Type: application/zip` e `Content-Disposition: attachment`.
- **SE** a requisição de download for realizada por um usuário não autenticado, o sistema **DEVE** retornar `HTTP 401 Unauthorized`.
- **SE** o usuário autenticado pertencer a outra loja não autorizada e não possuir grant de Admin Master, o sistema **DEVE** retornar `HTTP 403 Forbidden` com a mensagem `"Acesso restrito. Este recurso operacional é exclusivo para a agência Excelência Tour São Miguel do Oeste e administradores autorizados."`.

### 3.2 Extensão Infotravel (Waesy Sync • Operadoras)
- O popup da extensão **DEVE** possuir largura de 540px e altura de 560px, dividido em 4 abas estruturadas:
  1. *Visão Geral:* Grid 2x2 com cards de métricas (Reservas, Passageiros, Volume R$, Comissão R$), slider de ritmo humano (jitter anti-bloqueio) e botão de alternância de sincronização.
  2. *Cotações & Radar:* Lista de orçamentos de voos e hotéis capturados passivamente no DOM, com botão proeminente de envio para o Waesy CRM & Radar.
  3. *Conexão Waesy:* Configuração da URL do Servidor e Store ID, com teste de conectividade em tempo real.
  4. *Logs & Exportação:* Download de CSV formatado com BOM UTF-8 e ponto-e-vírgula para Excel, JSON completo e terminal de telemetria.

### 3.3 Extensão WhatsApp (Waesy Ingest • WhatsApp Web)
- A extensão **DEVE** operar no WhatsApp Web (`https://web.whatsapp.com/*`) através do Manifest V3.
- O content script **DEVE** ler o grupo ou conversa ativa no DOM, extrair com segurança os participantes, números de telefone e nomes sem travar o WhatsApp.
- O popup da extensão **DEVE** possuir 540px de largura com:
  1. Identificação do grupo atual e contagem de contatos detectados.
  2. Prévia dos contatos com máscara telefônica nacional (+55 DDD NNNNN-NNNN).
  3. Envio idempotente com chave de idempotência SHA-256 e Bearer Token para `/api/v1/ingest/whatsapp-contacts`.
  4. Configuração de Token e URL do Servidor com validação imediata via `/api/v1/ingest/whoami`.

### 3.4 Interface do Sistema (Workspace & Admin Master)
- O componente `InfotravelIntegrationPanel` **DEVE** substituir os toasts informativos por botões táteis de download direto (`Baixar Extensão (.zip)` e `Baixar Extrator (.zip)`).
- O componente `WhatsAppGroupIngestModal` **DEVE** fornecer botão tátil de download direto (`Baixar Extensão WhatsApp (.zip)`) acompanhado do guia rápido em 3 passos.
- A rota `/workspace/turismo/fornecedores` **DEVE** incorporar o painel de integração de operadoras para que os consultores da Excelência Tour possam gerenciar e baixar as ferramentas diretamente do seu ambiente de trabalho de turismo.

---

## 4. Plano de Verificação e Critérios de Aceite

1. **Testes Unitários (Vitest):**
   - Validação da geração de arquivo ZIP pelo compactador em memória (assinatura PKZIP `0x04034b50`, integridade de arquivos e pastas).
   - Validação da barreira de autorização (permissão concedida para Excelência Tour e Admin Master; bloqueio 403 para terceiros).
2. **Design Lint Ratchet:**
   - Zero novas violações P0/P1 nos componentes e páginas alteradas (`node scripts/design-lint.mjs --ratchet`).
3. **TypeScript & Build:**
   - Zero erros no typecheck (`npm run typecheck`).
   - Compilação de produção sem erros (`npm run build`).
