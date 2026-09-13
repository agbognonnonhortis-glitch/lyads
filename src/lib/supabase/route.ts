import "server-only";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseConfig } from "./config";

/** A new authenticated client per request, using the caller's cookies and RLS. */
export function createSupabaseRouteClient(request: NextRequest) {
  const { url, publishableKey } = getSupabaseConfig();
  const pending = new Map<
    string,
    { name: string; value: string; options: CookieOptions }
  >();
  const responseHeaders = new Headers({ "Cache-Control": "private, no-store" });
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
          pending.set(cookie.name, cookie);
        }
        for (const [name, value] of Object.entries(headers))
          responseHeaders.set(name, value);
      },
    },
  });
  return {
    supabase,
    json(data: unknown, status = 200) {
      const response = NextResponse.json(data, {
        status,
        headers: responseHeaders,
      });
      for (const cookie of pending.values())
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      return response;
    },
  };
}
