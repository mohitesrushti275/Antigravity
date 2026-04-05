-- ══════════════════════════════════════════════════
-- 21st.dev — Initial Database Schema
-- Migration 001: tables, indexes, extensions
-- ══════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ══════════════════════════════════════════════════
-- USERS
-- ══════════════════════════════════════════════════
CREATE TABLE users (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id     TEXT        NOT NULL UNIQUE,
  username     TEXT        NOT NULL UNIQUE,
  email        TEXT        NOT NULL,
  role         TEXT        NOT NULL DEFAULT 'user'
                           CHECK (role IN ('user', 'admin')),
  avatar_url   TEXT,
  bio          TEXT        DEFAULT '',
  github_url   TEXT,
  twitter_url  TEXT,
  website_url  TEXT,
  features     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_clerk_id  ON users (clerk_id);
CREATE INDEX idx_users_username  ON users (username);
CREATE INDEX idx_users_role      ON users (role);

-- ══════════════════════════════════════════════════
-- CATEGORIES
-- ══════════════════════════════════════════════════
CREATE TABLE categories (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  section          TEXT NOT NULL
                   CHECK (section IN ('marketing', 'ui', 'screens', 'themes')),
  display_order    INT  NOT NULL DEFAULT 0,
  component_count  INT  NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true
);

INSERT INTO categories (slug, name, section, display_order) VALUES
  ('hero',              'Heroes',            'marketing', 1),
  ('features',          'Features',          'marketing', 2),
  ('call-to-action',    'Calls to Action',   'marketing', 3),
  ('pricing-section',   'Pricing Sections',  'marketing', 4),
  ('testimonials',      'Testimonials',      'marketing', 5),
  ('navbar-navigation', 'Navigation Menus',  'marketing', 6),
  ('footer',            'Footers',           'marketing', 7),
  ('button',            'Buttons',           'ui',        1),
  ('card',              'Cards',             'ui',        2),
  ('input',             'Inputs',            'ui',        3),
  ('modal-dialog',      'Dialogs / Modals',  'ui',        4),
  ('table',             'Tables',            'ui',        5),
  ('ai-chat',           'AI Chats',          'ui',        6);

-- ══════════════════════════════════════════════════
-- COMPONENTS
-- ══════════════════════════════════════════════════
CREATE TABLE components (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category_id           UUID        REFERENCES categories (id) ON DELETE SET NULL,
  slug                  TEXT        NOT NULL,
  name                  TEXT        NOT NULL,
  description           TEXT        NOT NULL DEFAULT '',
  description_embedding VECTOR(1536),
  status                TEXT        NOT NULL DEFAULT 'draft'
                        CHECK (status IN (
                          'draft', 'on_review', 'posted', 'featured', 'rejected', 'deleted'
                        )),
  rejection_reason      TEXT,
  download_count        INT         NOT NULL DEFAULT 0,
  like_count            INT         NOT NULL DEFAULT 0,
  npm_dependencies      JSONB       NOT NULL DEFAULT '[]',
  license               TEXT        NOT NULL DEFAULT 'MIT',
  is_public             BOOLEAN     NOT NULL DEFAULT true,
  registry_version      INT         NOT NULL DEFAULT 1,
  published_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, slug)
);

CREATE INDEX idx_components_status     ON components (status);
CREATE INDEX idx_components_user_id    ON components (user_id);
CREATE INDEX idx_components_category   ON components (category_id);
CREATE INDEX idx_components_published  ON components (published_at DESC)
             WHERE status IN ('posted', 'featured');
CREATE INDEX idx_components_popular    ON components (download_count DESC)
             WHERE status IN ('posted', 'featured');
CREATE INDEX idx_components_fts ON components
  USING gin (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));
CREATE INDEX idx_components_embedding ON components
  USING ivfflat (description_embedding vector_cosine_ops)
  WITH (lists = 100);

