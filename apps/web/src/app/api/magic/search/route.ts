import { NextRequest } from "next/server";
import { searchRegistry } from "@/lib/magic/search";
import { z } from "zod";

const SearchSchema = z.object({
  prompt: z.string().min(3).max(500),
});

// POST /api/magic/search — Vector search only (no generation)
export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = SearchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid request", code: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const matches = await searchRegistry(parsed.data.prompt, 5);
    return Response.json({
      data: matches.map((m) => ({
        name: m.name,
        description: m.description,
        similarity: m.similarity,
        // Don't include source code in search-only results
      })),
    });
  } catch {
    return Response.json({ error: "Search failed", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
