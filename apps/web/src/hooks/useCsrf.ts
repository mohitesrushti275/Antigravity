"use client";

import { useCallback, useEffect, useRef } from "react";

// ═══════════════════════════════════════════════════
// CSRF TOKEN HOOK
// Automatically fetches a CSRF token on mount and
// provides a wrapper for fetch() that includes the token.
// ═══════════════════════════════════════════════════

let cachedToken: string | null = null;
let tokenPromise: Promise<string> | null = null;

async function fetchCsrfToken(): Promise<string> {
  const res = await fetch("/api/csrf", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch CSRF token");
  const { data } = await res.json();
  cachedToken = data.token;
  return data.token;
}

function getCsrfToken(): Promise<string> {
  if (cachedToken) return Promise.resolve(cachedToken);
  if (!tokenPromise) {
    tokenPromise = fetchCsrfToken().finally(() => {
      tokenPromise = null;
    });
  }
  return tokenPromise;
}

/**
 * Hook that provides CSRF-protected fetch.
 * Use `csrfFetch` instead of `fetch` for all mutations.
 *
 * @example
 * const { csrfFetch } = useCsrf();
 *
 * const res = await csrfFetch("/api/me", {
 *   method: "PATCH",
 *   body: JSON.stringify({ bio: "hello" }),
 * });
 */
export function useCsrf() {
  const tokenRef = useRef<string | null>(cachedToken);

  // Pre-fetch token on mount
  useEffect(() => {
    getCsrfToken().then((t) => {
      tokenRef.current = t;
    });
  }, []);

  const csrfFetch = useCallback(
    async (url: string, init?: RequestInit): Promise<Response> => {
      const token = tokenRef.current ?? (await getCsrfToken());

      const headers = new Headers(init?.headers);
      headers.set("x-csrf-token", token);
      if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
      }

      const res = await fetch(url, {
        ...init,
        headers,
        credentials: "include",
      });

      // If CSRF token expired, refresh and retry once
      if (res.status === 403) {
        const body = await res.clone().json().catch(() => null);
        if (body?.code === "FORBIDDEN" && body?.error?.includes("CSRF")) {
          cachedToken = null;
          tokenRef.current = null;
          const newToken = await getCsrfToken();
          tokenRef.current = newToken;
          headers.set("x-csrf-token", newToken);
          return fetch(url, { ...init, headers, credentials: "include" });
        }
      }

      return res;
    },
    []
  );

  return { csrfFetch };
}
