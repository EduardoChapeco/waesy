# Governança de Arquivos, Pastas & Operações em Lote (Waesy Platform)

> **Single Source of Truth (SSOT)** para manipulação de arquivos estáticos, organização de diretórios, quarentena e segurança contra path traversal e deleções acidentais na plataforma Waesy.
> Referência técnica vinculante: `.agents/skills/file-manager/SKILL.md`.

---

## 1. Princípios de Segurança e Integridade

1. **Deny-by-Default em Diretórios do Sistema:**
   - Bloqueio irrestrito de qualquer operação em diretórios do sistema operacional (`/System`, `/usr`, `/etc`, `C:\Windows`, etc.).
2. **Isolamento de Tenant & Workspace:**
   - Todo arquivo gerado ou manipulado deve residir estritamente dentro do contexto do workspace permitido (`/workspace`, `/uploads`, `/storage`).
3. **Prevenção Estrita de Path Traversal:**
   - Rejeição de sequências relativas de escape (`../`, `..\`) em nomes de arquivos, parâmetros de upload ou rotas de download.
4. **Mandato de Pré-Visualização (Dry-Run Preview):**
   - Nenhuma ação em lote (organização, renomeação, deleção) pode ser aplicada sem antes apresentar o manifesto quantitativo e nominal das operações.

---

## 2. Taxonomia de Pastas Canônicas

| Categoria | Caminho Canônico | Finalidade |
| --- | --- | --- |
| **Documentos** | `Documents/` | PDFs, planilhas, contratos, relatórios financeiros e fiscais. |
| **Imagens** | `Images/` | Banners de loja, produtos, avatares, fotos de vitrine (3:1 panoramic, 1:1 square). |
| **Vídeos** | `Videos/` | Roteiros imersivos, reels de produtos e tutoriais. |
| **Áudio** | `Audio/` | Gravações, notas de voz de atendimento e podcasts locais. |
| **Arquivos Compactados** | `Archives/` | Backups exportados, pacotes de NF-e e arquivos ZIP/TAR. |
| **Código** | `Code/` | Templates JSON, scripts auxiliares e schemas declarativos. |
| **Quarentena** | `_quarantine/` | Arquivos duplicados ou marcados para descarte preventivo. |

---

## 3. Protocolo de Renomeação em Massa

- **Sanitização:** Espaços convertidos em `-`, remoção de acentos e caracteres de escape.
- **Detecção de Colisões:** Conflitos resolvidos automaticamente com sufixo numérico sequencial (`-1`, `-2`), preservando a extensão original.
- **Rastreabilidade:** Registro de logs de antes/depois para possibilitar reversão (Undo).
