import fs from 'fs';

const file = 'src/services/directory.functions.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. Add import
if (!content.includes('getServerIdentity')) {
  content = `import { getServerIdentity } from "@/lib/server-access";\n` + content;
}

// 2. Append claimDirectoryListingFn
if (!content.includes('claimDirectoryListingFn')) {
  const fnCode = `

/**
 * Reivindicar Empresa (Claim Business & Ativação de Ghost Store)
 */
export const claimDirectoryListingFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      listingId: z.string(),
      contactName: z.string().min(2, "Nome do responsável obrigatório"),
      contactRole: z.string().min(2, "Cargo ou vínculo obrigatório"),
      contactPhone: z.string().min(8, "Telefone/WhatsApp de contato obrigatório"),
      document: z.string().optional(),
      notes: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      throw new Error("Você precisa estar conectado a uma conta Waesy para reivindicar este perfil.");
    }

    const supabase = getServerClient();

    // 1. Localiza a listagem
    const { data: listing, error: findErr } = await supabase
      .from("directory_listings")
      .select("*")
      .eq("id", data.listingId)
      .maybeSingle();

    if (findErr || !listing) {
      throw new Error("Estabelecimento não encontrado no diretório.");
    }

    // 2. Se já estiver verificado com outro dono, rejeita
    if (listing.is_verified && listing.author_profile_id && listing.author_profile_id !== identity.id) {
      throw new Error("Este perfil já foi verificado e pertence a outro gestor. Entre em contato com o suporte.");
    }

    let storeId = identity.store_id || listing.store_id;

    // 3. Se o lojista não possui loja, ativa uma Ghost Store automaticamente
    if (!storeId) {
      const slugBase = (listing.business_name || "loja")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\\u0300-\\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const { data: newStore, error: storeErr } = await supabase
        .from("stores")
        .insert({
          name: listing.business_name,
          slug: \`\${slugBase}-\${Date.now().toString().slice(-4)}\`,
          access_type: "public",
          is_hidden_from_directory: false,
          address: listing.address,
          city: listing.city,
          phone: data.contactPhone || listing.contact_phone,
          settings: {
            claimant_name: data.contactName,
            claimant_role: data.contactRole,
            claimed_at: new Date().toISOString(),
          },
        })
        .select("id")
        .single();

      if (!storeErr && newStore?.id) {
        storeId = newStore.id;
      }
    }

    // 4. Atualiza a listagem no diretório para verificada
    const { error: updateErr } = await supabase
      .from("directory_listings")
      .update({
        store_id: storeId,
        author_profile_id: identity.id,
        is_verified: true,
        status: "active",
        contact_phone: data.contactPhone || listing.contact_phone,
        contact_whatsapp: (data.contactPhone || "").replace(/\\D/g, "") || listing.contact_whatsapp,
        metadata: {
          ...(listing.metadata || {}),
          claimed_by: identity.id,
          claimed_at: new Date().toISOString(),
          claim_role: data.contactRole,
          claim_name: data.contactName,
          claim_document: data.document || null,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", listing.id);

    if (updateErr) {
      throw new Error("Falha ao salvar reivindicação: " + updateErr.message);
    }

    return {
      success: true,
      message: \`Perfil de "\${listing.business_name}" reivindicado com sucesso! Agora você é o gestor oficial.\`,
      storeId,
    };
  });
`;

  content = content.trimEnd() + fnCode + '\n';
}

fs.writeFileSync(file, content, 'utf8');
console.log('Appended claimDirectoryListingFn to directory.functions.ts');
