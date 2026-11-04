# 21 — Áreas Não Verificadas e Limitações de Ambiente

## 1. Limitações de Acesso e Provedores Externos
- **Emissão Real de NF-e na SEFAZ:** O código de montagem de XML e envio para a API da Focus NFe está completo, mas testes ponta a ponta com certificados digitais A1 reais exigem ambiente de homologação com chaves privadas criptografadas.
- **Leitor Físico TEF de Cartão:** A interface de PDV contém a estrutura para conciliação de maquininhas, mas hardware físico externo não está conectado ao ambiente de build.
- **Disparo Real de SMS / WhatsApp Oficial da Meta:** O envio de mensagens depende de credenciais ativas do WhatsApp Cloud API ou Evolution API conectadas no cofre de segredos.
