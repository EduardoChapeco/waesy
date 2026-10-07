# SPEC-20261007 — Integridade de Storage, pagamentos e nativização de vitrines

## Escopo autorizado

Esta onda cobre somente:

1. Storage real: upload/download, bucket visibility, namespace, MIME/bytes, ownership e ausência de auto-healing inseguro.
2. Pagamentos reais: provider obrigatório para gateway, ausência de referências sintéticas, falha explícita quando provider/configuração não existe e nenhuma confirmação financeira sem autoridade.
3. Vitrines públicas canônicas: seções/abas somente quando há dados persistidos reais; erro de fonte não pode virar sucesso vazio indistinguível.
4. Nativização de componentes UI legados diretamente envolvidos no renderer de vitrines e mídia, preservando estrutura visual, CTAs, estados e contratos públicos.
5. Testes de regressão e documentação da evidência.

Ficam fora desta microfase: redesign visual amplo, alteração de schemas não necessária ao contrato acima, migrações de dados legados não relacionadas, SimLab e fixtures explicitamente isoladas em `src/lib/simlab` ou rotas SimLab.

## Requisitos EARS

- Quando um upload de produção for solicitado, o sistema deve usar somente buckets provisionados pelo schema e falhar explicitamente se o bucket não existir; nunca criar bucket em runtime.
- Quando um bucket privado for usado, o sistema deve retornar URL assinada ou estado não disponível; nunca persistir ou devolver URL pública como se fosse segura.
- Quando um pagamento externo for iniciado, o sistema deve exigir configuração do provider, resposta HTTP válida e `providerRef` não vazio antes de persistir sucesso/pending.
- Quando um pagamento manual for registrado, o sistema deve persistir referência nula ou referência externa fornecida pelo comprovante; nunca gerar `manual_ref_*` para simular um provider.
- Quando a configuração da loja, coleção ou seção não existir, a UI deve omitir a superfície dependente sem inventar nome, horário, preço, empresa, produto, link ou contagem.
- Quando uma fonte de dados pública falhar, o loader deve preservar o estado de erro observável e não transformar a falha em um estado de negócio vazio sem distinção.
- Quando um componente marcado legacy receber dados canônicos, o sistema deve manter a mesma semântica e nativizar o contrato no renderer sem remover campos visuais, CTA, loading, empty ou error state.

## Findings iniciais confirmados

| ID | Severidade | Evidência | Estado inicial |
|---|---|---|---|
| INT-STORAGE-01 | high | `src/services/storage.functions.ts:221-233,380-394,510-524,579-593`: auto-criação de buckets públicos em runtime, inclusive após endurecimento versionado | reproduzido por inspeção |
| INT-STORAGE-02 | high | `src/services/storage.functions.ts:163-178,239-245,286-290,334-339,599-633`: vários fluxos usam `getPublicUrl`; contratos não distinguem bucket privado e alguns persistem URL pública | reproduzido por inspeção |
| INT-STORAGE-03 | medium | `getSignedUploadUrl` aceita `brand-assets` no Zod, mas `ALLOWED_BFF_BUCKETS` não contém esse bucket; contrato diverge em produção | reproduzido por inspeção |
| INT-PAY-01 | high | `src/services/payment-gateway.server.ts:64-69`: resposta 2xx com `payload.id` ausente gera `providerRef` vazio e pode ser persistida | reproduzido por inspeção |
| INT-PAY-02 | high | `src/services/payment.functions.ts:218-229`: confirmação manual cria `provider_ref: manual_ref_${orderId}`, referência sintética apresentada como referência financeira | reproduzido por inspeção |
| INT-PAY-03 | high | `src/services/checkout.functions.ts:84-104,129-168`: configuração default hardcoded é devolvida quando não há loja; campos comerciais não configurados ganham comportamento fictício | reproduzido por inspeção |
| INT-PAY-04 | medium | `src/services/checkout.functions.ts:390-396`: erro de provider de frete é apenas warning e o checkout continua, mascarando integração indisponível | reproduzido por inspeção |
| INT-UI-01 | high | `src/components/commerce/canonical-store-profile-view.tsx:188-194,326-328`: cidade, estado e horário default quando dados reais não existem | reproduzido por inspeção |
| INT-UI-02 | high | `src/routes/_store.loja.$slug.tsx:74-103,123-141` e `src/routes/_store.diretorio.$id.tsx:44-60,206-220`: falhas de consultas são convertidas em arrays vazios; browser não distingue loja sem dados de integração quebrada | reproduzido por inspeção |
| INT-UI-03 | medium | `src/components/commerce/canonical-store-profile-view.tsx:117-136`: localStorage pode reidratar configuração de vitrine sem confirmação de persistência do servidor | reproduzido por inspeção |
| INT-UI-04 | medium | `src/components/commerce/experience-renderer.tsx:91-102,725+,831+` e rails `product-rail/product-carousel/testimonial/store-*`: bridges e fallbacks legacy permanecem no caminho canônico | reproduzido por inspeção |
| INT-UI-05 | medium | `src/routes/_store.diretorio.$id.tsx:151-168`: fallback para classificados e produtos minerados torna um perfil sem catálogo oficial visualmente populado por fontes alternativas | reproduzido por inspeção |

## Critérios de aceite

- Nenhum runtime de produção chama `storage.createBucket` em upload.
- Nenhum caminho de pagamento externo persiste sucesso/pending sem providerRef válido; nenhum `manual_ref_*` é gerado.
- Configuração ausente resulta em `unconfigured`/erro explícito ou superfície omitida, não em valores comerciais default.
- Abas Catálogo, Posts, Avaliações, Vagas, Patrocinadores, Concursos e rails dependentes só existem quando seus arrays reais têm itens; o estado inicial inválido não deixa uma aba inacessível renderizar seção vazia.
- Dados de diretório não misturam classificados/mineração com catálogo oficial sem contrato e rótulo de proveniência explícitos; nesta onda a superfície oficial omite o catálogo se não houver catálogo oficial.
- Componentes nativizados preservam CTA, classes/layout, focus-visible, loading, empty, error e interação existentes.
- Testes positivos e negativos cobrem cada finding corrigido; typecheck, lint, suíte relevante e build passam.

## Ordem de microfases

1. Storage contract hardening + testes.
2. Payment provider integrity + testes.
3. Public storefront data contract + tests for omission/error.
4. Nativização do renderer/rails diretamente afetados.
5. Gates, diff adversarial, commit, PR, checks e merge.
