-- ══════════════════════════════════════════════════
-- 21st.dev — Database Triggers
-- Migration 004: auto-timestamps, count sync
-- ══════════════════════════════════════════════════

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_components_updated_at
  BEFORE UPDATE ON components
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Sync like_count on likes table changes
CREATE OR REPLACE FUNCTION sync_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE components SET like_count = like_count + 1 WHERE id = NEW.component_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE components SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.component_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_like_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION sync_like_count();

-- Sync category component_count on component status changes
CREATE OR REPLACE FUNCTION sync_category_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrement old category if status changed away from public
  IF TG_OP = 'UPDATE' AND OLD.category_id IS NOT NULL THEN
    IF OLD.status IN ('posted', 'featured') AND NEW.status NOT IN ('posted', 'featured') THEN
      UPDATE categories SET component_count = GREATEST(component_count - 1, 0)
      WHERE id = OLD.category_id;
    END IF;
  END IF;

  -- Increment new category if status changed to public
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.category_id IS NOT NULL AND NEW.status IN ('posted', 'featured') THEN
      IF TG_OP = 'INSERT' OR OLD.status NOT IN ('posted', 'featured') THEN
        UPDATE categories SET component_count = component_count + 1
        WHERE id = NEW.category_id;
      END IF;
    END IF;
  END IF;

  -- Handle deletion
  IF TG_OP = 'DELETE' AND OLD.category_id IS NOT NULL AND OLD.status IN ('posted', 'featured') THEN
    UPDATE categories SET component_count = GREATEST(component_count - 1, 0)
    WHERE id = OLD.category_id;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_category_count
  AFTER INSERT OR UPDATE OR DELETE ON components
  FOR EACH ROW EXECUTE FUNCTION sync_category_count();
