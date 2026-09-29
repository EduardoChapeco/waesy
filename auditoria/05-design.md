# Auditoria de Design & Linguagem — Waesy Design System

## 1. Tokens Declarados vs Usados
- **Cores Semânticas:** `var(--background)`, `var(--foreground)`, `var(--primary)`, `var(--muted)`, `var(--border)`, `var(--destructive)`.
- **Raio Canônico:** `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-3xl` (24px para cards mobile edge-to-edge), `rounded-full` (pílula).
- **Tipografia:** Sans Inter com tracking negativo em títulos (`-0.02em`) e entrelinha generosa no corpo.
- **Bordas:** 1px super refinada (`border-border/60`) sem sombras pesadas (Paradigma Clean).

## 2. Caça ao Ruído de Texto (Anti-AI Design)
| Arquivo:Linha | Texto Atual | Categoria | Ação |
| --- | --- | --- | --- |
| `workspace.pdv.index.tsx:97` | "Abertura de Caixa / Informe o fundo de troco..." | Instrução Redundante | Simplificar para "Fundo de Troco" direto |
| `workspace.pdv.index.tsx:18` | "Atendimento por Balcão, Mesa ou Comanda" | Título Composto | "Modo de Atendimento" |
| `workspace.pedidos.$id.tsx:24` | "Acompanhe e gerencie todas as etapas do seu pedido" | Frase de Sistema | REMOVER |
