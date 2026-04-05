import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Service for managing component CRUD operations.
 * Uses supabaseAdmin to bypass RLS for admin-level operations.
 */
export const componentCategoryService = {
  /**
   * Soft-delete a component by setting status to 'deleted'.
   * We don't hard-delete to preserve audit trail.
   */
  async remove(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('components')
      .update({ status: 'deleted' })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete component ${id}: ${error.message}`);
    }
  },
};
