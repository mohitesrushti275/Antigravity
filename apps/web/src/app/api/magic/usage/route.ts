import { NextRequest } from "next/server";
import { extractApiKey, validateApiKey } from "@/lib/api/apiKeyAuth";

// GET /api/magic/usage — Usage stats for caller's API key
export async function GET(req: NextRequest) {
  const rawKey = extractApiKey(req.headers);
  if (!rawKey) {
    return Response.json(
      { error: "API key required. Use Authorization: Bearer <key> or x-api-key header.", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const result = await validateApiKey(rawKey, {
    endpoint: "/api/magic/usage",
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? undefined,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  if (!result.ok) {
    return Response.json(
      { error: result.error.error, code: result.error.code },
      { status: result.error.status }
    );
  }

  // Return usage stats from the validated key
  return Response.json({
    data: {
      keyId: result.data.keyId,
      scope: result.data.scope,
      remaining: result.data.remaining,
    },
  });
}
