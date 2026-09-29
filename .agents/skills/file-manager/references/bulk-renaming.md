# Renomeação em Massa & Padronização (Bulk Renaming)

> **Objetivo:** Transformar nomes de arquivos desorganizados em padrões limpos, previsíveis e compatíveis com web e sistemas Unix/Windows.

---

## 1. Padrões de Higienização de Nomes

1. **Substituição de Espaços:** Espaços devem ser convertidos em traços (`kebab-case`) ou sublinhados (`snake_case`).
2. **Remoção de Caracteres Especiais:** Eliminação de acentos, caracteres de escape, parênteses e pontuações conflitantes (`!@#$%^&*()[]{}:;,?/`).
3. **Preservação de Extensão:** A extensão original do arquivo DEVE ser mantida intacta e em minúsculas (ex: `.PDF` ➔ `.pdf`).
4. **Padronização de Datas:** Sempre utilizar padrão ISO 8601 (`YYYY-MM-DD`) no prefixo ou sufixo.

---

## 2. Prevenção de Colisão de Nomes

Antes de renomear qualquer arquivo:
- Verificar se o nome pretendido já existe no diretório.
- Se houver colisão, adicionar sufixo sequencial indexado: `nome-arquivo-1.ext`, `nome-arquivo-2.ext`.
- Nunca sobrescrever um arquivo existente durante um processo de renomeação em lote.
