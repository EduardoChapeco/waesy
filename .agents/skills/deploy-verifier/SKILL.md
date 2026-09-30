---
name: deploy-verifier
description: Protocolo obrigatório de verificação, auditoria estrita pré-deploy e prevenção de quebras em produção.
---

# Deploy Verifier — Protocolo Pré-Deploy Zero-Breakage

## 1. Missão
Garantir que NENHUM commit ou deploy para Cloudflare Pages ou Supabase seja realizado com:
- Erros de compilação TypeScript (`tsc --noEmit != 0`).
- Ícones ou identificadores não importados (`ReferenceError: X is not defined`).
- Dados mockados ou sintéticos no banco de produção (`images.unsplash.com`, slugs de teste).
- Promessas de garantias inexistentes ("Pagamento Seguro", "Proteção Waesy", "Qualidade Garantida").
- Rotas inacessíveis ou quebradas no roteador TanStack.

## 2. Checklist Inviolável Pré-Deploy (Definition of Deployable)
Antes de executar `npm run build` ou `wrangler pages deploy`:
1. **Auditoria de Tipagem:**
   Executar `npm run typecheck` e confirmar Exit Code 0 com 0 erros.
2. **Auditoria de Ícones e Imports:**
   Verificar que todo ícone utilizado em `workspace-navigation.ts` e nas rotas está devidamente importado de `lucide-react`.
3. **Auditoria Anti-Mock:**
   Garantir que nenhuma query de vitrine (`surface-cms`, `catalog`, `classifieds`) retorne itens sintéticos do Unsplash.
4. **Auditoria de Termos Legais:**
   Proibido declarar que o Waesy garante pagamentos diretos entre terceiros, qualidade de produtos ou retenção financeira onde não há custódia.
5. **Auditoria de Build:**
   Executar `npm run build` e confirmar que os chunks e workers foram gerados sem erros.
