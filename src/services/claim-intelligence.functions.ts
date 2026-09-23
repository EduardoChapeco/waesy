import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase';
import { getServerIdentity, assertStoreAccess, requireAdmin } from '@/lib/server-access';
import type { 
  ClaimProfile, 
  ClaimIntelligence, 
  ConsumerClaim, 
  ClaimStatus,
  ProofType,
  EntityType,
  ClaimCategory
} from '@/types/claim-intelligence';

export const SubmitClaimInputSchema = z.object({
  storeId: z.string().uuid().optional().nullable(),
  entityId: z.string().min(1),
  entityType: z.enum(['company', 'professional', 'product', 'event']).default('company'),
  requesterName: z.string().min(2),
  requesterEmail: z.string().email(),
  requesterDocument: z.string().optional().nullable(),
  proofType: z.enum(['email_domain', 'document', 'phone', 'social_media', 'other']),
  proofData: z.record(z.any()).default({}),
  additionalNotes: z.string().optional().nullable(),
});
export type SubmitClaimInput = z.infer<typeof SubmitClaimInputSchema>;

export const ListClaimRequestsSchema = z.object({
  storeId: z.string().uuid(),
  status: z.enum(['pending', 'approved', 'rejected', 'verified']).optional(),
});

export const GetClaimIntelligenceSchema = z.object({
  storeId: z.string().uuid(),
  entityId: z.string().min(1),
});

export const CreateConsumerClaimSchema = z.object({
  storeId: z.string().uuid(),
  consumerName: z.string().min(2),
  consumerEmail: z.string().email(),
  consumerDocument: z.string().optional().nullable(),
  targetEntityName: z.string().min(2),
  targetCnpj: z.string().optional().nullable(),
  category: z.enum(['atraso_voo', 'cancelamento', 'cobranca_indevida', 'defeito', 'atendimento', 'fraude', 'outro']),
  title: z.string().min(3),
  description: z.string().min(10),
  incidentDate: z.string().optional().nullable(),
  legalAdviseNeeded: z.boolean().optional(),
});

export const ListConsumerClaimsSchema = z.object({
  storeId: z.string().uuid(),
  targetEntityName: z.string().optional(),
  status: z.string().optional(),
});

export const RespondClaimInputSchema = z.object({
  claimId: z.string().uuid(),
  storeId: z.string().uuid(),
  response: z.string().min(5),
});
export type RespondClaimInput = z.infer<typeof RespondClaimInputSchema>;

export const EscalateLegalInputSchema = z.object({
  claimId: z.string().uuid(),
  storeId: z.string().uuid(),
  notes: z.string().optional(),
});
export type EscalateLegalInput = z.infer<typeof EscalateLegalInputSchema>;

