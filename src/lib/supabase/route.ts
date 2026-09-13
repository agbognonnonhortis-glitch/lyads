import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "./config";
import { appOrigin } from "../auth/validation";

/** A new authenticated client per request, using the caller's cookies and RLS. */
export function createSupabaseRouteClient(
  request: NextRequest,
  remember = request.cookies.get("lyads-remember")?.value !== "0",
) {
  const { url, publishableKey } = getSupabaseConfig();
  const pending = new Map<
    string,
    { name: string; value: string; options: CookieOptions }
  >();
  const responseHeaders = new Headers({ "Cache-Control": "private, no-store" });
  const supabase = createServerClient(url, publishableKey, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const cookie of cookiesToSet) {
          if (!remember && cookie.value) {
            delete cookie.options.maxAge;
            delete cookie.options.expires;
          }
          request.cookies.set(cookie.name, cookie.value);
          pending.set(cookie.name, cookie);
        }
        for (const [name, value] of Object.entries(headers))
          responseHeaders.set(name, value);
      },
    },
  });
  const apply = (response: NextResponse) => {
    for (const [name, value] of responseHeaders)
      response.headers.set(name, value);
    for (const cookie of pending.values())
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  };
  return {
    supabase,
    apply,
    redirect(path: string) {
      return apply(
        NextResponse.redirect(new URL(path, appOrigin(request)), 303),
      );
    },
    json(data: unknown, status = 200) {
      const response = NextResponse.json(data, {
        status,
        headers: responseHeaders,
      });
      return apply(response);
    },
  };
}
