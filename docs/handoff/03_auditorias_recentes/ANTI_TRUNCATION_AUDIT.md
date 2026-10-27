# ANTI_TRUNCATION_AUDIT.md — Auditoria Global Anti-Truncamento
## Erradicação de Reticências Silenciosas e Preservação de Dados Críticos
**Data:** 2026-10-21  
**Módulo:** Turismo, Viagens & Lazer / Waesy  
**Status:** Auditado com Evidências de Código  

---

### 1. Mandato Fundamental Anti-Truncamento (Invariante B.38)

> **"É terminantemente proibido truncar ou cortar rótulos de especificações, preços, nomes de hotéis, datas e valores de destaque com a classe CSS `truncate` ou reticências silenciosas (`...`). O contêiner deve acomodar o texto na íntegra através de escala tipográfica proporcional e quebra natural de linha (`break-words text-wrap leading-tight`). O layout deve adaptar-se ao dado; o dado nunca deve ser mutilado para salvar o layout."**

---

### 2. Classificação de Dados: Proibição Estrita vs Tolerância

| Categoria de Dado | Truncamento Permitido? | Estratégia Canônica Adotada | Exemplo no Código |
| :--- | :---: | :--- | :--- |
| **Preços & Parcelas** | **PROIBIDO** | Número sempre visível em tamanho legível com quebra de linha defensiva. | `formatMoney`, `editorial-showcase-view.tsx` |
| **Nome do Hotel & Resort** | **PROIBIDO** | `break-words text-wrap leading-tight` (comporta nomes como "Grand Palladium Imbassaí Resort & Spa"). | `NicheSpecificationsDisplay` |
| **Datas de Embarque & Retorno** | **PROIBIDO** | `displayRangeText` sem corte, exibindo mês e ano completos. | `dates.displayRangeText` |
| **Composição Familiar & Passageiros** | **PROIBIDO** | Lista integral de adultos e idades de crianças visíveis. | `party.adults`, `childrenAges` |
| **Biografias de Perfis Públicos** | **PROIBIDO** | `whitespace-pre-line break-words` sem `line-clamp-3` (Invariante B.35). | `_store.membro.$id.tsx` |
| **Descrição Longa / Histórico Geral** | Permitido após 4 linhas | Botão explícito "Ler mais..." / "Ver itinerário completo". | `description` em aba descritiva |

---

### 3. Mecanismo de Auto-Ajuste no Story Builder 9:16 (`fitStoryTitle`)

Para evitar truncamento em canvas de Stories verticais sem quebrar o layout visual:
```typescript
// Local: src/lib/travel/excelencia-offer-engine.ts
export function fitStoryTitle(rawTitle: string, maxCharsPerLine: number = 18): {
  lines: string[];
  recommendedFontSize: string;
} {
  // Quebra proporcional em palavras completas
  const words = rawTitle.trim().split(/\s+/);
  // Se ultrapassar 2 linhas, reduz dinamicamente de text-3xl para text-2xl ou text-xl
  // Zero perda de palavras ou reticências silenciosas!
}
```
Essa abordagem garante que pacotes com títulos extensos continuem 100% legíveis sem cortar letras ou distorcer a arte.
