import { NextRequest } from "next/server";
import {
  authenticated,
  apiFailure,
  jsonBody,
  uuid,
  ApiError,
} from "@/lib/backend/http";
export async function POST(request: NextRequest) {
  try {
    const body = await jsonBody(request);
    if (!uuid(body.workspaceId))
      throw new ApiError(
        "INVALID_ORGANIZATION",
        400,
        "Sélectionnez votre organisation.",
      );
    const client = await authenticated(request);
    const { data, error } = await client.supabase.functions.invoke(
      "lyads-meta",
      { body: { action: "start", workspaceId: body.workspaceId } },
    );
    if (error || !data?.redirect)
      throw new ApiError(
        "META_NOT_AVAILABLE",
        503,
        "La connexion publicitaire n’est pas encore disponible. Vérifiez la configuration Meta dans Supabase.",
      );
    return client.json({ redirect: data.redirect });
  } catch (error) {
    return apiFailure(error);
  }
}
