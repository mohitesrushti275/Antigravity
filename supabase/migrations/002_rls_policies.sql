-- ══════════════════════════════════════════════════
-- 21st.dev — Row-Level Security Policies
-- Migration 002: RLS on all tables (default-deny)
-- ══════════════════════════════════════════════════

-- ── COMPONENTS ──────────────────────────────────────
ALTER TABLE components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_published"
  ON components FOR SELECT
  USING (status IN ('posted', 'featured') AND is_public = true);

CREATE POLICY "owner_read_own"
  ON components FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "owner_insert"
  ON components FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner_or_admin_update"
  ON components FOR UPDATE
  USING (user_id = auth.uid() OR (auth.jwt() ->> 'role') = 'admin');

CREATE POLICY "owner_or_admin_delete"
  ON components FOR DELETE
  USING (user_id = auth.uid() OR (auth.jwt() ->> 'role') = 'admin');

-- ── COMPONENT_FILES ─────────────────────────────────
ALTER TABLE component_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_files_of_published"
  ON component_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM components c
      WHERE c.id = component_id
        AND c.status IN ('posted', 'featured')
        AND c.is_public = true
    )
  );

CREATE POLICY "owner_or_admin_all_files"
  ON component_files FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM components c
      WHERE c.id = component_id
        AND (c.user_id = auth.uid() OR (auth.jwt() ->> 'role') = 'admin')
    )
  );

-- ── COMPONENT DEMOS ─────────────────────────────────
ALTER TABLE component_demos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_demos_of_published"
  ON component_demos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM components c
      WHERE c.id = component_id
        AND c.status IN ('posted', 'featured')
        AND c.is_public = true
    )
  );

CREATE POLICY "owner_or_admin_all_demos"
  ON component_demos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM components c
      WHERE c.id = component_id
        AND (c.user_id = auth.uid() OR (auth.jwt() ->> 'role') = 'admin')
    )
  );

-- ── LIKES ───────────────────────────────────────
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_likes"
  ON likes FOR SELECT USING (true);

CREATE POLICY "owner_manage_likes"
  ON likes FOR ALL USING (user_id = auth.uid());

-- ── DOWNLOADS ───────────────────────────────────
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_insert_download"
  ON downloads FOR INSERT WITH CHECK (true);

CREATE POLICY "admin_read_downloads"
  ON downloads FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'admin');

-- ── API_KEYS ────────────────────────────────────
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manage_keys"
  ON api_keys FOR ALL USING (user_id = auth.uid());

CREATE POLICY "admin_read_all_keys"
  ON api_keys FOR SELECT
  USING ((auth.jwt() ->> 'role') = 'admin');

-- ── USERS ───────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_users"
  ON users FOR SELECT USING (true);

CREATE POLICY "owner_update_self"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- ── CATEGORIES ──────────────────────────────────
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_categories"
  ON categories FOR SELECT USING (true);

CREATE POLICY "admin_manage_categories"
  ON categories FOR ALL
  USING ((auth.jwt() ->> 'role') = 'admin');

-- ── TAGS ────────────────────────────────────────
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_tags"
  ON tags FOR SELECT USING (true);

ALTER TABLE component_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_component_tags"
  ON component_tags FOR SELECT USING (true);

-- ── AUDIT_LOG ───────────────────────────────────
-- Server-side only via service role (default-deny for all users)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_users"
  ON audit_log FOR ALL USING (false);
