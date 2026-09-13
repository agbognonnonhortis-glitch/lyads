import { createClient } from "@supabase/supabase-js";
import {
  MetaFailure,
  META_MESSAGES,
  permissions,
  sha256,
  sealToken,
  readMeta,
  metaError,
} from "../_shared/meta.ts";
import { graphVersion, encryptionKey } from "../_shared/runtime.ts";
const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new MetaFailure("META_NOT_CONFIGURED");
  return value;
};
const admin = () =>
  createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, no-store",
    },
  });
function settings() {
  const version = graphVersion();
  if (!/^v\d+\.0$/.test(version)) throw new MetaFailure("META_NOT_CONFIGURED");
  const origin = new URL(
    Deno.env.get("LYADS_APP_URL") || "http://127.0.0.1:3000",
  );
  if (
    origin.username ||
    origin.password ||
    origin.pathname !== "/" ||
    origin.search ||
    origin.hash ||
    !(
      origin.protocol === "https:" ||
      (origin.protocol === "http:" &&
        ["127.0.0.1", "localhost"].includes(origin.hostname))
    )
  )
    throw new MetaFailure("META_NOT_CONFIGURED");
  return {
    version,
    origin: origin.origin,
    appId: env("META_APP_ID"),
    appSecret: env("META_APP_SECRET"),
    callback: env("SUPABASE_URL") + "/functions/v1/lyads-meta/callback",
  };
}
async function slot(db: ReturnType<typeof admin>, bucket: string) {
  const { data, error } = await db.rpc("lyads_take_meta_slot", {
    bucket_key: bucket,
  });
  if (error) throw new MetaFailure("META_TEMPORARILY_UNAVAILABLE", true, 10);
  if (data > 0)
    throw new MetaFailure(
      "META_RATE_LIMIT",
      true,
      Math.max(1, Math.ceil(data / 1000)),
    );
}
async function exchange(
  db: ReturnType<typeof admin>,
  cfg: ReturnType<typeof settings>,
  params: Record<string, string>,
) {
  await slot(db, "oauth:" + cfg.appId);
  const url = new URL(
    `https://graph.facebook.com/${cfg.version}/oauth/access_token`,
  );
  for (const [key, value] of Object.entries({
    ...params,
    client_id: cfg.appId,
    client_secret: cfg.appSecret,
  }))
    url.searchParams.set(key, value);
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  } catch {
    throw new MetaFailure("META_TEMPORARILY_UNAVAILABLE");
  }
  const data = await response.json();
  if (!response.ok || typeof data.access_token !== "string")
    throw metaError(data.error?.code, response.status);
  return data;
}
Deno.serve(async (request: Request) => {
  let cfg: ReturnType<typeof settings> | undefined;
  try {
    cfg = settings();
    const db = admin();
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname.endsWith("/health")) {
      await encryptionKey(db);
      const ready =
        /^\d+$/.test(cfg.appId) && /^[a-f0-9]{32}$/i.test(cfg.appSecret);
      return json({ ready }, ready ? 200 : 503);
    }
    if (request.method === "GET" && url.pathname.endsWith("/callback")) {
      const state = url.searchParams.get("state");
      if (!state || !/^[a-f0-9]{64}$/.test(state))
        return json(
          {
            error: {
              code: "META_INVALID_STATE",
              message: "Le lien a expiré. Relancez la connexion Meta.",
            },
          },
          400,
        );
      const { data: states, error: stateError } = await db.rpc(
        "lyads_consume_meta_state",
        { hash: await sha256(state) },
      );
      if (stateError || !states?.[0])
        return json(
          {
            error: {
              code: "META_INVALID_STATE",
              message: "Le lien a expiré. Relancez la connexion Meta.",
            },
          },
          400,
        );
      const pending = states[0];
      const { data: workspace } = await db
        .from("lyads_workspaces")
        .select("owner_id")
        .eq("id", pending.workspace_id)
        .single();
      if (workspace?.owner_id !== pending.user_id)
        throw new MetaFailure("META_PERMISSION_REQUIRED");
      const code = url.searchParams.get("code");
      if (!code || url.searchParams.has("error"))
        return Response.redirect(
          cfg.origin + "/configuration/meta?meta=cancelled",
          303,
        );
      const short = await exchange(db, cfg, {
        code,
        redirect_uri: cfg.callback,
      });
      // The two protocol exchanges are individually throttled; this is bounded,
      // while inventory and history are always durable jobs.
      await new Promise((resolve) => setTimeout(resolve, 1100));
      const long = await exchange(db, cfg, {
        grant_type: "fb_exchange_token",
        fb_exchange_token: short.access_token,
      });
      const token = long.access_token as string;
      const before = async () => {
        await new Promise((resolve) => setTimeout(resolve, 1100));
        await slot(db, "oauth:" + cfg!.appId);
      };
      const after = async () => {};
      const identity = await readMeta({
        version: cfg.version,
        path: "me",
        params: { fields: "id" },
        token,
        before,
        after,
      });
      const actual = await readMeta({
        version: cfg.version,
        path: "me/permissions",
        token,
        before,
        after,
      });
      if (!/^\d+$/.test(identity.id))
        throw new MetaFailure("META_INVALID_RESPONSE");
      const access = permissions(actual.data);
      const ciphertext = await sealToken(
        token,
        await encryptionKey(db),
        pending.workspace_id + ":" + identity.id,
      );
      const expires =
        typeof long.expires_in === "number"
          ? new Date(Date.now() + long.expires_in * 1000).toISOString()
          : null;
      const { data: connection, error } = await db.rpc(
        "lyads_save_meta_connection",
        {
          target_workspace: pending.workspace_id,
          meta_user: identity.id,
          scopes: access.granted,
          permissions: access.statuses,
          token_expiry: expires,
          encrypted_token: ciphertext,
        },
      );
      if (error || !connection)
        throw new MetaFailure("META_TEMPORARILY_UNAVAILABLE");
      const { error: jobError } = await db.from("lyads_jobs").insert({
        workspace_id: pending.workspace_id,
        requested_by: pending.user_id,
        kind: "meta.discover",
        idempotency_key: "oauth:" + state,
        priority: 100,
        payload: { connection_id: connection },
      });
      if (jobError) throw new MetaFailure("META_TEMPORARILY_UNAVAILABLE");
      return Response.redirect(
        cfg.origin +
          "/configuration/business-manager?meta=" +
          (access.canReadAds ? "connected" : "partial"),
        303,
      );
    }
    if (request.method !== "POST")
      return json(
        {
          error: {
            code: "METHOD_NOT_ALLOWED",
            message: "Utilisez le bouton de connexion dans Lyads.",
          },
        },
        405,
      );
    // verify_jwt=false supports current asymmetric Supabase JWTs. Identity is
    // always verified with Auth here before any privileged client operation.
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer "))
      return json(
        {
          error: {
            code: "SESSION_REQUIRED",
            message: "Reconnectez-vous pour continuer.",
          },
        },
        401,
      );
    const jwt = authorization.slice(7);
    const { data: identity, error: identityError } = await db.auth.getUser(jwt);
    if (identityError || !identity.user)
      return json(
        {
          error: {
            code: "SESSION_REQUIRED",
            message: "Reconnectez-vous pour continuer.",
          },
        },
        401,
      );
    if (Number(request.headers.get("content-length") || 0) > 4096)
      return json(
        { error: { code: "INVALID_REQUEST", message: "Réduisez la demande." } },
        413,
      );
    const body = await request.json();
    if (body.action !== "start" || typeof body.workspaceId !== "string")
      return json(
        {
          error: {
            code: "INVALID_REQUEST",
            message: "Sélectionnez votre organisation.",
          },
        },
        400,
      );
    const { data: workspace } = await db
      .from("lyads_workspaces")
      .select("owner_id")
      .eq("id", body.workspaceId)
      .maybeSingle();
    if (workspace?.owner_id !== identity.user.id)
      return json(
        {
          error: {
            code: "ACCESS_DENIED",
            message: "Le propriétaire doit connecter le compte Meta.",
          },
        },
        403,
      );
    const state = [...crypto.getRandomValues(new Uint8Array(32))]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    const { error } = await db.from("lyads_meta_oauth_states").insert({
      state_hash: await sha256(state),
      workspace_id: body.workspaceId,
      user_id: identity.user.id,
      expires_at: new Date(Date.now() + 600000).toISOString(),
    });
    if (error) throw new MetaFailure("META_TEMPORARILY_UNAVAILABLE");
    const redirect = new URL(
      `https://www.facebook.com/${cfg.version}/dialog/oauth`,
    );
    redirect.search = new URLSearchParams({
      client_id: cfg.appId,
      redirect_uri: cfg.callback,
      state,
      response_type: "code",
      scope: "ads_read,ads_management,pages_show_list,business_management",
      auth_type: "rerequest",
    }).toString();
    return json({ redirect: redirect.toString() });
  } catch (error) {
    const code =
      error instanceof MetaFailure
        ? error.code
        : "META_TEMPORARILY_UNAVAILABLE";
    // No raw provider errors, auth codes, URLs or tokens in logs/responses.
    console.error("[meta]", code);
    if (request.method === "GET" && cfg)
      return Response.redirect(
        cfg.origin + "/configuration/meta?meta=" + encodeURIComponent(code),
        303,
      );
    return json(
      {
        error: {
          code,
          message:
            META_MESSAGES[code] || META_MESSAGES.META_TEMPORARILY_UNAVAILABLE,
        },
      },
      503,
    );
  }
});
