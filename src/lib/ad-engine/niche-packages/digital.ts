/**
 * digital.ts — Pacote Canônico de Nicho: Produtos Digitais, Cursos, Licenças & Softwares (G11–G17, G62)
 * 
 * Regras: A05 (Produto Digital sem estoque físico, entrega de chave/link), A06 (Assinatura / Clube com renovação recorrente).
 */

import { NichePackage } from './types';

export const DIGITAL_NICHE_PACKAGE: NichePackage = {
  id: 'digital',
  name: 'Produtos Digitais & Cursos',
  description: 'Infoprodutos, licenças de software, arquivos para download e assinaturas de conteúdo com liberação imediata de acesso.',
  version: '1.0.0',
  defaultArchetype: 'A05', // Produto Digital
  allowedArchetypes: {
    A01: 'prohibited',
    A02: 'prohibited',
    A03: 'optional',   // Combo de cursos / pacote de softwares
    A04: 'prohibited',
    A05: 'enabled',    // Produto Digital / Licença / Download - Canônico
    A06: 'enabled',    // Assinatura / Clube de Membros / SaaS - Canônico
    A07: 'prohibited',
    A08: 'prohibited',
    A09: 'prohibited',
    A10: 'prohibited',
    A11: 'prohibited',
    A12: 'prohibited',
    A13: 'optional',   // Ingresso para webinar / evento online
    A14: 'prohibited',
    A15: 'prohibited',
  },
  defaultSellingUnit: 'licenca',
  allowedSellingUnits: ['licenca', 'acesso', 'mes', 'ano', 'download'],
  terminology: {
    entitySingular: 'Conteúdo Digital',
    entityPlural: 'Produtos & Cursos Digitais',
    primaryActionLabel: 'Acessar Agora',
    secondaryActionLabel: 'Assinar Plano',
    pricingLabel: 'Valor do Acesso',
    unitLabel: 'Licença de Usuário',
    documentLabel: 'Certificado / Chave de Acesso',
    operatorRoleLabel: 'Criador / Produtor',
    customerRoleLabel: 'Aluno / Assinante',
  },
  attributes: [
    {
      key: 'delivery_format',
      label: 'Formato de Entrega',
      type: 'select',
      options: [
        { value: 'instant_download', label: 'Download Imediato de Arquivo' },
        { value: 'license_key', label: 'Chave Serial / Chave de Licença' },
        { value: 'members_area', label: 'Acesso à Área de Membros' },
        { value: 'api_access', label: 'Chave de API / Webhook' },
      ],
      isFilterable: true,
      isSearchable: false,
      isRequired: true,
      appliesToArchetypes: ['A05', 'A06'],
    },
    {
      key: 'file_size_mb',
      label: 'Tamanho do Arquivo (MB)',
      type: 'number',
      unit: 'MB',
      isFilterable: false,
      isSearchable: false,
      isRequired: false,
      appliesToArchetypes: ['A05'],
    },
    {
      key: 'access_duration_days',
      label: 'Tempo de Acesso Válido (Dias ou Vitalício)',
      type: 'number',
      unit: 'dias',
      isFilterable: true,
      isSearchable: false,
      isRequired: true,
      appliesToArchetypes: ['A05', 'A06'],
    },
    {
      key: 'license_vault_key_internal',
      label: 'Pool de Chaves Criptografadas',
      type: 'string',
      isFilterable: false,
      isSearchable: false,
      isRequired: false,
      isInternalOnly: true, // Blindado contra vazamento (G24)
      appliesToArchetypes: ['A05'],
    },
  ],
  detailSections: [
    { id: 'digital_overview', label: 'Visão Geral & Conteúdo Programático', order: 1, isRequired: true },
    { id: 'access_pricing', label: 'Planos de Acesso & Pagamento', order: 2, isRequired: true },
    { id: 'curriculum_modules', label: 'Grade de Aulas e Módulos', order: 3, isRequired: false },
    { id: 'guarantee_terms', label: 'Garantia Incondicional de 7 Dias', order: 4, isRequired: true },
    { id: 'faq_support', label: 'Perguntas Frequentes & Suporte', order: 5, isRequired: true },
    { id: 'internal_licensing_vault', label: 'Cofre de Chaves e Webhooks', order: 6, isRequired: false, isInternalOnly: true },
  ],
  fiscalAndRegulatory: {
    taxRegimeRecommendation: 'simples',
    requiresNcm: false,
    requiresCnae: true,
    primaryCnaeCode: '8599-6/04', // Treinamento em desenvolvimento profissional e gerencial
    regulatoryBody: 'MEC / ABED / Anatel (se telecom)',
    mandatoryLegalDisclaimers: [
      'Garantia incondicional de reembolso integral em até 7 dias corridos conforme Artigo 49 do Código de Defesa do Consumidor.',
      'O compartilhamento não autorizado de acessos ou downloads configura violação de direitos autorais (Lei 9.610/98).',
    ],
    minimumAge: 14,
    requiresKycOrNda: false,
  },
  documents: [
    {
      type: 'term',
      title: 'Termos de Uso e Licença de Usuário Final (EULA)',
      templateCode: 'DIGITAL_EULA_TERMS',
      requiresSignature: false,
    },
    {
      type: 'voucher',
      title: 'Comprovante de Matrícula e Credenciais de Acesso',
      templateCode: 'DIGITAL_ACCESS_PASS',
      requiresSignature: false,
    },
  ],
  slas: {
    confirmationTimeoutHours: 0.1, // Imediato
    responseTimeoutMinutes: 15,
    cancellationNoticeHours: 168, // 7 dias
  },
  statusGlossary: {
    published: 'Disponível para Compra',
    access_granted: 'Acesso Liberado',
    subscription_active: 'Assinatura Ativa',
    subscription_past_due: 'Assinatura em Atraso',
    access_revoked: 'Acesso Revogado / Reembolsado',
  },
  statusTransitions: [
    { fromStatus: 'published', toStatus: 'access_granted', allowedRoles: ['system', 'operator'], actionName: 'Processar Pagamento' },
    { fromStatus: 'access_granted', toStatus: 'subscription_active', allowedRoles: ['system'], actionName: 'Ativar Ciclo Recorrente' },
    { fromStatus: 'subscription_active', toStatus: 'access_revoked', allowedRoles: ['system', 'admin'], actionName: 'Revogar por Inadimplência ou Cancelamento' },
  ],
  uiSemantics: {
    heroPlaceholder: 'Ex: Formação Completa em Inteligência Artificial para Negócios...',
    searchPlaceholder: 'Qual habilidade ou software você deseja dominar?',
    emptyCatalogMessage: 'Nenhum curso ou conteúdo digital disponível.',
    orderSuccessMessage: 'Acesso liberado com sucesso! Suas credenciais foram enviadas para seu e-mail.',
    leadCapturePrompt: 'Deseja assistir à primeira aula gratuita antes de decidir?',
  },
};
