import { NextRequest } from "next/server";
import {
  authenticated,
  apiFailure,
  jsonBody,
  ApiError,
} from "@/lib/backend/http";
export async function GET(request: NextRequest) {
  try {
    const client = await authenticated(request);
    const { data, error } = await client.supabase
      .from("lyads_workspaces")
      .select("id,name,owner_id,created_at")
      .order("created_at")
      .limit(100);
    if (error) throw error;
    return client.json({ organizations: data });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = await jsonBody(request);
    const client = await authenticated(request);
    if (
      typeof body.name !== "string" ||
      !body.name.trim() ||
      body.name.trim().length > 200
    )
      throw new ApiError(
        "INVALID_NAME",
        400,
        "Indiquez un nom de 1 à 200 caractères.",
      );
    const { data, error } = await client.supabase
      .from("lyads_workspaces")
      .insert({ owner_id: client.user.id, name: body.name.trim() })
      .select("id,name,owner_id")
      .single();
    if (error) throw error;
    return client.json({ organization: data }, 201);
  } catch (error) {
    return apiFailure(error);
  }
}
