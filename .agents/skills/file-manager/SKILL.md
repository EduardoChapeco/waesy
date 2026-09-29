---
name: file-manager
description: Manage files and folders with create, move, copy, delete, and batch organization capabilities. Use when organizing directories, renaming files in bulk, or cleaning up cluttered folders.
---

# Gerenciador de Arquivos & Pastas (File Manager)

> **Missão:** Gerenciar arquivos e diretórios com precisão cirúrgica, automação em lote e medidas de segurança absolutas. Toda operação destrutiva ou em massa exige validação prévia de integridade, bloqueio de caminhos de sistema e exibição obrigatória de manifesto de pré-visualização (Dry-Run Preview).

---

## ⚡ Invocação e Uso

```bash
/file-manager $ARGUMENTS
```

Organize pastas sobrecarregadas, execute renomeações em lote padronizadas, identifique arquivos duplicados e gerencie a estrutura do workspace com confirmação explícita e segurança.

---

## 🎯 Competências Essenciais

### 1. Operações com Arquivos
- **Criar arquivos:** Inicialização segura com metadados, codificação UTF-8 explícita e integridade de caminho.
- **Copiar e Mover:** Preservação de atributos, verificação de espaço em disco e prevenção de sobrescrita acidental.
- **Renomear:** Sanitização de caracteres proibidos, normalização de extensões e resolução atômica.
- **Excluir:** Suporte a quarentena/lixeira antes da deleção definitiva e manifesto explícito prévio.

### 2. Operações com Pastas
- **Criar pastas:** Criação recursiva (`mkdir -p`) garantindo permissões adequadas de leitura/escrita.
- **Listar conteúdo:** Varredura detalhada com tamanho de arquivo, contagem de filhos e filtros glob/regex.
- **Copiar pastas:** Cópia recursiva com preservação de hierarquia e tratamento de symlinks.
- **Excluir pastas:** Remoção recursiva controlada com bloqueio inegociável de diretórios raiz ou críticos.

### 3. Processamento em Lote (Batch Operations)
- **Classificar por tipo de arquivo:** Agrupamento automático em subdiretórios padronizados (`Documents`, `Images`, `Videos`, `Archives`, `Code`, `Audio`, `Others`).
- **Renomear em lote (Bulk Rename):** Aplicação de padrões regex, numeração sequencial, prefixos de data e remoção de caracteres indesejados.
- **Detecção de duplicatas:** Varredura em duas fases (tamanho de arquivo + hash criptográfico SHA-256) para erradicar redundâncias sem perda de dados.
- **Organização de pastas caóticas:** Limpeza inteligente de diretórios sobrecarregados (ex: `~/Downloads`, `/uploads`, pastas temporárias).

---

## 🛡️ Regras de Segurança Invioláveis (Safety Guardrails)

### Operações Proibidas (Absolute Blacklist)
- **Diretórios do Sistema Operacional:** É terminantemente PROIBIDO criar, mover, alterar ou deletar qualquer arquivo ou pasta dentro de:
  - Linux/Unix: `/System`, `/usr`, `/bin`, `/sbin`, `/etc`, `/dev`, `/proc`, `/sys`, `/var/root`, `/root`.
  - Windows: `C:\Windows`, `C:\Program Files`, `C:\Program Files (x86)`, `C:\System Volume Information`, `C:\Recovery`, `C:\bootmgr`.
- **Arquivos Críticos de Repositório & Segurança:** Bloqueio de exclusão em massa em `.git`, `.env*`, `.ssh`, chaves privadas (`*.pem`, `*.key`) e certificados.
- **Arquivos de Outros Usuários:** Operações limitadas estritamente ao diretório do workspace ou usuário corrente autenticado.
- **Exclusão sem Confirmação:** Nenhuma remoção de arquivo ou diretório pode ser disparada sem exibir a lista nominal completa dos alvos a serem excluídos.

### Confirmações & Prevenções Mandatórias
1. **Pré-visualização Obrigatória (Dry-Run):** Antes de mover, renomear ou deletar múltiplos itens, o agente DEVE exibir o resumo quantitativo e nominal das operações planejadas.
2. **Aviso de Sobrescrita:** Se um arquivo de destino já existir, a operação DEVE solicitar confirmação explícita com exibição das datas e tamanhos dos arquivos em conflito.
3. **Prevenção de Path Traversal:** Rejeição de caminhos com sequências maliciosas (`../`, `..\\`) que tentem escapar do limite do workspace permitido.

---

## 📋 Padrão de Formato de Saída (Output Specifications)

### 1. Pré-visualização Antes da Operação (Dry-Run Preview)

```text
The following operations will be performed:
- Move 15 PDF files to Documents/
- Move 23 image files to Images/
- Skip 3 files of unknown type

Confirm?
```

### 2. Resultados Após a Operação (Post-Operation Summary)

```text
✓ Complete
  - Moved: 38 files
  - Skipped: 3 files
  - Errors: 0
```

---

## 💡 Exemplos de Automação Canônica

### Organização de Pasta Downloads / Uploads (Bash)
```bash
# Criação das pastas de destino estruturadas
mkdir -p ~/Downloads/{Documents,Images,Videos,Archives,Others}

# Classificação por tipos de arquivos
mv ~/Downloads/*.pdf ~/Downloads/Documents/ 2>/dev/null || true
mv ~/Downloads/*.{jpg,jpeg,png,gif,webp,svg} ~/Downloads/Images/ 2>/dev/null || true
mv ~/Downloads/*.{mp4,mov,avi,mkv} ~/Downloads/Videos/ 2>/dev/null || true
mv ~/Downloads/*.{zip,rar,7z,tar,gz} ~/Downloads/Archives/ 2>/dev/null || true
```

### Renomeação em Lote Padronizada (Python)
```python
from pathlib import Path

def batch_rename(directory: str, pattern: str, replacement: str):
    target_dir = Path(directory)
    for file in target_dir.iterdir():
        if file.is_file() and pattern in file.name:
            new_name = file.name.replace(pattern, replacement)
            new_path = file.parent / new_name
            if not new_path.exists():
                file.rename(new_path)
```

---

## 📚 Biblioteca de Referências Técnicas da Skill

- [`references/safety-rules-and-guardrails.md`](references/safety-rules-and-guardrails.md): Lista negra de diretórios protegidos, sanitização de caminhos e protocolo de confirmação.
- [`references/batch-organization.md`](references/batch-organization.md): Mapeamento de tipos MIME, regras taxonômicas de pastas e categorização inteligente.
- [`references/duplicate-detection.md`](references/duplicate-detection.md): Algoritmos de hash SHA-256 em duas fases, detecção de hardlinks e políticas de resolução.
- [`references/bulk-renaming.md`](references/bulk-renaming.md): Padrões de formatação de nomenclatura (kebab-case, timestamp, numeração sequencial) e prevenção de colisões.
