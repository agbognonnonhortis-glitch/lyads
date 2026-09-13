import { onboardingDestination } from "@/lib/onboarding/data";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";
import {
  isEmail,
  isName,
  isStrongPassword,
  sameOrigin,
  appOrigin,
} from "@/lib/auth/validation";
import { initializeAccount } from "@/lib/auth/account";

export const dynamic = "force-dynamic";
const secureOptions = (request: NextRequest) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: request.nextUrl.protocol === "https:",
  path: "/",
});
const failure = (code: string, status: number) =>
  NextResponse.json(
    { ok: false, code },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  if ((await context.params).action !== "session")
    return failure("NOT_FOUND", 404);
  try {
    const client = createSupabaseRouteClient(request);
    const {
      data: { user },
      error,
    } = await client.supabase.auth.getUser();
    return client.json({
      user: !error && user ? { id: user.id, email: user.email } : null,
      pendingEmail: request.cookies.get("lyads-pending-email")?.value ?? null,
    });
  } catch {
    return failure("SERVICE_UNAVAILABLE", 503);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  if (!sameOrigin(request)) return failure("INVALID_ORIGIN", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return failure("INVALID_REQUEST", 415);
  if (Number(request.headers.get("content-length") ?? 0) > 8192)
    return failure("INVALID_REQUEST", 413);
  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > 8192) return failure("INVALID_REQUEST", 413);
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return failure("INVALID_REQUEST", 400);
    body = parsed;
  } catch {
    return failure("INVALID_REQUEST", 400);
  }
  const { action } = await context.params;
  if (
    ![
      "login",
      "signup",
      "recover",
      "resend",
      "reset",
      "logout",
      "google",
      "facebook",
    ].includes(action)
  )
    return failure("NOT_FOUND", 404);
  try {
    const client = createSupabaseRouteClient(
      request,
      action === "login" ? body.remember !== false : undefined,
    );
    const { supabase } = client;
    const fail = (code: string, status = 400) =>
      client.json({ ok: false, code }, status);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const password = body.password;
    const pending = (response: NextResponse) => {
      response.cookies.set("lyads-pending-email", email, {
        ...secureOptions(request),
        maxAge: 3600,
      });
      return response;
    };
    const callback = (flow: "signup" | "recovery" | "oauth") =>
      `${appOrigin(request)}/auth/callback?flow=${flow}`;
    if (action === "login") {
      if (
        !isEmail(email) ||
        typeof password !== "string" ||
        !password ||
        password.length > 128
      )
        return fail("INVALID_REQUEST");
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error)
        return fail(
          error.status === 429
            ? "RATE_LIMITED"
            : error.code === "email_not_confirmed"
              ? "EMAIL_UNCONFIRMED"
              : "INVALID_CREDENTIALS",
          error.status === 429 ? 429 : 401,
        );
      if (!data.user) return fail("INVALID_CREDENTIALS", 401);
      try {
        await initializeAccount(supabase, data.user);
      } catch {
        await supabase.auth.signOut({ scope: "local" });
        return fail("SERVICE_UNAVAILABLE", 503);
      }
      const response = client.json({
        ok: true,
        redirect: await onboardingDestination(supabase, data.user.id),
      });
      response.cookies.set(
        "lyads-remember",
        body.remember === false ? "0" : "1",
        {
          ...secureOptions(request),
          ...(body.remember === false ? {} : { maxAge: 31536000 }),
        },
      );
      response.cookies.delete("lyads-pending-email");
      return response;
    }
    if (action === "signup") {
      if (
        !isEmail(email) ||
        !isName(body.firstName) ||
        !isName(body.lastName) ||
        !isStrongPassword(password) ||
        body.terms !== true
      )
        return fail("INVALID_REQUEST");
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: callback("signup"),
          data: {
            first_name: body.firstName.trim(),
            last_name: body.lastName.trim(),
          },
        },
      });
      if (error && error.code !== "user_already_exists")
        return fail(
          error.status === 429 ? "RATE_LIMITED" : "SERVICE_UNAVAILABLE",
          error.status === 429 ? 429 : 503,
        );
      if (data?.session && data.user) {
        await initializeAccount(supabase, data.user);
        return client.json({
          ok: true,
          redirect: await onboardingDestination(supabase, data.user.id),
        });
      }
      return pending(client.json({ ok: true, redirect: "/verification" }));
    }
    if (action === "recover" || action === "resend") {
      if (!isEmail(email)) return fail("INVALID_REQUEST");
      const { error } =
        action === "recover"
          ? await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: callback("recovery"),
            })
          : await supabase.auth.resend({
              type: "signup",
              email,
              options: { emailRedirectTo: callback("signup") },
            });
      // Known/unknown addresses receive the same successful response. Operational
      // failures remain visible; never pretend that a network failure sent mail.
      if (
        error &&
        ![
          "user_not_found",
          "email_not_confirmed",
          "user_already_exists",
        ].includes(error.code ?? "")
      ) {
        return fail(
          error.status === 429 ? "RATE_LIMITED" : "SERVICE_UNAVAILABLE",
          error.status === 429 ? 429 : 503,
        );
      }
      return pending(
        client.json({
          ok: true,
          redirect:
            action === "recover" ? "/confirmation-envoi" : "/verification",
        }),
      );
    }
    if (action === "google" || action === "facebook") {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: action,
        options: { redirectTo: callback("oauth"), skipBrowserRedirect: true },
      });
      if (error || !data.url) return fail("PROVIDER_UNAVAILABLE", 503);
      return client.json({ ok: true, redirect: data.url });
    }
    if (action === "logout") {
      const { error } = await supabase.auth.signOut({
        scope: body.all === true ? "global" : "local",
      });
      if (error) return fail("SERVICE_UNAVAILABLE", 503);
      const response = client.json({ ok: true, redirect: "/connexion" });
      response.cookies.delete("lyads-remember");
      response.cookies.delete("lyads-pending-email");
      return response;
    }
    const {
      data: { user },
      error: identityError,
    } = await supabase.auth.getUser();
    if (identityError || !user) return fail("SESSION_REQUIRED", 401);
    if (!isStrongPassword(password) || password !== body.confirmPassword)
      return fail("INVALID_PASSWORD");
    const { error } = await supabase.auth.updateUser({ password });
    if (error)
      return fail(
        error.code === "same_password"
          ? "INVALID_PASSWORD"
          : "SERVICE_UNAVAILABLE",
      );
    const { error: signOutError } = await supabase.auth.signOut({
      scope: "global",
    });
    if (signOutError) return fail("SERVICE_UNAVAILABLE", 503);
    return client.json({
      ok: true,
      redirect: "/connexion?auth=password_updated",
    });
  } catch {
    return failure("SERVICE_UNAVAILABLE", 503);
  }
}
