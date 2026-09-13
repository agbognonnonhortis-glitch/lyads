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
    const c = await authenticated(request);
    if (!uuid(body.organizationId))
      throw new ApiError(
        "INVALID_ORGANIZATION",
        400,
        "Sélectionnez une entreprise.",
      );
    const { data, error } = await c.supabase
      .from("lyads_workspaces")
      .select("id")
      .eq("id", body.organizationId)
      .maybeSingle();
    if (error) throw error;
    if (!data)
      throw new ApiError(
        "ACCESS_DENIED",
        403,
        "Cette entreprise n’est pas accessible.",
      );
    const response = c.json({ organizationId: data.id });
    response.cookies.set("lyads-organization", data.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
    });
    return response;
  } catch (error) {
    return apiFailure(error);
  }
}
