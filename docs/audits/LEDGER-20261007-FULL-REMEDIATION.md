

## Fechamento W7.1 — contrato canônico de provider WhatsApp — 2026-10-07

O drift confirmado foi corrigido sem alterar branches paralelas: o webhook oficial agora separa explicitamente `WHATSAPP_CREDENTIAL_PROVIDER` (`whatsapp_cloud_api`, namespace histórico de `integration_credentials`) de `WHATSAPP_META_CHANNEL_PROVIDER` (`meta_cloud_api`, namespace operacional de `whatsapp_channel_instances`, identidades, mensagens e flows). O endpoint não propaga mais o provider de credencial para o domínio de canal. Evolution/WaSender ficaram fora do escopo.

**Evidências locais:** regressão focada `5 arquivos / 24 testes` passou; typecheck passou; referências estáticas e `git diff --check` passaram. A prova ainda é de código/teste local: banco, RLS, webhook Meta real, provider outbound, replay concorrente, CI/deploy e produção continuam não verificados.
