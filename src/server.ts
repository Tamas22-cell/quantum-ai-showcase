import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { shouldDenyAdminRequest, verifySupabaseAdmin } from "./lib/admin-access";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const authConfig = {
      url: process.env.VITE_SUPABASE_URL,
      publicKey: process.env.VITE_SUPABASE_ANON_KEY,
    };
    const reject = (status: number) => new Response(status === 401 ? "Unauthorized" : "Forbidden", {
      status,
      headers: { "cache-control": "no-store", "content-type": "text/plain; charset=utf-8" },
    });

    if (pathname === "/api/admin/session" || pathname === "/api/admin/logout") {
      if (request.method !== "POST" || request.headers.get("origin") !== url.origin) {
        return reject(403);
      }
      if (pathname === "/api/admin/logout") {
        return new Response(null, {
          status: 204,
          headers: {
            "cache-control": "no-store",
            "set-cookie": "__Host-admin_session=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Strict",
          },
        });
      }
      if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) {
        return reject(403);
      }
      let accessToken: string | undefined;
      try {
        const body = await request.text();
        if (body.length > 10000) return reject(403);
        const parsed = JSON.parse(body) as { accessToken?: unknown };
        if (typeof parsed.accessToken === "string") accessToken = parsed.accessToken;
      } catch {
        return reject(403);
      }
      if (!await verifySupabaseAdmin(accessToken, authConfig)) return reject(403);
      return new Response(null, {
        status: 204,
        headers: {
          "cache-control": "no-store",
          "set-cookie": "__Host-admin_session=" + encodeURIComponent(accessToken!) +
            "; Path=/; Max-Age=3600; Secure; HttpOnly; SameSite=Strict",
        },
      });
    }

    if (shouldDenyAdminRequest(request.url)) {
      const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim())
        .find((part) => part.startsWith("__Host-admin_session="));
      const token = cookie ? decodeURIComponent(cookie.slice("__Host-admin_session=".length)) : undefined;
      if (!await verifySupabaseAdmin(token, authConfig)) return reject(403);
    }
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      if (shouldDenyAdminRequest(request.url)) {
        normalized.headers.set("cache-control", "private, no-store");
      }
      return normalized;
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
