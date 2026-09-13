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
  const { data, error } = await supabase.rpc("lyads_initialize_account", {
    display_name: displayName,
  });
  if (error) throw new Error("ACCOUNT_INITIALIZATION_FAILED");
  return data as string;
}
