# SPEC-CLASSIFIEDS-NICHE-AUDIT-AND-ENHANCEMENT — Auditoria e Aprimoramento Canônico de Classificados, Nichos e Showcases

## 1. Contexto e Motivação
Auditoria ampla de integridade semântica, isolamento estrito contra vazamento cruzado entre nichos (Invariante B.37), unificação de taxonomia dos 16 nichos, eliminação de falsos positivos de detecção de categoria, padronização bidirecional das telas de detalhes (`ClassifiedDetailMobile` e `ClassifiedDetailDesktop`), enriquecimento dos formulários de cadastro e adequação ergonômica tátil e semântica com zero "AI-smell" e zero truncamento de texto (Invariante B.38).

## 2. Requisitos em Sintaxe EARS

### [EARS-01] Resolução Semântica Estrita de Especificações (Anti-Vazamento)
- **Quando** `resolveClassifiedDetailedSpecs` for invocado para qualquer anúncio classificado;
- **O sistema DEVE** inspecionar a categoria do anúncio com isolamento semântico estrito, garantindo que termos literais no título (ex: "cerveja", "picanha", "café", "carro", "auto") NÃO provoquem falsa classificação como `isGrocery` ou `isVehicle` quando a categoria pertencer a nichos declarados como `job`, `service`, `business`, `equipment`, `real_estate`, `hospitality`, `travel`, `agri` ou `event`;
- **Invariante:** B.37 (Zero Vazamento Cruzado entre Nichos).

### [EARS-02] Suporte Canônico aos Nichos Faltantes em `canonical-specs-resolver.ts` e `semantics.ts`
- **Quando** o anúncio for do nicho `event` (Eventos & Ingressos), `agri` (Agronegócio & Maquinário) ou `pharmacy` (Farmácia & Saúde);
- **O sistema DEVE** resolver e exibir as especificações dedicadas correspondentes:
  - `event`: Data, Horário de Abertura/Início, Local/Espaço, Endereço, Classificação Etária, Formato (Presencial/Online), Lotes de Ingressos, Atrações/Palestrantes;
  - `agri`: Horímetro, Tração (4x4/4x2), Ano de Fabricação, Tipo de Implemento, Potência (CV/HP), Cabine com Ar-Condicionado, Laudo/Vistoria;
  - `pharmacy`: Linha/Classificação, Exigência de Receita/Retenção, Laboratório/Fabricante, Princípio Ativo, Registro Anvisa/MS;
- **Invariante:** Cada nicho reflete fielmente os dados cadastrados sem recorrer a layouts genéricos de desapego ou mercadoria comum.

### [EARS-03] Omissão Estrita de Pagamento e Propostas em Vagas de Emprego e Doações
- **Quando** a rota de detalhes de anúncios for renderizada no Desktop (`ClassifiedDetailDesktop`) ou no Mobile (`ClassifiedDetailMobile`) para anúncios de `job` (Vagas) ou `donation` (Doações Solidárias);
- **O sistema DEVE** omitir completamente o bloco "Pagamento & Financiamento" e o botão "Enviar Proposta", exibindo exclusivamente os CTAs condizentes ("Candidatar-se à Vaga" e "Solicitar Doação").

### [EARS-04] Rótulos Semânticos Dinâmicos das Abas de Detalhes
- **Quando** o usuário visualizar qualquer anúncio classificado em desktop ou mobile;
- **O sistema DEVE** renderizar o rótulo da primeira aba de forma contextual derivada do nicho ativo (`getNicheTabLabels`), substituindo a string genérica "Detalhes do Item" por rótulos precisos como "Detalhes do Imóvel", "Detalhes do Veículo", "Detalhes da Vaga", "Detalhes do Serviço", "Sobre o Negócio", "Programação & Ingressos", "Infos do Pacote", "Detalhes do Maquinário", "Especificações & Saúde", "Cardápio & Detalhes", etc.

### [EARS-05] Enriquecimento do Criador de Classificados (`novo.tsx`)
- **Quando** o anunciante acessar o assistente de publicação (`_store.conta.classificados.novo.tsx`);
- **O sistema DEVE** disponibilizar a seleção de Agronegócio (`agri`) e os campos operacionais de `agri` e `farmacia` no Step 3, persistindo seus atributos específicos no JSONB `attributes` sem vazamento ou perda de dados.

## 3. Matriz de Aceite e Evidências
1. `npm run test` cobrindo testes unitários de isolamento semântico, sem regressões.
2. `npm run typecheck` com Exit Code 0 (Zero erros TypeScript).
3. `npm run build` aprovado.
