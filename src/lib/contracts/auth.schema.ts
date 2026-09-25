import { z } from "zod";

/**
 * Contratos BFF para Autenticação
 * 
 * Fonte Única de Verdade (Single Source of Truth) para validação 
 * de login, registro e recuperação de senha.
 * Importado tanto pelo Client (React Hook Form) quanto pelo Server (TanStack Start Server Functions).
 */

export const ClientLocationSchema = z.object({
  city: z.string().optional(),
  state: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  source: z.string().optional(),
}).optional();

export const LoginSchema = z.object({
  identifier: z.string().optional(),
  email: z.string().optional(),
  password: z.string().min(1, "A senha é obrigatória"),
  redirectTo: z.string().optional(),
  deviceFingerprint: z.string().optional(),
  clientLocation: ClientLocationSchema,
});

export type LoginForm = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  email: z.string().email("E-mail inválido. Verifique o endereço digitado."),
  password: z
    .string()
    .min(6, "A senha deve ter pelo menos 6 caracteres")
    .regex(/[a-zA-Z]/, "A senha deve conter pelo menos uma letra")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número"),
  fullName: z.string().min(2, "Informe seu nome completo"),
  
  // Opcionais enviados no payload
  cpf: z.string().optional(),
  phone: z.string().optional(),
  redirectTo: z.string().optional(),
  deviceFingerprint: z.string().optional(),
  clientLocation: ClientLocationSchema,

  // No cliente o checkbox exige true, no servidor aceita boolean e padroniza para true
  isConsentLgpd: z.boolean().optional(),
});

// Tipagem estendida para o form do cliente (para o hook-form)
// A versão do cliente força literal(true) para garantir que o checkbox seja marcado.
export const ClientRegisterSchema = RegisterSchema.extend({
  isConsentLgpd: z.literal(true, {
    errorMap: () => ({ message: "Você deve aceitar os termos de privacidade (LGPD)." }),
  }),
});

export type RegisterForm = z.infer<typeof ClientRegisterSchema>;

export const ResetPasswordSchema = z.object({
  password: z
    .string()
    .min(6, "A senha deve ter pelo menos 6 caracteres")
    .regex(/[a-zA-Z]/, "A senha deve conter pelo menos uma letra")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número"),
});

export type ResetPasswordForm = z.infer<typeof ResetPasswordSchema>;
