# Detecção & Deduplicação de Arquivos (Duplicate Detection)

> **Objetivo:** Identificar arquivos idênticos com precisão criptográfica de 100%, sem falsos positivos e sem leituras desnecessárias de I/O em disco.

---

## 1. Algoritmo de Duas Fases (Two-Phase Hash Scan)

A leitura do hash criptográfico de arquivos grandes em disco é onerosa. O motor adota estratégia escalonada:

```text
┌────────────────────────────────────────────────────────┐
│ Fase 1: Agrupamento Rápido por Tamanho em Bytes       │
│ - Se dois arquivos têm tamanhos diferentes, NÃO são   │
│   duplicatas. Zero leitura de conteúdo.                │
├────────────────────────────────────────────────────────┤
│ Fase 2: Hash SHA-256 Parcial / Completo               │
│ - Para arquivos com mesmo tamanho:                     │
│   a) Ler os primeiros 8 KB (Quick Hash).              │
│   b) Se coincidirem, computar SHA-256 do arquivo todo.│
└────────────────────────────────────────────────────────┘
```

---

## 2. Estratégias de Resolução de Duplicatas

Quando duplicatas são detectadas, o operador deve poder escolher a política:

1. **Apenas Listar (Audit Only):**
   - Exibe tabela comparativa com caminhos, tamanho e datas de modificação.
2. **Manter o Mais Antigo (Keep Oldest):**
   - Preserva o arquivo original mais antigo e move as cópias para uma pasta `_quarantine/`.
3. **Manter o Mais Recente (Keep Newest):**
   - Preserva a versão mais recente e descarta as versões anteriores após confirmação.
4. **Substituição por Hardlink / Symlink:**
   - Economiza espaço em disco criando referências para o mesmo inode (quando suportado pelo sistema de arquivos).
