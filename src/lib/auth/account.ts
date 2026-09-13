import type { SupabaseClient, User } from "@supabase/supabase-js";

export async function initializeAccount(supabase: SupabaseClient, user: User) {
  // User-editable metadata is used for display only, never for authorization.
  const names = [user.user_metadata?.first_name, user.user_metadata?.last_name]
    .filter((name): name is string => typeof name === "string" && !!name.trim())
    .join(" ")
    .trim();
  const displayName = (
    names ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "") ||
    user.email ||
    ""
  )
    .trim()
    .slice(0, 200);
  if (!displayName) throw new Error("PROFILE_NAME_REQUIRED");
  // This RPC is atomic and idempotent: a gateway timeout may hide a successful
  // transaction, so retrying must keep the same arguments and user identity.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error, status } = await supabase.rpc(
      "lyads_initialize_account",
      {
        display_name: displayName,
      },
    );
    if (!error && typeof data === "string" && data) return data;
    const transient = [0, 408, 500, 502, 503, 504].includes(status);
    if (transient && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 300 * 2 ** attempt));
      continue;
    }
    // Never log the response body, metadata, email, tokens or callback URL.
    console.error("[auth] account_initialization_failed", {
      status,
      code: /^[A-Za-z0-9_]{1,40}$/.test(error?.code ?? "")
        ? error!.code
        : "UNAVAILABLE",
      attempts: attempt + 1,
    });
    throw new Error("ACCOUNT_INITIALIZATION_FAILED");
  }
  throw new Error("ACCOUNT_INITIALIZATION_FAILED");
}