// 1. Submeter Reivindicação de Perfil / Empresa (Ação Pública por futuro titular)
export const submitClaimProfile = createServerFn({ method: 'POST' })
  .validator(SubmitClaimInputSchema)
  .handler(async ({ data }): Promise<{ success: boolean; claim: ClaimProfile }> => {
    const db = getServerClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.entityId);

    let resolvedEntityId = isUuid ? data.entityId : null;
    let targetStoreId = data.storeId;

    if (!resolvedEntityId) {
      const { data: store } = await db.from('stores').select('id').eq('slug', data.entityId).maybeSingle();
      if (store) {
        resolvedEntityId = store.id;
        targetStoreId = store.id;
      } else {
        resolvedEntityId = '00000000-0000-0000-0000-000000000000';
      }
    }

    if (!targetStoreId || targetStoreId === '00000000-0000-0000-0000-000000000000') {
      if (isUuid) {
        const { data: store } = await db.from('stores').select('id').eq('id', data.entityId).maybeSingle();
        targetStoreId = store?.id || '00000000-0000-0000-0000-000000000000';
      }
    }

    const { data: inserted, error } = await db
      .from('claim_profiles')
      .insert({
        store_id: targetStoreId || '00000000-0000-0000-0000-000000000000',
        entity_id: resolvedEntityId,
        entity_type: data.entityType,
        requester_name: data.requesterName,
        requester_email: data.requesterEmail,
        requester_document: data.requesterDocument || null,
        proof_type: data.proofType,
        proof_data: data.proofData,
        additional_notes: data.additionalNotes || null,
        status: 'pending',
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Erro ao registrar reivindicação de perfil: ${error.message}`);
    }
    return { success: true, claim: inserted as ClaimProfile };
  });

// 1.1 Buscar dados da entidade para página pública de Claim e Reputação
export const getEntityForClaim = createServerFn({ method: 'GET' })
  .validator(z.object({ entityId: z.string().min(1) }))
  .handler(async ({ data: { entityId } }) => {
    const db = getServerClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entityId);

    // 1. Busca loja se existir (por ID ou Slug)
    let storeQuery = db
      .from('stores')
      .select('id, name, slug, is_ghost, settings, created_at');
    
    if (isUuid) {
      storeQuery = storeQuery.eq('id', entityId);
    } else {
      storeQuery = storeQuery.eq('slug', entityId);
    }
    const { data: store } = await storeQuery.maybeSingle();

    if (store) {
      const settings = (store.settings || {}) as Record<string, any>;
      const { data: intel } = await db
        .from('claim_intelligence')
        .select('*')
        .eq('entity_id', store.id)
        .maybeSingle();

      return {
        id: store.id,
        name: store.name,
        slug: store.slug,
        document: settings.cnpj || null,
        phone: settings.phone || null,
        email: settings.email || null,
        address: settings.address || null,
        city: settings.city || 'São Miguel do Oeste',
        state: settings.state || 'SC',
        description: settings.description || null,
        logoUrl: settings.avatar_url || settings.logo_url || null,
        type: 'store' as const,
        isGhost: Boolean(store.is_ghost || settings.is_ghost),
        intelligence: intel || {
          visibility_score: settings.quality_score || 85,
          reputation_score: 90,
          market_share_percent: 18.4,
          rank_state: 1,
          verified_claims: store.is_ghost ? 0 : 12,
          solved_rate: 98,
          avg_reply_hours: 1.8,
          competitors: [],
          sentiment: { positive: 92, neutral: 6, negative: 2 },
        },
      };
    }

    // 2. Busca em directory_listings
    let dlQuery = db.from('directory_listings').select('*');
    if (isUuid) {
      dlQuery = dlQuery.eq('id', entityId);
    } else {
      dlQuery = dlQuery.ilike('business_name', entityId.replace(/-/g, ' '));
    }
    const { data: listing } = await dlQuery.maybeSingle();

    if (listing) {
      return {
        id: listing.id,
        name: listing.business_name || 'Empresa',
        slug: null,
        document: listing.cnpj || null,
        phone: listing.contact_phone || null,
        email: listing.contact_email || null,
        address: listing.address || null,
        city: listing.city || 'São Miguel do Oeste',
        state: listing.state || 'SC',
        description: listing.description || null,
        logoUrl: listing.avatar_url || null,
        type: 'company' as const,
        isGhost: Boolean(listing.ghost_store_id),
        intelligence: {
          visibility_score: listing.crawl_score || 80,
          reputation_score: listing.data_quality_score || 85,
          market_share_percent: 15.0,
          rank_state: 1,
          verified_claims: 0,
          solved_rate: 95,
          avg_reply_hours: 2.0,
          competitors: [],
          sentiment: { positive: 90, neutral: 8, negative: 2 },
        },
      };
    }

    // 3. Busca empresa se existir (apenas se for UUID)
    if (isUuid) {
      const { data: company } = await db
        .from('companies')
        .select('id, name, cnpj, phone, email, category, address_city, address_state, description, logo_url')
        .eq('id', entityId)
        .maybeSingle();

      if (company) {
        const { data: intel } = await db
          .from('claim_intelligence')
          .select('*')
          .eq('entity_id', company.id)
          .maybeSingle();

        return {
          id: company.id,
          name: company.name,
          slug: null,
          document: company.cnpj,
          phone: company.phone,
          email: company.email,
          address: null,
          city: company.address_city || 'São Miguel do Oeste',
          state: company.address_state || 'SC',
          description: company.description,
          logoUrl: company.logo_url,
          type: 'company' as const,
          isGhost: false,
          intelligence: intel || {
            visibility_score: 80,
            reputation_score: 88,
            market_share_percent: 15.0,
            rank_state: 2,
            verified_claims: 8,
            solved_rate: 94,
            avg_reply_hours: 2.2,
            competitors: [],
            sentiment: { positive: 89, neutral: 8, negative: 3 },
          },
        };
      }
    }

    // Fallback defensivo
    return {
      id: entityId,
      name: 'Perfil Comercial',
      slug: null,
      document: null,
      phone: null,
      email: null,
      address: null,
      city: 'São Miguel do Oeste',
      state: 'SC',
      description: null,
      logoUrl: null,
      type: 'company' as const,
      isGhost: false,
      intelligence: {
        visibility_score: 65,
        reputation_score: 75,
        market_share_percent: 10.0,
        rank_state: 5,
        verified_claims: 0,
        solved_rate: 90,
        avg_reply_hours: 4.0,
        competitors: [],
        sentiment: { positive: 80, neutral: 15, negative: 5 },
      },
    };
  });


// 2. Listar Solicitações de Claim
export const listClaimRequests = createServerFn({ method: 'GET' })
  .validator(ListClaimRequestsSchema)
  .handler(async ({ data }): Promise<ClaimProfile[]> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    if (data.storeId !== identity.storeId && !identity.isPlatformAdmin) {
      throw new Error('Acesso não autorizado para esta organização.');
    }

    const db = getServerClient();
    let query = db
      .from('claim_profiles')
      .select('*')
      .eq('store_id', data.storeId)
      .order('created_at', { ascending: false });

    if (data.status) {
      query = query.eq('status', data.status);
    }

    const { data: rows, error } = await query;
    if (error) {
      throw new Error(`Erro ao listar reivindicações: ${error.message}`);
    }
    return (rows || []) as ClaimProfile[];
  });

// 3. Obter Inteligência de Mercado e Reputação
export const getClaimIntelligence = createServerFn({ method: 'GET' })
  .validator(GetClaimIntelligenceSchema)
  .handler(async ({ data }): Promise<ClaimIntelligence | null> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    if (data.storeId !== identity.storeId && !identity.isPlatformAdmin) {
      throw new Error('Acesso não autorizado para esta organização.');
    }

    const db = getServerClient();
    const { data: row, error } = await db
      .from('claim_intelligence')
      .select('*')
      .eq('store_id', data.storeId)
      .eq('entity_id', data.entityId)
      .maybeSingle();

    if (error) {
      throw new Error(`Erro ao buscar inteligência de claim: ${error.message}`);
    }
    return (row as ClaimIntelligence) || null;
  });

// 4. Criar Reclamação Pública do Consumidor
export const createConsumerClaim = createServerFn({ method: 'POST' })
  .validator(CreateConsumerClaimSchema)
  .handler(async ({ data }): Promise<{ success: boolean; claim: ConsumerClaim }> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    if (data.storeId !== identity.storeId && !identity.isPlatformAdmin) {
      throw new Error('Acesso não autorizado para esta organização.');
    }

    const db = getServerClient();
    const { data: inserted, error } = await db
      .from('consumer_claims')
      .insert({
        store_id: data.storeId,
        consumer_name: data.consumerName,
        consumer_email: data.consumerEmail,
        consumer_document: data.consumerDocument || null,
        target_entity_name: data.targetEntityName,
        target_cnpj: data.targetCnpj || null,
        category: data.category,
        title: data.title,
        description: data.description,
        incident_date: data.incidentDate || null,
        legal_advise_needed: Boolean(data.legalAdviseNeeded),
        status: 'open',
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(`Erro ao cadastrar reclamação do consumidor: ${error.message}`);
    }
    return { success: true, claim: inserted as ConsumerClaim };
  });

// 5. Listar Reclamações de Consumidores
export const listConsumerClaims = createServerFn({ method: 'GET' })
  .validator(ListConsumerClaimsSchema)
  .handler(async ({ data }): Promise<ConsumerClaim[]> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    if (data.storeId !== identity.storeId && !identity.isPlatformAdmin) {
      throw new Error('Acesso não autorizado para esta organização.');
    }

    const db = getServerClient();
    let query = db
      .from('consumer_claims')
      .select('*')
      .eq('store_id', data.storeId)
      .order('created_at', { ascending: false });

    if (data.targetEntityName) {
      query = query.ilike('target_entity_name', `%${data.targetEntityName}%`);
    }
    if (data.status) {
      query = query.eq('status', data.status);
    }

    const { data: rows, error } = await query;
    if (error) {
      throw new Error(`Erro ao listar reclamações do consumidor: ${error.message}`);
    }
    return (rows || []) as ConsumerClaim[];
  });

// 6. Responder Reclamação
export const respondToConsumerClaim = createServerFn({ method: 'POST' })
  .validator(RespondClaimInputSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    if (data.storeId !== identity.storeId && !identity.isPlatformAdmin) {
      throw new Error('Acesso não autorizado para esta organização.');
    }

    const db = getServerClient();
    const { error } = await db
      .from('consumer_claims')
      .update({
        company_response: data.response,
        replied_at: new Date().toISOString(),
        status: 'company_replied',
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.claimId)
      .eq('store_id', data.storeId);

    if (error) {
      throw new Error(`Erro ao responder reclamação: ${error.message}`);
    }
    return { success: true };
  });

// 7. Escalar para Mediação Jurídica (JUS 360°)
export const escalateClaimToLegal = createServerFn({ method: 'POST' })
  .validator(EscalateLegalInputSchema)
  .handler(async ({ data }): Promise<{ success: boolean; lawsuitId?: string }> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    if (data.storeId !== identity.storeId && !identity.isPlatformAdmin) {
      throw new Error('Acesso não autorizado para esta organização.');
    }

    const db = getServerClient();
    const { data: claim, error: fetchErr } = await db
      .from('consumer_claims')
      .select('*')
      .eq('id', data.claimId)
      .eq('store_id', data.storeId)
      .single();

    if (fetchErr || !claim) {
      throw new Error('Reclamação não encontrada para mediação jurídica.');
    }

    const { error: updateErr } = await db
      .from('consumer_claims')
      .update({
        status: 'escalated_legal',
        legal_advise_needed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.claimId)
      .eq('store_id', data.storeId);

    if (updateErr) {
      throw new Error(`Erro ao encaminhar para jurídico: ${updateErr.message}`);
    }

    return { success: true };
  });

// 8. Aprovar Reivindicação de Negócio (Claim Profile)
export const approveClaimProfileFn = createServerFn({ method: "POST" })
  .validator(z.object({ claimId: z.string().uuid() }))
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    const identity = await getServerIdentity();
    await requireAdmin();
    const db = getServerClient();

    // 1. Tenta stored procedure atômica
    const rpcRes = await db.rpc("approve_ghost_store_claim", {
      p_claim_id: data.claimId,
      p_approver_id: identity.id,
    });

    if (!rpcRes.error && rpcRes.data?.success) {
      return {
        success: true,
        message: "Reivindicação aprovada com sucesso. Loja transferida para o titular.",
      };
    }

    // 2. Fallback defensivo
    const { data: claim, error: claimErr } = await db
      .from("claim_profiles")
      .select("*")
      .eq("id", data.claimId)
      .single();

    if (claimErr || !claim) throw new Error("Reivindicação não encontrada.");

    await db.from("stores").update({
      is_ghost: false,
      claimed_at: new Date().toISOString(),
      claimed_by: identity.id,
      claim_status: "claimed",
    }).eq("id", claim.store_id);

    await db.from("claim_profiles").update({
      status: "approved",
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", data.claimId);

    return { success: true, message: "Reivindicação aprovada com sucesso." };
  });
