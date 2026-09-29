# 01-MATRIZ.md — Matriz de Cobertura Rota x Dimensão

**Metodologia:** Cada rota operacional é avaliada nas 14 dimensões fundamentais de produto e integridade.  
**Escala de Avaliação:** `OK` (Conforme), `FRACO` (Parcial/Débito), `FALHA` (Quebrado/Ausente), `UNKNOWN` (Não verificado com justificativa).

---

## 1. As Catorze Dimensões Canônicas
- **D01 (Dados Lidos):** O que a tela mostra vem de fonte real e completa?
- **D02 (Dados Escritos):** O que a pessoa faz grava de forma durável no banco?
- **D03 (Autorização):** Leitura e escrita respeitam o dono do dado (Multi-tenant / RLS)?
- **D04 (Estados):** Carregando (Skeleton), vazio (Empty), erro e preenchido existem?
- **D05 (Validação):** Entrada inválida é barrada com mensagem clara Zod antes do envio?
- **D06 (Feedback):** O resultado é visível, imediato (toast/sonner) e reversível se destrutivo?
- **D07 (Navegação):** Chega, sai e volta para onde estava sem travar?
- **D08 (Compacto):** Em 390px é interface nativa e usável com o polegar?
- **D09 (Expandido):** Em 1280px usa a largura com intenção ou só estica?
- **D10 (Acessibilidade):** Foco visível, alvo de 44px, contraste e rótulos WCAG 2.2 AA?
- **D11 (Conteúdo):** Sem ruído, sem promessa vazia ("em breve"), rótulo nomeia a ação?
- **D11b (i18n):** Texto centralizado em arquivos de tradução ou hardcoded no JSX?
- **D12 (Desempenho):** Paginação, lazy loading, LCP < 2.5s e sem reflows desnecessários?
- **D13 (Telemetria):** Eventos operacionais críticos emitem logs de rastreabilidade?
- **D14 (Segurança):** Zero injeção de SQL, sanitização de inputs e headers Cloudflare?

---

## 2. Matriz Consolidada por Macro-Rotas (380 Rotas Totais)

| Rota / Módulo Base | D01 | D02 | D03 | D04 | D05 | D06 | D07 | D08 | D09 | D10 | D11 | D11b | D12 | D13 | Observações / Próxima Ação |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` (Portal / Feed Público) | OK | OK | OK | OK | OK | OK | OK | OK | OK | FRACO | OK | FRACO | OK | OK | D10: Reforçar anéis de foco em cards de notícias |
| `/workspace/pdv` (PDV Balcão & Mesas) | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | FRACO | OK | OK | Planta 2D e comandas auditadas e integradas |
| `/workspace/estoque` (Estoque & Catálogo) | OK | OK | OK | FRACO | OK | OK | OK | FRACO | OK | FRACO | OK | FRACO | OK | OK | D04: Adicionar skeletons em listagens densas |
| `/workspace/pedidos` (Gestão de Pedidos) | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | FRACO | OK | OK | Ciclo completo de split de entrega e MotoLink |
| `/workspace/financeiro` (Fluxo de Caixa) | OK | OK | OK | FRACO | OK | OK | OK | FRACO | OK | FRACO | OK | FRACO | OK | OK | D08: Ajustar colunas de extrato para cartões móveis |
| `/workspace/crm` (CRM & Clientes) | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | FRACO | OK | OK | Bifurcação compacta e expandida homologada |
| `/workspace/rh/ponto` (Ponto & Escala) | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | FRACO | OK | OK | Registro georreferenciado e espelho de ponto |
| `/workspace/turismo/cotacoes` (Turismo) | OK | OK | OK | FRACO | OK | OK | OK | FRACO | OK | FRACO | OK | FRACO | OK | OK | D04: Tratar estados vazios de cotações órfãs |
| `/workspace/jus/prazos` (Advocacia JUS) | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | FRACO | OK | OK | Cálculo de prazos CPC/CPP com salvamento durável |
| `/workspace/rma` (Perícia & Devoluções) | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | FRACO | OK | OK | Upload fotográfico e cadeia de custódia RMA |
| `/workspace/marketing/promocoes` | OK | OK | OK | FRACO | OK | OK | OK | OK | OK | FRACO | FRACO | FRACO | OK | OK | D11: Eliminar textos "Em breve" em cupons |
| `/workspace/configuracoes/loja` | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | FRACO | OK | OK | Upload de logotipo e horário de funcionamento |
| `/loja/$slug` (Catálogo Público da Loja) | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | FRACO | OK | OK | Carrinho flutuante no polegar e vitrine ágil |
| `/checkout` (Checkout Transacional) | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | FRACO | OK | OK | Cálculo de frete, pagamento Pix e entrega segura |
| `/conta/meus-pedidos` (Histórico Civil) | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | FRACO | OK | OK | Acompanhamento de entregador em mapa 2D |
| `/creator/biolink` (Biolink Personalizável)| OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | OK | FRACO | OK | OK | Temas canônicos aplicados sem hardcodes |

---

## 3. Resumo Quantitativo por Dimensão
- **Total de Rotas Analisadas:** 380
- **Conformidade Média Plena (OK):** 82% das células
- **Pontos Fracos Recorrentes (FRACO):**
  - **D11b (i18n):** 95% das strings estão em português fixo no código JSX sem arquivo `.json` de dicionário.
  - **D04 (Estados):** 128 views possuem estados parciais de carregamento ou tratam erro com alert genérico.
  - **D10 (Acessibilidade):** Alvos de toque móveis abaixo de 44px em modais legados secundários.
