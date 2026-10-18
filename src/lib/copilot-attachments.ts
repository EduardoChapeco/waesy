/**
 * Converte anexos locais (data URLs lidos pelo composer) em URLs de storage reais
 * via a server function de upload. URLs https já hospedadas passam sem alteração.
 * Falha de upload lança erro (nunca envia anexo inexistente como se existisse).
 */
export interface UploadedAttachmentRef {
  url: string;
}

export type UploadAttachmentFn = (args: {
  data: { fileName: string; fileType: string; base64Data: string };
}) => Promise<UploadedAttachmentRef>;

function parseDataUrl(dataUrl: string): { mime: string; base64: string } | null {
  const match = /^data:([^;,]+)(?:;[^,]*)?;base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  return { mime: match[1].toLowerCase(), base64: match[2] };
}

export async function uploadComposerAttachments(
  attachments: string[],
  upload: UploadAttachmentFn,
): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < attachments.length; i++) {
    const item = attachments[i];
    if (!item.startsWith("data:")) {
      out.push(item);
      continue;
    }
    const parsed = parseDataUrl(item);
    if (!parsed) throw new Error("Anexo inválido: formato de arquivo não reconhecido.");
    const ext = parsed.mime.split("/")[1]?.replace("plain", "txt").replace("jpeg", "jpg") || "bin";
    const uploaded = await upload({
      data: { fileName: `anexo-${Date.now()}-${i + 1}.${ext}`, fileType: parsed.mime, base64Data: parsed.base64 },
    });
    if (!uploaded?.url) throw new Error("Falha ao enviar anexo: URL de armazenamento ausente.");
    out.push(uploaded.url);
  }
  return out;
}
