/**
 * migrate-embeddings.ts
 *
 * Backfill script: Generate embeddings for all components with null description_embedding.
 *
 * Usage:
 *   npx tsx scripts/migrate-embeddings.ts
 *
 * Requirements:
 *   - OPENAI_API_KEY
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BATCH_SIZE = 50;

async function embed(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Embedding failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return data.data[0].embedding;
}

async function main() {
  if (!OPENAI_API_KEY) {
    console.error("ERROR: OPENAI_API_KEY not set");
    process.exit(1);
  }

  console.log("🔍 Finding components missing embeddings...");

  const { data: pending, error } = await supabase
    .from("components")
    .select("id, name, description")
    .is("description_embedding", null)
    .in("status", ["posted", "featured"])
    .limit(500);

  if (error) {
    console.error("Query error:", error.message);
    process.exit(1);
  }

  console.log(`📦 Found ${pending?.length ?? 0} components to process\n`);

  if (!pending?.length) {
    console.log("✅ All embeddings up to date!");
    return;
  }

  let success = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(pending.length / BATCH_SIZE)}...`);

    for (const c of batch) {
      try {
        const text = `${c.name} ${c.description}`;
        const embedding = await embed(text);

        await supabase
          .from("components")
          .update({ description_embedding: embedding })
          .eq("id", c.id);

        success++;
        process.stdout.write(`  ✅ ${c.name}\n`);
      } catch (err: any) {
        failed++;
        process.stdout.write(`  ❌ ${c.name}: ${err.message}\n`);
      }

      // Rate limit: 3000 RPM = ~50/sec, be conservative
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  console.log(`\n🏁 Done! Success: ${success}, Failed: ${failed}`);
}

main().catch(console.error);
