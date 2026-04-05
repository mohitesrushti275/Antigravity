import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET /api/cron/reset-monthly-counts — Reset API key counters on 1st of month
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }


  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const { count } = await supabaseAdmin
    .from("api_keys")
    .update({
      monthly_count: 0,
      month_reset_at: nextMonth.toISOString(),
    }, { count: "exact" })
    .lt("month_reset_at", now.toISOString());

  console.log(JSON.stringify({ level: "info", action: "cron.reset_monthly_counts", reset: count }));

  return Response.json({ data: { reset: count ?? 0 } });
}
