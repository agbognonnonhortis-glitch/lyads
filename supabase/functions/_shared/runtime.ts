import { SupabaseClient } from "@supabase/supabase-js";
import { MetaFailure } from "./meta.ts";
// Version verified against Meta's official facebook-nodejs-business-sdk.
export const graphVersion = () =>
  Deno.env.get("META_GRAPH_API_VERSION") || "v26.0";
export async function encryptionKey(db: SupabaseClient) {
  const configured = Deno.env.get("LYADS_META_TOKEN_KEY_V1");
  if (configured) return configured;
  const { data, error } = await db.rpc("lyads_meta_encryption_key");
  if (error || typeof data !== "string")
    throw new MetaFailure("META_ENCRYPTION_NOT_CONFIGURED");
  return data;
}
