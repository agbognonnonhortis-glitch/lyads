const encoder = new TextEncoder();
export async function verifySignature(
  body: Uint8Array,
  signature: string | null,
  secret: string,
) {
  if (!secret || !signature || !/^sha256=[a-f\d]{64}$/i.test(signature)) {
    return false;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const bytes = Uint8Array.from(
    signature.slice(7).match(/../g)!,
    (value) => parseInt(value, 16),
  );
  return crypto.subtle.verify("HMAC", key, bytes, new Uint8Array(body));
}
export async function sameToken(actual: string, expected: string) {
  if (!actual || !expected) return false;
  const [a, b] = await Promise.all(
    [actual, expected].map(async (s) =>
      new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(s)))
    ),
  );
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ b[i];
  return difference === 0;
}
export function webhookAccounts(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") throw new Error("INVALID_EVENT");
  const p = payload as Record<string, unknown>;
  // Other Meta products do not authorize a read of an advertising account.
  if (p.object !== "ad_account") return [];
  if (!Array.isArray(p.entry) || p.entry.length > 200) {
    throw new Error("INVALID_EVENT");
  }
  const ids: string[] = [];
  for (const entry of p.entry) {
    if (
      !entry || typeof entry.id !== "string" ||
      !/^(?:act_)?\d+$/.test(entry.id) || !Array.isArray(entry.changes)
    ) throw new Error("INVALID_EVENT");
    if (entry.changes.length) {
      ids.push(entry.id.startsWith("act_") ? entry.id : "act_" + entry.id);
    }
  }
  return [...new Set(ids)];
}

// Read incrementally; Content-Length alone is not a trustworthy body limit.
export async function boundedBody(request: Request, limit = 262144) {
  if (!request.body) throw new Error("INVALID_EVENT");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    void reader.cancel();
  }, 5000);
  let ended = false;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        ended = true;
        break;
      }
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new Error("BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    clearTimeout(timer);
    reader.releaseLock();
  }
  if (timedOut || !ended || size === 0) throw new Error("INVALID_EVENT");
  const bytes = new Uint8Array(size);
  let position = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, position);
    position += chunk.length;
  }
  return bytes;
}
