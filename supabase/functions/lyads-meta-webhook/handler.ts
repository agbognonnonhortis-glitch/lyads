import {
  boundedBody,
  sameToken,
  verifySignature,
  webhookAccounts,
} from "../_shared/webhook.ts";

export async function handle(request: Request, config: {
  appId: string;
  appSecret: string;
  verifyToken: string;
  receive: (hash: string, accounts: string[]) => Promise<void>;
}) {
  const reply = (message: string, status: number) =>
    new Response(message, {
      status,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  const appId = config.appId;
  const secret = config.appSecret;
  if (!/^\d+$/.test(appId) || !/^[a-f\d]{32}$/i.test(secret)) {
    return reply("Configuration Meta indisponible.", 503);
  }
  if (request.method === "GET") {
    const url = new URL(request.url);
    const token = config.verifyToken;
    if (token.length < 32) {
      return reply("Vérification du webhook non configurée.", 503);
    }
    const challenge = url.searchParams.get("hub.challenge") || "";
    if (
      url.searchParams.get("hub.mode") !== "subscribe" ||
      challenge.length > 200 || !challenge ||
      !await sameToken(url.searchParams.get("hub.verify_token") || "", token)
    ) return reply("Vérification refusée.", 403);
    return reply(challenge, 200);
  }
  if (request.method !== "POST") return reply("Méthode non autorisée.", 405);
  try {
    const signature = request.headers.get("x-hub-signature-256");
    if (!signature) return reply("Signature requise.", 401);
    const body = await boundedBody(request);
    if (!await verifySignature(body, signature, secret)) {
      return reply("Signature invalide.", 401);
    }
    const accountIds = webhookAccounts(
      JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)),
    );
    if (!accountIds.length) return reply("EVENT_RECEIVED", 200);
    const hash = [
      ...new Uint8Array(await crypto.subtle.digest("SHA-256", body)),
    ].map((b) => b.toString(16).padStart(2, "0")).join("");
    // Only acknowledge after durable storage. A database failure must be retried
    // by Meta, rather than silently losing a change event.
    try {
      await config.receive(hash, accountIds);
    } catch {
      return reply("Réception temporairement indisponible. Réessayez.", 503);
    }
    return reply("EVENT_RECEIVED", 200);
  } catch (error) {
    if (error instanceof Error && error.message === "BODY_TOO_LARGE") {
      return reply("Événement trop volumineux.", 413);
    }
    return reply("Événement invalide.", 400);
  }
}
