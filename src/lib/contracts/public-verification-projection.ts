export interface PublicVerificationEnvelope {
  signer_name: string | null;
  signer_role: string | null;
  status: string | null;
  signed_at: string | null;
  auth_level: string | null;
}

export interface PublicVerificationVersion {
  version_number: number | null;
  hash_sha256: string | null;
  sealed_at: string | null;
  is_sealed: boolean;
  envelopes: PublicVerificationEnvelope[];
}

export type PublicVerificationSource = "canonical" | "legacy_metadata";
export type PublicVerificationPendingReason = "sealing" | "signatures" | "completion" | "legacy";

export interface PublicVerificationState {
  isAuthentic: boolean;
  isFullySigned: boolean;
  isPending: boolean;
  allSignaturesSigned: boolean;
  pendingReason: PublicVerificationPendingReason | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function isValidInstant(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/i.test(value);
}

export function projectPublicVerificationEnvelope(value: unknown): PublicVerificationEnvelope | null {
  if (!isRecord(value)) return null;

  return {
    signer_name: nullableString(value.signer_name),
    signer_role: nullableString(value.signer_role),
    status: nullableString(value.status),
    signed_at: nullableString(value.signed_at),
    auth_level: nullableString(value.auth_level),
  };
}

export function projectPublicVerificationVersion(value: unknown): PublicVerificationVersion | null {
  if (!isRecord(value)) return null;

  const envelopes = Array.isArray(value.envelopes)
    ? value.envelopes
        .map(projectPublicVerificationEnvelope)
        .filter((envelope): envelope is PublicVerificationEnvelope => envelope !== null)
    : [];

  return {
    version_number:
      typeof value.version_number === "number" && Number.isFinite(value.version_number)
        ? value.version_number
        : null,
    hash_sha256: nullableString(value.hash_sha256),
    sealed_at: nullableString(value.sealed_at),
    is_sealed: value.is_sealed === true,
    envelopes,
  };
}

export function derivePublicVerificationState(
  contractStatus: unknown,
  rawVersion: unknown,
  source: PublicVerificationSource = "canonical",
): PublicVerificationState {
  const version = projectPublicVerificationVersion(rawVersion);
  const isAuthentic = Boolean(
    version?.is_sealed &&
    isSha256(version.hash_sha256) &&
    isValidInstant(version.sealed_at),
  );
  const allSignaturesSigned = Boolean(
    version &&
    version.envelopes.length > 0 &&
    version.envelopes.every(
      (envelope) => envelope.status === "signed" && isValidInstant(envelope.signed_at),
    ),
  );
  const isFullySigned = Boolean(
    isAuthentic &&
    source === "canonical" &&
    contractStatus === "completed" &&
    allSignaturesSigned,
  );

  let pendingReason: PublicVerificationPendingReason | null = null;
  if (!isAuthentic) pendingReason = "sealing";
  else if (source === "legacy_metadata") pendingReason = "legacy";
  else if (!allSignaturesSigned) pendingReason = "signatures";
  else if (contractStatus !== "completed") pendingReason = "completion";

  return {
    isAuthentic,
    isFullySigned,
    isPending: !isFullySigned,
    allSignaturesSigned,
    pendingReason,
  };
}

export function projectTourismVerificationVersion(
  metadata: unknown,
  currentVersion: unknown,
): PublicVerificationVersion {
  const meta = isRecord(metadata) ? metadata : {};
  const signatures = Array.isArray(meta.signatures) ? meta.signatures : [];
  const envelopes = signatures.length > 0
    ? signatures.map((signature: unknown) => {
        const signer = isRecord(signature) ? signature : {};
        const signedAt = nullableString(signer.signed_at);
        const role = nullableString(signer.signer_role);

        return {
          signer_name: nullableString(signer.signer_name),
          signer_role: role === "witness" ? "witness" : "party",
          status: signedAt ? "signed" : "pending",
          signed_at: signedAt,
          auth_level: nullableString(signer.auth_level),
        };
      })
    : [{
        signer_name: nullableString(meta.client_name),
        signer_role: "party",
        status: nullableString(meta.signed_at) ? "signed" : "pending",
        signed_at: nullableString(meta.signed_at),
        auth_level: null,
      }];

  return projectPublicVerificationVersion({
    version_number:
      typeof currentVersion === "number" && Number.isFinite(currentVersion)
        ? currentVersion
        : 1,
    hash_sha256: nullableString(meta.content_hash),
    sealed_at: nullableString(meta.signed_at),
    is_sealed: Boolean(meta.signed_at),
    envelopes,
  })!;
}

export function projectPublicTourismVerificationCode(
  metadata: unknown,
  verificationCode: unknown,
  lookupCode: string,
): string | null {
  const meta = isRecord(metadata) ? metadata : {};
  const certificateSerial = nullableString(meta.certificate_serial);
  const [serialPrefix, serialBody, serialYear] = certificateSerial?.split("-") || [];
  if (
    serialPrefix === "CERT" &&
    serialBody?.length === 6 &&
    /^[A-Z0-9]{6}$/.test(serialBody) &&
    /^\d{4}$/.test(serialYear || "")
  ) {
    return certificateSerial;
  }

  const persistedCode = nullableString(verificationCode);
  if (persistedCode && /^ct_[a-z0-9]{1,10}$/.test(persistedCode)) {
    return persistedCode;
  }

  if (/^[0-9a-f]{64}$/i.test(lookupCode)) {
    return lookupCode.toLowerCase();
  }

  return null;
}
