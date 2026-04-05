import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET /api/cron/update-embeddings — Backfill null embeddings
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }


  // Find components without embeddings
  const { data: pending } = await supabaseAdmin
    .from("components")
    .select("id, name, description")
    .is("description_embedding", null)
    .in("status", ["posted", "featured"])
    .limit(100);

  if (!pending?.length) {
    return Response.json({ data: { updated: 0 } });
  }

  let updated = 0;

  if (!process.env.OPENAI_API_KEY) {
    console.log(JSON.stringify({ level: "warn", action: "cron.update_embeddings", message: "OPENAI_API_KEY not set" }));
    return Response.json({ data: { updated: 0, message: "OPENAI_API_KEY not configured" } });
  }

  for (const c of pending) {
    try {
      const text = `${c.name} ${c.description}`;
      const embRes = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: text,
        }),
      });

      if (!embRes.ok) continue;

      const embData = await embRes.json();
      const embedding = embData.data?.[0]?.embedding;

      if (embedding) {
        await supabaseAdmin
          .from("components")
          .update({ description_embedding: embedding })
          .eq("id", c.id);
        updated++;
      }
    } catch {
      console.error(JSON.stringify({ level: "error", action: "cron.update_embeddings", componentId: c.id }));
    }
  }

  console.log(JSON.stringify({ level: "info", action: "cron.update_embeddings", updated, total: pending.length }));

  return Response.json({ data: { updated, total: pending.length } });
}
