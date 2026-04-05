-- ══════════════════════════════════════════════════
-- Migration 003: Admin Design Entries
-- Design showcase entries managed by admins
-- that are displayed to users on the frontend.
-- ══════════════════════════════════════════════════

CREATE TABLE design_entries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID        NOT NULL REFERENCES categories (id) ON DELETE CASCADE,
  title           TEXT        NOT NULL,
  image_url       TEXT        NOT NULL DEFAULT '',
  image_key       TEXT,                                -- R2 storage key for uploaded image
  prompt          TEXT        NOT NULL DEFAULT '',      -- AI prompt / description
  code            TEXT        NOT NULL DEFAULT '',      -- Source code for the design
  display_order   INT         NOT NULL DEFAULT 0,
  is_published    BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_design_entries_category ON design_entries (category_id);
CREATE INDEX idx_design_entries_published ON design_entries (is_published, display_order);