-- ══════════════════════════════════════════════════
-- COMPONENT DEMOS
-- ══════════════════════════════════════════════════
CREATE TABLE component_demos (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id       UUID    NOT NULL REFERENCES components (id) ON DELETE CASCADE,
  name               TEXT    NOT NULL DEFAULT 'default',
  preview_image_key  TEXT,
  video_key          TEXT,
  display_order      INT     NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_component_demos_component ON component_demos (component_id);

-- ══════════════════════════════════════════════════
-- COMPONENT FILES
-- ══════════════════════════════════════════════════
CREATE TABLE component_files (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id  UUID    NOT NULL REFERENCES components (id) ON DELETE CASCADE,
  demo_id       UUID    REFERENCES component_demos (id) ON DELETE SET NULL,
  file_type     TEXT    NOT NULL
                CHECK (file_type IN ('component', 'demo', 'css', 'config', 'tailwind')),
  r2_key        TEXT    NOT NULL UNIQUE,
  filename      TEXT    NOT NULL,
  size_bytes    INT     NOT NULL DEFAULT 0,
  content_type  TEXT    NOT NULL DEFAULT 'text/plain',
  checksum      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_component_files_component ON component_files (component_id);

-- ══════════════════════════════════════════════════
-- TAGS
-- ══════════════════════════════════════════════════
CREATE TABLE tags (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug  TEXT NOT NULL UNIQUE,
  name  TEXT NOT NULL
);

CREATE TABLE component_tags (
  component_id  UUID NOT NULL REFERENCES components (id) ON DELETE CASCADE,
  tag_id        UUID NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
  PRIMARY KEY (component_id, tag_id)
);

CREATE INDEX idx_component_tags_tag ON component_tags (tag_id);

-- ══════════════════════════════════════════════════
-- LIKES
-- ══════════════════════════════════════════════════
CREATE TABLE likes (
  user_id       UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  component_id  UUID        NOT NULL REFERENCES components (id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, component_id)
);

CREATE INDEX idx_likes_component ON likes (component_id);

-- ══════════════════════════════════════════════════
-- DOWNLOADS
-- ══════════════════════════════════════════════════
CREATE TABLE downloads (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id    UUID        NOT NULL REFERENCES components (id) ON DELETE CASCADE,
  user_id         UUID        REFERENCES users (id) ON DELETE SET NULL,
  ip_hash         TEXT,
  install_method  TEXT        CHECK (install_method IN ('cli', 'copy', 'mcp', 'api')),
  user_agent      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_downloads_component   ON downloads (component_id, created_at DESC);
CREATE INDEX idx_downloads_created_at  ON downloads (created_at DESC);

-- ══════════════════════════════════════════════════
-- API KEYS
-- ══════════════════════════════════════════════════
CREATE TABLE api_keys (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  key_prefix     TEXT        NOT NULL,
  key_hash       TEXT        NOT NULL UNIQUE,
  name           TEXT        NOT NULL DEFAULT 'default',
  scope          TEXT        NOT NULL DEFAULT 'magic'
                 CHECK (scope IN ('magic', 'registry', 'admin')),
  monthly_limit  INT         NOT NULL DEFAULT 50,
  monthly_count  INT         NOT NULL DEFAULT 0,
  month_reset_at TIMESTAMPTZ NOT NULL DEFAULT date_trunc('month', now()) + interval '1 month',
  last_used_at   TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ,
  revoked_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_user    ON api_keys (user_id);
CREATE INDEX idx_api_keys_hash    ON api_keys (key_hash);

-- ══════════════════════════════════════════════════
-- AUDIT LOG
-- ══════════════════════════════════════════════════
CREATE TABLE audit_log (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        REFERENCES users (id) ON DELETE SET NULL,
  action         TEXT        NOT NULL,
  resource_type  TEXT        NOT NULL,
  resource_id    UUID,
  metadata       JSONB       NOT NULL DEFAULT '{}',
  ip_hash        TEXT,
  trace_id       TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_user      ON audit_log (user_id);
CREATE INDEX idx_audit_log_action    ON audit_log (action);
CREATE INDEX idx_audit_log_resource  ON audit_log (resource_type, resource_id);
CREATE INDEX idx_audit_log_created   ON audit_log (created_at DESC);
