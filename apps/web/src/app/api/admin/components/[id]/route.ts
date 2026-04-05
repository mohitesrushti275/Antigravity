import { NextResponse } from 'next/server'
import { ensureAdmin } from '@/lib/auth/admin'
import { componentCategoryService } from '@/server/services/component-category.service'

type Context = {
  params: Promise<{ id: string }>
}

export async function DELETE(_: Request, context: Context) {
  try {
    await ensureAdmin()
    const { id } = await context.params
    await componentCategoryService.remove(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete component error:', error)
    return NextResponse.json({ error: 'Failed to delete component' }, { status: 500 })
  }
}
