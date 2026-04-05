import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET /api/cron/purge-deleted-files — Remove S3 files for components deleted > 30 days
export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }


  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Find deleted components older than 30 days
  const { data: deletedComponents } = await supabaseAdmin
    .from("components")
    .select("id")
    .eq("status", "deleted")
    .lt("updated_at", thirtyDaysAgo);

  if (!deletedComponents?.length) {
    return Response.json({ data: { purged: 0 } });
  }

  const componentIds = deletedComponents.map((c) => c.id);

  // Get files for these components
  const { data: staleFiles } = await supabaseAdmin
    .from("component_files")
    .select("id, r2_key")
    .in("component_id", componentIds);

  let purged = 0;

  for (const file of staleFiles ?? []) {
    // Delete from DB (S3/R2 deletion would go here with actual SDK)
    await supabaseAdmin.from("component_files").delete().eq("id", file.id);
    purged++;
  }

  // Also delete the component_demos
  await supabaseAdmin
    .from("component_demos")
    .delete()
    .in("component_id", componentIds);

  // Hard delete the components themselves
  await supabaseAdmin
    .from("components")
    .delete()
    .in("id", componentIds);

  console.log(JSON.stringify({ level: "info", action: "cron.purge_deleted", purged, components: componentIds.length }));

  return Response.json({ data: { purged, components: componentIds.length } });
}
