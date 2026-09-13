import { NextRequest } from "next/server";
import {
  authenticated,
  jsonBody,
  apiFailure,
  ApiError,
  uuid,
} from "@/lib/backend/http";
import { onboardingData } from "@/lib/onboarding/data";
import { brainPatch } from "@/lib/onboarding/model";
export async function GET(request: NextRequest) {
  try {
    const c = await authenticated(request);
    return c.json(
      await onboardingData(
        c.supabase,
        c.user.id,
        request.nextUrl.searchParams.get("organization") || undefined,
      ),
    );
  } catch (e) {
    return apiFailure(e);
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = await jsonBody(request);
    const c = await authenticated(request);
    if (!uuid(body.workspaceId))
      throw new ApiError(
        "INVALID_ORGANIZATION",
        400,
        "Sélectionnez votre organisation.",
      );
    if (body.action === "inventory") {
      if (!["root", "business", "pixels"].includes(String(body.scope)))
        throw new ApiError(
          "INVALID_REQUEST",
          400,
          "Relancez la recherche depuis cette étape.",
        );
      const { data, error } = await c.supabase.rpc("lyads_request_inventory", {
        target_workspace: body.workspaceId,
        inventory_scope: body.scope,
      });
      if (error) throw error;
      return c.json({ jobId: data }, 202);
    }
    if (
      !Number.isInteger(body.revision) ||
      !body.changes ||
      typeof body.changes !== "object" ||
      Array.isArray(body.changes)
    )
      throw new ApiError("INVALID_REQUEST", 400, "Rechargez votre formulaire.");
    const changes = body.changes as Record<string, unknown>;
    if ("brain" in changes && !brainPatch(changes.brain))
      throw new ApiError(
        "INVALID_PROFILE",
        400,
        "Vérifiez les champs du formulaire et leur longueur.",
      );
    const { data, error } = await c.supabase.rpc("lyads_save_onboarding", {
      target_workspace: body.workspaceId,
      expected_revision: body.revision,
      changes,
    });
    if (error) {
      if (error.code === "40001")
        throw new ApiError(
          "REVISION_CONFLICT",
          409,
          "Le formulaire a changé dans un autre onglet. Rechargez la page avant de poursuivre.",
        );
      if (error.code === "42501")
        throw new ApiError(
          "ACCESS_DENIED",
          403,
          "Cette sélection ne correspond pas aux ressources accessibles de votre Business Manager.",
        );
      if (["22023", "23514", "23502", "22P02"].includes(error.code))
        throw new ApiError(
          "INVALID_SELECTION",
          400,
          error.message === "Free plan supports one account"
            ? "Le plan gratuit permet un compte publicitaire. Revenez à la sélection pour en conserver un."
            : error.message === "Select a Facebook page"
              ? "Sélectionnez au moins une page Facebook pour continuer."
              : "Complétez les sélections de cette étape. Le nom de votre activité et la confirmation du récapitulatif sont requis pour terminer.",
        );
      throw error;
    }
    return c.json({ state: data });
  } catch (e) {
    return apiFailure(e);
  }
}
