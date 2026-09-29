# Classificação & Organização em Lote (Batch Organization)

> **Objetivo:** Estabelecer taxonomia canônica para agrupamento de arquivos desordenados em estruturas de pastas limpas e consistentes.

---

## 1. Mapeamento Canônico de Extensões por Categoria

| Categoria | Subdiretório | Extensões Suportadas |
| --- | --- | --- |
| **Documentos** | `Documents/` | `.pdf`, `.doc`, `.docx`, `.txt`, `.odt`, `.rtf`, `.xls`, `.xlsx`, `.csv`, `.ppt`, `.pptx`, `.epub` |
| **Imagens** | `Images/` | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`, `.bmp`, `.ico`, `.tiff`, `.heic`, `.raw` |
| **Vídeos** | `Videos/` | `.mp4`, `.mov`, `.avi`, `.mkv`, `.wmv`, `.flv`, `.webm`, `.m4v` |
| **Áudio** | `Audio/` | `.mp3`, `.wav`, `.ogg`, `.flac`, `.aac`, `.m4a`, `.wma` |
| **Arquivos Compactados** | `Archives/` | `.zip`, `.rar`, `.7z`, `.tar`, `.gz`, `.bz2`, `.xz`, `.tgz` |
| **Código & Configuração** | `Code/` | `.ts`, `.tsx`, `.js`, `.jsx`, `.json`, `.html`, `.css`, `.py`, `.sh`, `.sql`, `.yaml`, `.yml` |
| **Outros / Não Identificados** | `Others/` | Extensões raras, arquivos sem extensão ou binários genéricos |

---

## 2. Fluxo de Execução da Organização

1. **Varredura (Scan):**
   - Ler os arquivos no diretório alvo (ignorando subdiretórios já existentes).
2. **Classificação (Classification):**
   - Mapear cada arquivo para sua pasta de destino de acordo com a extensão.
3. **Plano de Operações (Plan Generation):**
   - Quantificar os arquivos por categoria e identificar exceções.
4. **Exibição do Manifesto (Dry-Run Preview):**
   - Apresentar o resumo quantitativo e pedir confirmação.
5. **Execução Atômica:**
   - Criar diretórios que ainda não existem (`mkdir -p`).
   - Mover cada arquivo individualmente tratando possíveis erros de permissão ou bloqueio.
6. **Relatório Consolidado:**
   - Emitir contagem final de arquivos movidos, ignorados e erros.
