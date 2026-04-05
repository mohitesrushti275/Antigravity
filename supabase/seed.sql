-- ═══════════════════════════════════════════════════
-- DEVELOPMENT SEED DATA
-- supabase/seed.sql
-- Safe to re-run: uses ON CONFLICT DO NOTHING
-- ═══════════════════════════════════════════════════

-- Tags
INSERT INTO tags (slug, name) VALUES
  ('tailwind-css',    'Tailwind CSS'),
  ('shadcn-ui',       'shadcn/ui'),
  ('framer-motion',   'Framer Motion'),
  ('react',           'React'),
  ('typescript',      'TypeScript'),
  ('responsive',      'Responsive'),
  ('dark-mode',       'Dark Mode'),
  ('accessible',      'Accessible'),
  ('animated',        'Animated'),
  ('minimal',         'Minimal'),
  ('glassmorphism',   'Glassmorphism'),
  ('gradient',        'Gradient')
ON CONFLICT (slug) DO NOTHING;

-- Dev users (Clerk test users)
INSERT INTO users (clerk_id, username, email, role, bio) VALUES
  ('user_dev_001', 'demouser',   'demo@21st.dev',   'user',  'Demo user for development'),
  ('user_dev_002', 'adminuser',  'admin@21st.dev',  'admin', 'Admin user for development')
ON CONFLICT (clerk_id) DO NOTHING;

-- Sample components (using categories from migration 001)
WITH dev_user AS (SELECT id FROM users WHERE clerk_id = 'user_dev_001' LIMIT 1),
     btn_cat  AS (SELECT id FROM categories WHERE slug = 'button' LIMIT 1),
     card_cat AS (SELECT id FROM categories WHERE slug = 'card' LIMIT 1),
     input_cat AS (SELECT id FROM categories WHERE slug = 'input' LIMIT 1)
INSERT INTO components (user_id, name, slug, description, status, category_id, npm_dependencies, license, download_count, like_count, published_at) VALUES
  (
    (SELECT id FROM dev_user),
    'Shimmer Button',
    'shimmer-button',
    'A beautifully animated button with a shimmer effect on hover, built with Tailwind CSS and Framer Motion.',
    'featured',
    (SELECT id FROM btn_cat),
    '["framer-motion", "clsx"]'::jsonb,
    'MIT',
    1247,
    89,
    NOW()
  ),
  (
    (SELECT id FROM dev_user),
    'Glassmorphism Card',
    'glassmorphism-card',
    'A modern glassmorphism card component with frosted glass effect, responsive design, and dark mode support.',
    'posted',
    (SELECT id FROM card_cat),
    '["clsx"]'::jsonb,
    'MIT',
    834,
    56,
    NOW()
  ),
  (
    (SELECT id FROM dev_user),
    'Gradient Border Input',
    'gradient-border-input',
    'An input component with an animated gradient border that responds to focus state.',
    'posted',
    (SELECT id FROM input_cat),
    '["clsx", "tailwind-merge"]'::jsonb,
    'MIT',
    623,
    42,
    NOW()
  ),
  (
    (SELECT id FROM dev_user),
    'Spotlight Card',
    'spotlight-card',
    'A card component that follows the cursor with a spotlight effect, perfect for feature showcases.',
    'on_review',
    (SELECT id FROM card_cat),
    '["framer-motion"]'::jsonb,
    'MIT',
    0,
    0,
    NULL
  )
ON CONFLICT DO NOTHING;

-- Update category counts
UPDATE categories c SET component_count = (
  SELECT COUNT(*) FROM components comp
  WHERE comp.category_id = c.id
  AND comp.status IN ('posted', 'featured')
);
