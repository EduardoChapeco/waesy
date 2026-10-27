# Plano de Expansão e Refinamento de CRM no Viaja OS

Este documento traça a arquitetura completa para cobrir todas as requisições envolvendo CRM (Gestão de Clientes), uploads complexos de mídias/documentos, integrações de endereço, permissões de portal e correções de UX.

## ⚠️ Ação Imediata Concluída
Resolvi o **Reload de Abas (UX do navegador):** O problema de perder dados quando mudamos de aba envolvia o sistema agressivo do *React Query* chamado `refetchOnWindowFocus`, que estava re-renderizando a interface de forma indesejada. Ele **já foi desativado nativamente no `App.tsx`**. O sistema não dará mais resets quando você trocar de abas!

---

## Proposta de Alterações — Arquitetura de Expandida

---

### [Módulo: Correção e Políticas de Storage (Buckets)]
O Supabase armazena seus uploads na camada Storage (`storage.objects`). Como você observou, arquivos novos não podiam ser lidos devido à falta das permissões ou exclusão dos buckets no seu ambiente.
#### Novo SQL de Migração (Seed / Supabase Exec)
- [NEW] Script SQL focado em criar condicionalmente os Buckets `media` e `documents`.
- [NEW] Criação de **Políticas RLS** (`CREATE POLICY`) para garantir permissões de acesso público e manipulação completa (Upload, View e Update), resolvendo o comportamento de limite de MB, garantindo arquivos de alta qualidade.

---

### [Módulo: Gestor Avançado de Arquivos e Recorte de Fotos (Cropper)]
Necessidade de suportar múltiplas fotos do cliente, e interface de corte/mascaramento de perfil, bem como múltiplas mídias "infinitas" no cadastro do cliente.
- Instalação das bibliotecas nativas de corte de imagem React (`react-easy-crop` ou equivalente leve já embarcado nos pacotes recomendados).
- Criação de um modal nativo *ProfileImageCropper* ou adequar `ClientEditSheet` para recortar/salvar foto do avatar usando canvas base64 e salvando via Storage com qualidade otimizada, refletindo em `photo_url`.
- Geração de uma nova seção `preferences.gallery_urls: string[]` mapeada ao lado da foto de capa.

---

### [Módulo: Documentos Dinâmicos e Profissionais]
Você solicitou que existam painéis específicos para tipos exatos (CRM, OAB, Documentos) contendo metadados como Validade, Número, Tipo.
#### Alterações: `ClientEditSheet.tsx` & `useClients.ts`
- Modificar o armazenamento de documentos (que havia sido movido para array solto) para um array de **objetos estruturados** em `preferences.documents`:
  `Array<{ type: 'passport'|'crm'|'oab'|'cpf'|'outros', number: string, expiry_date: string, file_url: string, description: string }>`
- Implementar lista dinâmica permitindo adicionar infinitos blocos com formulário e botão de upload embutido em cada bloco.

---

### [Módulo: Endereço Inteligente e Comprovante]
- **API ViaCEP:** Incluir lógica no `ClientEditSheet.tsx` que, ao digitar um CEP (Brasil), dispare `fetch('viacep.com.../json/')`, completando os dados de logradouro, bairro, cidade e estado magicamente.
- Incorporar upload de "Comprovante de Resistência" vinculado unicamente ao bloco de endereço (também convertido e salvo na cloud).

---

### [Módulo: Árvore Familiar & Vínculo de Agentes]
Clientes independentes e relacionados, com dependentes diretos (membros familiares/children).
- **Banco de Dados (Relacionamento de Clientes):** Criação da tabela `client_relationships` ligando Mapeamentos Familiares (Pai, Mae, Filho, Cônjuge) entre a própria tabela de `clients`.
- **Sheet de Vínculo:** Aba na `ClientEditSheet.tsx` que permite consultar outros usuários na agência e adicionar as Tags/Tipos de Relação (ex: "Filho do cliente Eduardo").
- **Agentes Associados:** Utilizar o campo existente `assigned_agent_id` em `clients`, liberando um Dropdown onde agentes designam clientes a determinados vendedores.

---

### [Módulo: Portal do Cliente (Magic Link)]
- Esclarecer o fluxo na User Interface:
  - Adicionar no `ClientDetail.tsx` (ou Sheet Rápida) o Botão de "Copiar Link do Portal".
  - Exibição de um bloco na tela principal que ensina ao Agente que os portais estão nas rotas independentes da plataforma (ex: `/portal-trip/[token]`).

---

## ❓ Questões em Aberto (Para seu alinhamento)

1. Você prefere que a funcionalidade do *mini-mapa de pesquisa* (Endereço MapBox) seja postergada agora e foquemos na **auto-completação via CEP + Anexo do Comprovante**, para não burocratizar demais requisições de chave MapBoqx de início?
2. Para cortar imagens, concorda em incluirmos a biblioteca (`react-image-crop` ou deixamos que o Javascript nativo apenas expanda/reduza o aspect-ratio na pré-visualização)?

---
*Assim que revisar e autorizar este plano, entrarei na execução técnica e construição de código e ferramentas.*
