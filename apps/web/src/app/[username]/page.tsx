import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Download, Heart, Code2, Globe } from "lucide-react";

// ═══════════════════════════════════════════════════
// USER PROFILE PAGE — /[username]
// ═══════════════════════════════════════════════════

// Force dynamic rendering (no static generation at build time)
export const dynamic = 'force-dynamic';
// ISR: revalidate every 5 minutes
export const revalidate = 300;

interface ProfileComponent {
  id: string;
  name: string;
  slug: string;
  description: string;
  download_count: number;
  like_count: number;
  status: string;
  published_at: string;
  categories: { slug: string; name: string } | null;
}

async function getProfile(username: string) {
  const { data: user } = await supabaseAdmin
    .from("users")
    .select("id, username, avatar_url, bio, github_url, twitter_url, website_url, created_at")
    .eq("username", username)
    .single();

  if (!user) return null;

  const { data: components } = await supabaseAdmin
    .from("components")
    .select("id, name, slug, description, download_count, like_count, status, published_at, categories(slug, name)")
    .eq("user_id", user.id)
    .in("status", ["posted", "featured"])
    .order("download_count", { ascending: false });

  return { ...user, components: (components ?? []) as unknown as ProfileComponent[] };
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) return { title: "Not Found" };
  return {
    title: `@${profile.username} — 21st.dev`,
    description: profile.bio || `Components by @${profile.username}`,
  };
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await getProfile(username);
  if (!profile) notFound();

  const totalDownloads = profile.components.reduce((s, c) => s + c.download_count, 0);
  const totalLikes = profile.components.reduce((s, c) => s + c.like_count, 0);

  return (
    <div className="max-w-4xl mx-auto p-8 pb-20">
      {/* Profile header */}
      <div className="flex items-start gap-6 border-b border-border pb-8 mb-8">
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt={username} width={80} height={80} className="w-20 h-20 rounded-full border-2 border-border" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-accent border-2 border-border flex items-center justify-center text-2xl font-bold text-foreground">
            {username[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">@{profile.username}</h1>
          {profile.bio && <p className="text-muted-foreground mt-1">{profile.bio}</p>}
          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Code2 className="w-4 h-4" />{profile.components.length} components</span>
            <span className="flex items-center gap-1"><Download className="w-4 h-4" />{totalDownloads.toLocaleString()} installs</span>
            <span className="flex items-center gap-1"><Heart className="w-4 h-4" />{totalLikes.toLocaleString()} likes</span>
          </div>
          <div className="flex items-center gap-3 mt-3">
            {profile.github_url && (
              <a href={profile.github_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Code2 className="w-5 h-5" />
              </a>
            )}
            {profile.twitter_url && (
              <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Globe className="w-5 h-5" />
              </a>
            )}
            {profile.website_url && (
              <a href={profile.website_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                <Globe className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Components grid */}
      <h2 className="text-lg font-semibold mb-4 text-foreground">Published Components</h2>
      {profile.components.length === 0 ? (
        <p className="text-muted-foreground text-center py-12 border border-dashed border-border rounded-xl">
          No published components yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profile.components.map((c) => (
            <Link
              key={c.id}
              href={`/${username}/${c.slug}`}
              className="group border border-border bg-card rounded-xl p-5 hover:border-primary/50 transition-colors"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">{c.name}</h3>
                {c.status === "featured" && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">★</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{c.description}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Download className="w-3 h-3" />{c.download_count}</span>
                <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{c.like_count}</span>
                {c.categories && <span className="text-blue-400">{c.categories.name}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center mt-8">
        Member since {new Date(profile.created_at).toLocaleDateString()}
      </p>
    </div>
  );
}
