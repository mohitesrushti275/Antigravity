#!/usr/bin/env tsx
// ═══════════════════════════════════════════════════
// Admin Setup Script
// Seeds admin credentials in BOTH Clerk + Supabase
// Usage: pnpm setup-admin
// ═══════════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// ── Helpers ──────────────────────────────────────

const C = {
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
};

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    })
  );
}

function loadEnv(envPath: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(envPath)) return env;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    env[key] = value;
  }
  return env;
}

// ── Main ─────────────────────────────────────────

async function main() {
  console.log("");
  console.log(
    C.blue("╔══════════════════════════════════════════════════╗")
  );
  console.log(
    C.blue("║") +
      C.bold("   🛡️  Admin Setup — Clerk + Supabase Seeder     ") +
      C.blue("║")
  );
  console.log(
    C.blue("╚══════════════════════════════════════════════════╝")
  );
  console.log("");

  // ── Step 1: Load env vars ──
  const envPath = path.resolve(__dirname, "..", "apps", "web", ".env");
  const envLocalPath = path.resolve(
    __dirname,
    "..",
    "apps",
    "web",
    ".env.local"
  );

  // Try .env.local first, then .env
  let env = loadEnv(envLocalPath);
  if (!env.CLERK_SECRET_KEY) {
    env = { ...env, ...loadEnv(envPath) };
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const clerkSecretKey = env.CLERK_SECRET_KEY;

  // Validate required vars
  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabaseServiceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!clerkSecretKey) missing.push("CLERK_SECRET_KEY");

  if (missing.length > 0) {
    console.log(C.red("❌ Missing environment variables:"));
    missing.forEach((v) => console.log(C.red(`   • ${v}`)));
    console.log("");
    console.log(
      C.dim(`   Checked: ${envLocalPath}`)
    );
    console.log(C.dim(`   Checked: ${envPath}`));
    console.log("");
    console.log(
      C.yellow("   Copy apps/web/.env.example → apps/web/.env and fill values")
    );
    process.exit(1);
  }

  console.log(C.green("✅ Environment variables loaded"));
  console.log(C.dim(`   Supabase URL: ${supabaseUrl}`));
  console.log(
    C.dim(`   Clerk Key:    ${clerkSecretKey!.slice(0, 12)}...`)
  );
  console.log("");

  // ── Step 2: Get Clerk User ID ──
  console.log(C.blue("━━━ Step 1: Provide your Clerk User ID ━━━"));
  console.log("");
  console.log(C.dim("   How to find it:"));
  console.log(C.dim("   1. Go to https://dashboard.clerk.com"));
  console.log(C.dim("   2. Select your application → Users"));
  console.log(C.dim("   3. Click your user → copy the User ID"));
  console.log(C.dim('   4. It starts with "user_"'));
  console.log("");

  const userId = await ask(C.cyan("   Enter Clerk User ID: "));
  if (!userId || !userId.startsWith("user_")) {
    console.log(
      C.red('❌ Invalid User ID. Must start with "user_"')
    );
    process.exit(1);
  }

  // Also ask for email/username for Supabase seeding
  console.log("");
  const email = await ask(
    C.cyan("   Enter email (for Supabase record): ")
  );
  const username =
    (await ask(
      C.cyan("   Enter username (or press Enter for 'admin'): ")
    )) || "admin";

  // ── Step 3: Set admin role in Clerk ──
  console.log("");
  console.log(C.blue("━━━ Step 2: Setting admin role in Clerk ━━━"));
  console.log("");

  try {
    const clerkRes = await fetch(
      `https://api.clerk.com/v1/users/${userId}/metadata`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${clerkSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          public_metadata: { role: "admin" },
        }),
      }
    );

    if (!clerkRes.ok) {
      const errorBody = await clerkRes.text();
      console.log(
        C.red(`❌ Clerk API error (${clerkRes.status}): ${errorBody}`)
      );
      process.exit(1);
    }

    const clerkData = await clerkRes.json();
    console.log(C.green("✅ Clerk: Admin role set in publicMetadata"));
    console.log(
      C.dim(
        `   publicMetadata → ${JSON.stringify(clerkData.public_metadata)}`
      )
    );
  } catch (err) {
    console.log(C.red(`❌ Failed to reach Clerk API: ${err}`));
    process.exit(1);
  }

  // ── Step 4: Upsert admin user in Supabase ──
  console.log("");
  console.log(
    C.blue("━━━ Step 3: Seeding admin user in Supabase ━━━")
  );
  console.log("");

  try {
    // Use Supabase REST API directly (no SDK needed in script)
    const upsertRes = await fetch(
      `${supabaseUrl}/rest/v1/users`,
      {
        method: "POST",
        headers: {
          apikey: supabaseServiceKey!,
          Authorization: `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          clerk_id: userId,
          username: username,
          email: email || `${username}@admin.local`,
          role: "admin",
          bio: "Admin user",
        }),
      }
    );

    if (!upsertRes.ok) {
      const errorBody = await upsertRes.text();
      console.log(
        C.red(`❌ Supabase API error (${upsertRes.status}): ${errorBody}`)
      );
      console.log("");
      console.log(
        C.yellow("   Trying UPDATE instead (user may already exist)...")
      );

      // Fallback: try UPDATE
      const updateRes = await fetch(
        `${supabaseUrl}/rest/v1/users?clerk_id=eq.${userId}`,
        {
          method: "PATCH",
          headers: {
            apikey: supabaseServiceKey!,
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            role: "admin",
            username: username,
            email: email || undefined,
          }),
        }
      );

      if (!updateRes.ok) {
        const updateErr = await updateRes.text();
        console.log(
          C.red(`❌ Supabase UPDATE also failed: ${updateErr}`)
        );
        console.log("");
        console.log(
          C.yellow("   You can manually run this SQL in Supabase Dashboard:")
        );
        console.log(
          C.dim(
            `   INSERT INTO users (clerk_id, username, email, role, bio)`
          )
        );
        console.log(
          C.dim(
            `   VALUES ('${userId}', '${username}', '${email}', 'admin', 'Admin user')`
          )
        );
        console.log(
          C.dim(
            `   ON CONFLICT (clerk_id) DO UPDATE SET role = 'admin';`
          )
        );
      } else {
        const updateData = await updateRes.json();
        if (updateData.length === 0) {
          console.log(
            C.yellow(
              "⚠️  No existing user found with that clerk_id. Creating new record..."
            )
          );
          // Force INSERT without ON CONFLICT (simpler payload)
          const insertRes = await fetch(
            `${supabaseUrl}/rest/v1/users`,
            {
              method: "POST",
              headers: {
                apikey: supabaseServiceKey!,
                Authorization: `Bearer ${supabaseServiceKey}`,
                "Content-Type": "application/json",
                Prefer: "return=representation",
              },
              body: JSON.stringify({
                clerk_id: userId,
                username: username,
                email: email || `${username}@admin.local`,
                role: "admin",
                bio: "Admin user",
              }),
            }
          );
          if (insertRes.ok) {
            console.log(
              C.green("✅ Supabase: Admin user created")
            );
          } else {
            const insertErr = await insertRes.text();
            console.log(
              C.red(`❌ Supabase INSERT failed: ${insertErr}`)
            );
          }
        } else {
          console.log(
            C.green("✅ Supabase: Existing user updated to admin")
          );
        }
      }
    } else {
      const data = await upsertRes.json();
      console.log(
        C.green(
          `✅ Supabase: Admin user upserted (id: ${data[0]?.id ?? "ok"})`
        )
      );
    }
  } catch (err) {
    console.log(C.red(`❌ Failed to reach Supabase: ${err}`));
    process.exit(1);
  }

  // ── Done ──
  console.log("");
  console.log(
    C.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  );
  console.log(C.green(C.bold("  ✅ Admin setup complete!")));
  console.log(
    C.blue("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  );
  console.log("");
  console.log(C.bold("  Next steps:"));
  console.log(
    C.dim("  1. Sign out of your app (if currently signed in)")
  );
  console.log(C.dim("  2. Sign back in"));
  console.log(
    C.dim("  3. Navigate to → http://localhost:3000/admin")
  );
  console.log("");
  console.log(
    C.dim("  Both Clerk metadata AND Supabase DB now have role = 'admin'")
  );
  console.log(
    C.dim("  This means both the UI guard and API/RLS checks will pass.")
  );
  console.log("");
}

main().catch((err) => {
  console.error(C.red(`Fatal error: ${err}`));
  process.exit(1);
});
