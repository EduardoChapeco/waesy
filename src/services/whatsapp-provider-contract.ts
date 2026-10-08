/**
 * `integration_credentials` mantém o identificador histórico da credencial.
 * O domínio operacional de canais usa o identificador canônico Meta Cloud API.
 * A tradução explícita evita misturar os dois namespaces em webhook, identity e outbox.
 */
export const WHATSAPP_CREDENTIAL_PROVIDER = "whatsapp_cloud_api" as const;
export const WHATSAPP_META_CHANNEL_PROVIDER = "meta_cloud_api" as const;
