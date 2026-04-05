import { supabaseAdmin } from '@/lib/supabase/admin';
import { getFileContent } from '@/lib/s3/client';

// ═══════════════════════════════════════════════════
// VECTOR SEARCH — Registry context retrieval
// ═══════════════════════════════════════════════════

interface SearchResult {
  name: string;
  description: string;
  similarity?: number;
  source?: string;
}

/**
 * Search the component registry using pgvector similarity.
 * Returns top K matched components with their source code.
 *
 * If embeddings API is not configured, falls back to FTS.
 */
export async function searchRegistry(
  prompt: string,
  topK: number = 3
): Promise<SearchResult[]> {
  // Attempt vector search first (requires OpenAI embeddings API key)
  try {
    const embedding = await generateEmbedding(prompt);
    if (embedding) {
      const { data: results } = await supabaseAdmin.rpc('search_components', {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: topK,
      });

      if (results?.length) {
        return await enrichWithSource(results);
      }
    }
  } catch {
    // Fall through to FTS
  }

  // Fallback: Full-text search
  const { data: ftsResults } = await supabaseAdmin
    .from('components')
    .select('id, name, description')
    .in('status', ['posted', 'featured'])
    .textSearch('name', prompt, { type: 'websearch' })
    .limit(topK);

  if (ftsResults?.length) {
    return await enrichWithSource(ftsResults);
  }

  return [];
}

/**
 * Generate embedding for text using OpenAI text-embedding-3-small.
 * Returns null if API key is not configured (stub mode).
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null; // Stub mode — no API key configured

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) return null;

  const json = await response.json();
  return json.data?.[0]?.embedding ?? null;
}

/**
 * Enrich search results with source code from S3.
 */
async function enrichWithSource(
  results: Array<{ id: string; name: string; description: string; similarity?: number }>
): Promise<SearchResult[]> {
  return Promise.all(
    results.map(async (r) => {
      let source: string | undefined;
      try {
        const { data: files } = await supabaseAdmin
          .from('component_files')
          .select('r2_key')
          .eq('component_id', r.id)
          .eq('file_type', 'component')
          .limit(1)
          .single();

        if (files?.r2_key) {
          source = await getFileContent(files.r2_key);
        }
      } catch {
        // Skip source enrichment on failure
      }

      return { name: r.name, description: r.description, similarity: r.similarity, source };
    })
  );
}
