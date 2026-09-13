import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "../supabase/route";
import { sameOrigin } from "../auth/validation";
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v,
  );
export async function jsonBody(request: NextRequest) {
  if (!sameOrigin(request))
    throw new ApiError(
      "INVALID_ORIGIN",
      403,
      "Rechargez la page avant de réessayer.",
    );
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json")
    throw new ApiError(
      "INVALID_REQUEST",
      415,
      "Envoyez les informations au format JSON.",
    );
  if (Number(request.headers.get("content-length") || 0) > 32768)
    throw new ApiError(
      "BODY_TOO_LARGE",
      413,
      "Réduisez la taille de la demande.",
    );
  const text = await request.text();
  if (text.length > 32768)
    throw new ApiError(
      "BODY_TOO_LARGE",
      413,
      "Réduisez la taille de la demande.",
    );
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ApiError(
      "INVALID_REQUEST",
      400,
      "Vérifiez les informations envoyées.",
    );
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new ApiError(
      "INVALID_REQUEST",
      400,
      "Vérifiez les informations envoyées.",
    );
  return body as Record<string, unknown>;
}
export async function authenticated(request: NextRequest) {
  const client = createSupabaseRouteClient(request);
  const { data, error } = await client.supabase.auth.getUser();
  if (error || !data.user)
    throw new ApiError(
      "SESSION_REQUIRED",
      401,
      "Reconnectez-vous pour continuer.",
    );
  return { ...client, user: data.user };
}
export async function accountPermission(
  client: Awaited<ReturnType<typeof authenticated>>,
  accountId: string,
  edit = false,
) {
  if (!uuid(accountId))
    throw new ApiError(
      "INVALID_ACCOUNT",
      400,
      "Sélectionnez un compte publicitaire valide.",
    );
  const { data, error } = await client.supabase.rpc(
    "lyads_account_permission",
    { target_account: accountId },
  );
  if (error)
    throw new ApiError(
      "SERVICE_UNAVAILABLE",
      503,
      "Les droits sont temporairement indisponibles. Réessayez.",
    );
  const permission = data?.[0];
  if (!permission || (edit && !permission.can_edit))
    throw new ApiError(
      "ACCESS_DENIED",
      403,
      "Demandez un accès à ce compte au propriétaire de votre organisation.",
    );
  return permission as {
    workspace_id: string;
    role: string;
    can_edit: boolean;
  };
}
export function apiFailure(error: unknown) {
  const known = error instanceof ApiError;
  return NextResponse.json(
    {
      error: {
        code: known ? error.code : "SERVICE_UNAVAILABLE",
        message: known
          ? error.message
          : "Le service est temporairement indisponible. Réessayez dans quelques instants.",
      },
    },
    {
      status: known ? error.status : 503,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
