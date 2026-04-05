import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Database utility module.
 * Provides Prisma-like accessor patterns backed by Supabase.
 * 
 * This is a compatibility layer for pages that use Prisma-style
 * queries (`db.tableName.findFirst`, `db.tableName.findMany`).
 */

interface FindOptions {
  where?: Record<string, unknown>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  include?: Record<string, boolean>;
}

interface DbAccessor {
  findFirst(options?: FindOptions): Promise<Record<string, unknown> | null>;
  findMany(options?: FindOptions): Promise<Record<string, unknown>[]>;
}

function createAccessor(table: string): DbAccessor {
  return {
    async findFirst(options?: FindOptions) {
      let query = supabaseAdmin.from(table).select('*');

      if (options?.where) {
        for (const [key, val] of Object.entries(options.where)) {
          if (typeof val === 'object' && val !== null && 'contains' in (val as Record<string, unknown>)) {
            query = query.ilike(key, `%${(val as Record<string, unknown>).contains}%`);
          } else {
            query = query.eq(key, val);
          }
        }
      }

      const { data } = await query.limit(1).single();
      return data;
    },

    async findMany(options?: FindOptions) {
      let query = supabaseAdmin.from(table).select('*');

      if (options?.where) {
        for (const [key, val] of Object.entries(options.where)) {
          query = query.eq(key, val);
        }
      }

      if (options?.orderBy) {
        for (const [key, dir] of Object.entries(options.orderBy)) {
          query = query.order(key, { ascending: dir === 'asc' });
        }
      }

      const { data } = await query;
      return data ?? [];
    },
  };
}

export const db = {
  componentCategory: createAccessor('categories'),
  adminEntry: createAccessor('components'),
};
