// ═══════════════════════════════════════════════════
// SHARED VALIDATION SCHEMAS
// packages/types/src/schemas.ts
// ═══════════════════════════════════════════════════

import { z } from 'zod';

// Component list query parameters
export const ComponentListQuerySchema = z.object({
  category: z.string().optional(),
  status: z.enum(['draft', 'on_review', 'posted', 'featured', 'deleted']).optional(),
  sort: z.enum(['popular', 'newest', 'trending']).optional().default('newest'),
  q: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// Create component request body
export const CreateComponentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  categoryId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  npmDependencies: z.array(z.string()).optional(),
  license: z.string().default('MIT'),
  isPublic: z.boolean().default(true),
});

// Update component request body
export const UpdateComponentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  categoryId: z.string().uuid().optional(),
  npmDependencies: z.array(z.string()).optional(),
  license: z.string().optional(),
  isPublic: z.boolean().optional(),
});

// Presign upload request
export const PresignSchema = z.object({
  componentId: z.string().uuid(),
  fileType: z.enum(['component', 'demo', 'css', 'config', 'tailwind']),
  contentType: z.string(),
  sizeBytes: z.number().int().positive(),
  filename: z.string(),
  demoId: z.string().uuid().optional(),
});

// Confirm upload request
export const ConfirmUploadSchema = z.object({
  componentId: z.string().uuid(),
  fileKeys: z.array(z.object({
    r2Key: z.string(),
    fileType: z.enum(['component', 'demo', 'css', 'config', 'tailwind']),
    demoId: z.string().uuid().optional(),
  })),
});

// Search query parameters
export const SearchQuerySchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

// AI generation request
export const GenerateSchema = z.object({
  prompt: z.string().min(1).max(2000),
  currentFile: z.string().optional(),
  projectDeps: z.array(z.string()),
  framework: z.enum(['next', 'vite', 'remix']),
  tailwindConfig: z.string().optional(),
});

// Review action request
export const ReviewSchema = z.object({
  action: z.enum(['approve', 'reject', 'feature', 'unfeature']),
  reason: z.string().optional(),
});
