# Onda 13 — Catálogo de Armazenamento, Arquivos e Artefatos

## 1. Estrutura de Buckets de Storage (Supabase S3)

| Bucket | Acesso | Políticas RLS | Tipos de Arquivo Permitidos | Finalidade |
| :--- | :--- | :--- | :--- | :--- |
| **`news`** | Público | Escrita via Service Role / Jornalistas | `image/webp`, `image/png`, `image/jpeg` | Capas e fotos de notícias municipais |
| **`products`** | Público | Escrita pelo lojista autenticado (`store_id`) | Imagens, manuais PDF | Catálogo de produtos do comércio |
| **`avatars`** | Público | Escrita pelo próprio usuário (`auth.uid()`) | `image/jpeg`, `image/png`, `image/webp` | Fotos de perfil de cidadãos e lojistas |
| **`documents`** | Privado | Leitura/Escrita por permissão de tenant | `application/pdf`, `application/vnd.*` | Contratos de viagens, alvarás, termos |
| **`media`** | Público | Escrita autenticada | Áudios, vídeos, banners | Banners promocionais e stories |
| **`assets`** | Público | CDN estática | SVG, fontes, ícones | Identidade visual da plataforma |

---

## 2. Contrato de Artefatos Vivos do Chat (`ArtifactContract`)

Todo arquivo ou visualização gerada no chat respeita a seguinte estrutura persistida em `public.chat_artifacts`:

```typescript
export interface ArtifactContract {
  id: string;
  thread_id: string;
  message_id: string;
  type: "spreadsheet" | "dashboard" | "document" | "code" | "media";
  title: string;
  mime_type: string;
  size_bytes?: number;
  hash_sha256?: string;
  source_provenance: {
    extractor?: string;
    model?: string;
    created_at: string;
  };
  payload: Record<string, any>;
  public_url?: string;
}
```

- **Invariante de Preservação:** A geração de um PDF ou imagem a partir de uma planilha ou texto nunca destrói a representação canônica em JSON (`payload`), permitindo edição contínua pelo usuário.
