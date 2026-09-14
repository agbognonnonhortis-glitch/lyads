import { MetaFailure, readMeta } from "./meta.ts";

// Never persist the debug response itself: it can contain identifiers and scopes
// for assets that have not been selected for this workspace.
export function tokenMetadata(
  response: unknown,
  appId: string,
  userId?: string,
  now = Date.now(),
) {
  const data = (response as { data?: Record<string, unknown> })?.data;
  if (!data || data.is_valid !== true) throw new MetaFailure("META_RECONNECT");
  if (typeof data.app_id !== "string" || !/^\d+$/.test(data.app_id)) {
    throw new MetaFailure("META_INVALID_RESPONSE");
  }
  if (data.app_id !== appId) throw new MetaFailure("META_APP_CHANGED");
  if (
    data.type !== "USER" || typeof data.user_id !== "string" ||
    !/^\d+$/.test(data.user_id) || (userId && userId !== data.user_id)
  ) {
    throw new MetaFailure("META_RECONNECT");
  }
  const expiry = (value: unknown) => {
    if (
      typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 ||
      value > 253402300799
    ) {
      throw new MetaFailure("META_INVALID_RESPONSE");
    }
    if (value === 0) return null;
    if (value * 1000 <= now) throw new MetaFailure("META_RECONNECT");
    return new Date(value * 1000).toISOString();
  };
  return {
    appId: data.app_id,
    userId: data.user_id,
    expiresAt: expiry(data.expires_at),
    dataAccessExpiresAt: expiry(data.data_access_expires_at),
  };
}

export async function inspectToken(options: {
  version: string;
  token: string;
  appId: string;
  appSecret: string;
  userId?: string;
  before: () => Promise<void>;
  after: (headers: Headers) => Promise<void>;
  fetcher?: typeof fetch;
}) {
  if (
    !/^\d+$/.test(options.appId) || !/^[a-f\d]{32}$/i.test(options.appSecret)
  ) {
    throw new MetaFailure("META_NOT_CONFIGURED");
  }
  let response;
  try {
    response = await readMeta({
      version: options.version,
      path: "debug_token",
      params: { input_token: options.token },
      token: options.appId + "|" + options.appSecret,
      before: options.before,
      after: options.after,
      fetcher: options.fetcher,
    });
  } catch (error) {
    // An invalid app credential is a server configuration problem, not evidence
    // that every customer's token has expired. Meta returns is_valid=false for
    // an invalid inspected token in a successful debug response.
    if (error instanceof MetaFailure && error.code === "META_RECONNECT") {
      throw new MetaFailure("META_NOT_CONFIGURED");
    }
    throw error;
  }
  return tokenMetadata(response, options.appId, options.userId);
}
