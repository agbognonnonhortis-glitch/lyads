export class MetaFailure extends Error {
  constructor(
    public code: string,
    public retryable = false,
    public delaySeconds = 0,
  ) {
    super(code);
  }
}
export function metaError(
  code: number | undefined,
  status: number,
  transient = false,
): MetaFailure {
  if (code === 190 || code === 102) return new MetaFailure("META_RECONNECT");
  if (code === 10 || code === 200 || code === 294) {
    return new MetaFailure("META_PERMISSION_REQUIRED");
  }
  if ([4, 17, 32, 613, 80000, 80004].includes(code || 0) || status === 429) {
    return new MetaFailure("META_RATE_LIMIT", true, 60);
  }
  if (transient || status >= 500) {
    return new MetaFailure("META_TEMPORARILY_UNAVAILABLE", true, 10);
  }
  return new MetaFailure("META_REQUEST_UNAVAILABLE");
}
export const META_SCOPES = [
  "ads_read",
  "ads_management",
  "business_management",
  "pages_show_list",
  "pages_read_engagement",
];
export function permissions(rows: unknown) {
  if (!Array.isArray(rows)) throw new MetaFailure("META_INVALID_RESPONSE");
  const statuses: Record<string, string> = {};
  for (const row of rows) {
    if (typeof row?.permission === "string" && typeof row.status === "string") {
      statuses[row.permission] = row.status;
    }
  }
  const granted = Object.keys(statuses).filter(
    (key) => statuses[key] === "granted",
  );
  return {
    statuses,
    granted,
    canReadAds: granted.includes("ads_read") ||
      granted.includes("ads_management"),
    canManageAds: granted.includes("ads_management"),
    canReadBusiness: granted.includes("business_management"),
    canListPages: granted.includes("pages_show_list"),
    canReadPages: granted.includes("pages_read_engagement"),
    missing: META_SCOPES.filter((scope) => !granted.includes(scope)),
    complete: META_SCOPES.every((scope) => granted.includes(scope)),
  };
}
const encoder = new TextEncoder();
export async function sha256(value: string) {
  const result = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return [...new Uint8Array(result)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const unb64 = (value: string) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
export async function sealToken(
  token: string,
  keyBase64: string,
  context: string,
) {
  const raw = unb64(keyBase64);
  if (raw.length !== 32) {
    throw new MetaFailure("META_ENCRYPTION_NOT_CONFIGURED");
  }
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
    "encrypt",
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(context) },
    key,
    encoder.encode(token),
  );
  return b64(iv) + "." + b64(new Uint8Array(encrypted));
}
export async function openToken(
  value: string,
  keyBase64: string,
  context: string,
) {
  const [iv, encrypted] = value.split(".");
  const raw = unb64(keyBase64);
  if (raw.length !== 32) {
    throw new MetaFailure("META_ENCRYPTION_NOT_CONFIGURED");
  }
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
    "decrypt",
  ]);
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: unb64(iv),
        additionalData: encoder.encode(context),
      },
      key,
      unb64(encrypted),
    ),
  );
}
export function graphUrl(
  version: string,
  path: string,
  params: Record<string, string> = {},
) {
  if (
    !/^v\d+\.0$/.test(version) ||
    !(path === "debug_token" || /^(?:me|act_\d+|\d+)(?:\/[a-z_]+)?$/.test(path))
  ) {
    throw new MetaFailure("META_INVALID_REQUEST");
  }
  const url = new URL(`https://graph.facebook.com/${version}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url;
}
// All authenticated resource calls enter through this hook, including pagination.
// Pagination accepts cursors, never arbitrary provider URLs containing tokens.
export async function readMeta(options: {
  version: string;
  path: string;
  params?: Record<string, string>;
  token: string;
  before: () => Promise<void>;
  after: (headers: Headers) => Promise<void>;
  fetcher?: typeof fetch;
}) {
  await options.before();
  let response: Response;
  try {
    response = await (options.fetcher || fetch)(
      graphUrl(options.version, options.path, options.params),
      {
        headers: { Authorization: "Bearer " + options.token },
        signal: AbortSignal.timeout(20000),
      },
    );
  } catch {
    throw new MetaFailure("META_TEMPORARILY_UNAVAILABLE", true, 10);
  }
  await options.after(response.headers);
  let body;
  try {
    body = await response.json();
  } catch {
    throw new MetaFailure("META_INVALID_RESPONSE", true, 10);
  }
  if (!response.ok || body.error) {
    throw metaError(
      body.error?.code,
      response.status,
      body.error?.is_transient === true,
    );
  }
  return body;
}
export const META_MESSAGES: Record<string, string> = {
  META_RECONNECT:
    "La connexion Meta doit être renouvelée. Reconnectez le compte.",
  META_APP_CHANGED:
    "L’application Meta a changé. Reconnectez votre Business Manager pour autoriser la nouvelle application.",
  META_TOKEN_UNVERIFIED:
    "Meta n’a pas permis de vérifier cette connexion. Reconnectez votre Business Manager pour renouveler son autorisation.",
  META_PERMISSION_REQUIRED:
    "Certaines autorisations Meta manquent. Reconnectez le compte et accordez les permissions nécessaires.",
  META_RATE_LIMIT:
    "Meta limite temporairement les appels. La synchronisation reprendra automatiquement.",
  META_TEMPORARILY_UNAVAILABLE:
    "Meta est temporairement indisponible. La synchronisation sera réessayée.",
  META_NOT_CONFIGURED:
    "La connexion publicitaire est en cours de configuration. Réessayez plus tard.",
  META_INVALID_RESPONSE:
    "Les données reçues de Meta sont incomplètes. Réessayez la synchronisation.",
  META_REQUEST_UNAVAILABLE:
    "Cette demande n’est pas disponible sur Meta. Vérifiez les autorisations et le compte sélectionné.",
};
