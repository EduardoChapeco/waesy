/**
 * permission-registry.ts — Registro Canônico de Papéis, Recursos e Permissões (R32)
 *
 * Alinhado com a capacidade real do sistema Waesy:
 * - Suporte a Varejo, Gastronomia, Turismo, Serviços, Imóveis, Classificados e MotoLink
 * - Papéis operacionais multi-tenant e civis
 *
 * Regra B.2: src/registries/ é declarativo puro.
 * Regra R32: Alinhamento das permissões com a capacidade real do produto.
 */

import { z } from 'zod';

export const RoleSchema = z.enum([
  'visitor',
  'customer',
  'owner',
  'admin',
  'manager',
  'seller',
  'stock',
  'finance',
  'content',
  'support',
  'platform_admin',
  'master',
  'courier',
  'creator',
  'traveler',
]);
export type Role = z.infer<typeof RoleSchema>;

export const PermissionActionSchema = z.enum([
  'create',
  'read',
  'update',
  'delete',
  'manage',
  'execute',
]);
export type PermissionAction = z.infer<typeof PermissionActionSchema>;

export const PermissionResourceSchema = z.enum([
  'products',
  'categories',
  'orders',
  'customers',
  'content',
  'settings',
  'staff',
  'reports',
  'tourism',
  'classifieds',
  'fiscal',
  'marketing',
  'logistics',
  'proposals',
  'deals',
]);
export type PermissionResource = z.infer<typeof PermissionResourceSchema>;

export const PermissionSchema = z.object({
  action: PermissionActionSchema,
  resource: PermissionResourceSchema,
});
export type Permission = z.infer<typeof PermissionSchema>;

/**
 * Mapeamento Canônico de Papéis e Permissões
 */
export const RolePermissionsRegistry: Record<Role, Permission[]> = {
  owner: [{ action: 'manage', resource: 'settings' }], // Owner tem bypass total nos guards
  admin: [{ action: 'manage', resource: 'settings' }], // Admin tem bypass nos recursos da loja

  manager: [
    { action: 'manage', resource: 'products' },
    { action: 'manage', resource: 'categories' },
    { action: 'manage', resource: 'orders' },
    { action: 'manage', resource: 'customers' },
    { action: 'manage', resource: 'tourism' },
    { action: 'manage', resource: 'classifieds' },
    { action: 'manage', resource: 'proposals' },
    { action: 'manage', resource: 'deals' },
    { action: 'read', resource: 'reports' },
    { action: 'read', resource: 'fiscal' },
    { action: 'manage', resource: 'marketing' },
    { action: 'manage', resource: 'logistics' },
  ],

  seller: [
    { action: 'read', resource: 'products' },
    { action: 'manage', resource: 'orders' },
    { action: 'read', resource: 'customers' },
    { action: 'manage', resource: 'proposals' },
    { action: 'manage', resource: 'deals' },
    { action: 'read', resource: 'tourism' },
  ],

  stock: [
    { action: 'read', resource: 'products' },
    { action: 'update', resource: 'products' },
    { action: 'manage', resource: 'logistics' },
  ],

  finance: [
    { action: 'read', resource: 'orders' },
    { action: 'read', resource: 'reports' },
    { action: 'manage', resource: 'fiscal' },
    { action: 'read', resource: 'deals' },
  ],

  content: [
    { action: 'manage', resource: 'content' },
    { action: 'read', resource: 'products' },
    { action: 'manage', resource: 'marketing' },
  ],

  support: [
    { action: 'read', resource: 'orders' },
    { action: 'manage', resource: 'customers' },
    { action: 'read', resource: 'proposals' },
    { action: 'read', resource: 'classifieds' },
  ],

  courier: [
    { action: 'read', resource: 'orders' },
    { action: 'update', resource: 'logistics' },
  ],

  creator: [
    { action: 'manage', resource: 'content' },
    { action: 'read', resource: 'marketing' },
  ],

  traveler: [
    { action: 'read', resource: 'tourism' },
    { action: 'read', resource: 'orders' },
  ],

  customer: [
    // Clientes acessam apenas suas próprias entidades via RLS
  ],

  visitor: [
    // Visitantes possuem acesso anônimo somente-leitura público
  ],

  platform_admin: [
    { action: 'manage', resource: 'settings' },
  ],

  master: [
    { action: 'manage', resource: 'settings' },
  ],
};

/**
 * Avalia se um papel tem permissão para executar ação em determinado recurso.
 */
export function hasPermission(
  role: Role,
  action: PermissionAction,
  resource: PermissionResource
): boolean {
  if (role === 'owner' || role === 'admin' || role === 'master' || role === 'platform_admin') return true;

  const permissions = RolePermissionsRegistry[role] || [];
  return permissions.some(
    (p) =>
      (p.action === action || p.action === 'manage') &&
      (p.resource === resource || p.resource === 'settings')
  );
}

/**
 * Retorna os recursos acessíveis para determinado papel
 */
export function getAccessibleResources(role: Role): PermissionResource[] {
  if (role === 'owner' || role === 'admin') {
    return PermissionResourceSchema.options;
  }
  const perms = RolePermissionsRegistry[role] || [];
  return [...new Set(perms.map((p) => p.resource))];
}
