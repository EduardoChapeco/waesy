# SPEC-TURISMO: Consolidação Canônica do Pipeline de Turismo, Cockpit Comercial e Construtor Unificado de Propostas
**Status:** Aprovada em Auditoria  
**Data:** 19 de Outubro de 2026  
**Severidade de Débito:** P1 (Fragmentação de rotas e duplicidade funcional)  

---

## 1. Problema e Motivação
A plataforma possui 24 rotas ativas de turismo e CRM comercial no diretório `src/routes/workspace.turismo.*` e `src/routes/workspace.comercial.tsx`, com três implementações concorrentes de construtores de propostas (`UniversalQuoteProposalStudio`, `LeadVisualProposalSheet`, `WorkspaceProposalStudioPage`) e 5 grupos de menu laterais inchados com mais de 20 subitens. O operador do sistema perde produtividade pulando de tela em tela e redigitando informações entre o Kanban, a cotação, a proposta, o contrato e a gestão de embarques.

---

## 2. Requisitos em Sintaxe EARS

### REQ-T01: Construtor Unificado de Propostas
- **Quando** o operador de viagens solicitar a criação de uma proposta (seja de forma avulsa ou a partir de um Lead do CRM),
- **o sistema deve** carregar o componente `UnifiedProposalWorkspace` integrando:
  1. Auto-binding imediato dos dados do Lead (`leadId`, nome, telefone, e-mail, destino).
  2. Autocomplete e busca do Banco de Hotéis (`hotels_bank`).
  3. Cálculo automático por quarto múltiplo e por faixa etária de passageiros (adultos, crianças e bebês).
  4. Campanhas reais de pagamento das operadoras (Orinter, FRT, Incomum, Santander) com parcelamentos, entradas e desconto Pix.
  5. Add-ons de viagem opcionais (seguro viagem, mala 23kg, cadeirinha, transfer privativo).
  6. Leitor OCR multimodal de propostas de operadoras via PDF ou imagem.
  7. Renderização em lâmina visual de estúdio com exportação em PDF e compartilhamento por link rastreável do WhatsApp.

### REQ-T02: Cockpit Comercial Centralizado
- **Quando** o usuário do nicho de Turismo acessar a gestão de sua agência no Workspace,
- **o sistema deve** apresentar a tela `/workspace/turismo` como o Funil Comercial Canônico (Kanban de Oportunidades e Cotações), onde cada card de lead permite disparar a montagem de proposta em drawer in-situ sem redirecionamento para outra página.

### REQ-T03: Transição Transacional de Proposta Ganha para Viagem Confirmada
- **Quando** uma proposta for marcada como "Aprovada" ou "Ganha" pelo operador ou cliente,
- **o sistema deve** executar a função BFF `convertProposalToTrip`, criando automaticamente o registro da viagem em `tourism_trips`, importando os passageiros para `trip_passengers` e disponibilizando a emissão do contrato digital em 1 clique.

### REQ-T04: Gestão Pós-Venda e Embarque Especializada
- **Enquanto** a viagem estiver com status confirmado e data futura,
- **o sistema deve** manter a rota `/workspace/turismo/embarques` como a central de verificação pré-embarque, concentrando checklists de vistos, vacinas, validade de passaporte, bagagem, mapa de assentos de ônibus e links diretos para check-in de companhias aéreas (Latam, Gol, Azul, TAP).

### REQ-T05: Saneamento do Menu de Navegação do Workspace
- **Quando** o menu lateral do Workspace renderizar os links de navegação para empresas do nicho de Turismo,
- **o sistema deve** exibir estritamente 4 nós operacionais canônicos e ZERO emojis:
  1. Vendas & Atendimento (`/workspace/turismo` ou `/workspace/comercial`)
  2. Operações & Viagens (`/workspace/turismo/viagens`)
  3. Pré-Embarque & Pós-Venda (`/workspace/turismo/embarques`)
  4. Contratos & Comissões (`/workspace/turismo/contratos`)

---

## 3. Matriz de Componentes e Arquivos

| Componente Canônico | Origem da Fusão | Destino no Repositório |
| :--- | :--- | :--- |
| `UnifiedProposalWorkspace` | `UniversalQuoteProposalStudio` + `LeadVisualProposalSheet` + `WorkspaceProposalStudioPage` | `src/components/tourism/unified-proposal-workspace.tsx` |
| `WorkspaceTurismoCockpitPage` | `workspace.turismo.cotacoes.tsx` + `workspace.comercial.tsx` | `src/routes/workspace.turismo.index.tsx` |
| `NavGroup Turismo` | 5 grupos consolidados em 4 pilares limpos sem emojis | `src/lib/workspace-navigation.ts` |
