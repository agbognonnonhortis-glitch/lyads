import { handle } from "./handler.ts";
import { createClient } from "@supabase/supabase-js";
Deno.serve((request) => {
  const appId = Deno.env.get("META_APP_ID") || "";
  return handle(request, {
    appId,
    appSecret: Deno.env.get("META_APP_SECRET") || "",
    verifyToken: Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") || "",
    receive: async (hash, accounts) => {
      const db = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { error } = await db.rpc("lyads_receive_meta_webhook", {
        token_app: appId,
        body_hash: hash,
        account_ids: accounts,
      });
      if (error) throw new Error("WEBHOOK_STORAGE_UNAVAILABLE");
    },
  });
});
