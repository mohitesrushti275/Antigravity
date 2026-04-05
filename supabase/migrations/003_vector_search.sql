-- ══════════════════════════════════════════════════
-- 21st.dev — Vector Search Functions
-- Migration 003: pgvector RPC + count recompute
-- ══════════════════════════════════════════════════

-- Vector similarity search for AI context retrieval
CREATE OR REPLACE FUNCTION search_components(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.5,
  match_count     INT   DEFAULT 5
)
RETURNS TABLE (
  id          UUID,
  name        TEXT,
  description TEXT,
  similarity  FLOAT
)
LANGUAGE sql STABLE AS $$
  SELECT
    c.id,
    c.name,
    c.description,
    1 - (c.description_embedding <=> query_embedding) AS similarity
  FROM components c
  WHERE
    c.status IN ('posted', 'featured')
    AND c.description_embedding IS NOT NULL
    AND 1 - (c.description_embedding <=> query_embedding) > match_threshold
  ORDER BY c.description_embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Recompute denormalized counters (prevents drift from trigger failures)
CREATE OR REPLACE FUNCTION recompute_component_counts()
RETURNS void LANGUAGE sql AS $$
  UPDATE components c SET
    download_count = (SELECT COUNT(*) FROM downloads d WHERE d.component_id = c.id),
    like_count     = (SELECT COUNT(*) FROM likes    l WHERE l.component_id = c.id);
$$;

-- Recompute category component counts
CREATE OR REPLACE FUNCTION recompute_category_counts()
RETURNS void LANGUAGE sql AS $$
  UPDATE categories cat SET
    component_count = (
      SELECT COUNT(*) FROM components c
      WHERE c.category_id = cat.id
        AND c.status IN ('posted', 'featured')
    );
$$;
