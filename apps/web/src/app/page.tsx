import Link from "next/link";
import { Code2, Sparkles, Layers, Zap, ArrowRight, Shield, Globe2 } from "lucide-react";

// ═══════════════════════════════════════════════════
// LANDING PAGE — / (public, no sidebar)
// Unauthenticated users see this first.
// After sign-in → redirected to /components
// ═══════════════════════════════════════════════════

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">

      {/* ─── Background Effects ─── */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 left-0 w-[300px] h-[300px] bg-violet-500/5 rounded-full blur-[80px]" />
      </div>

      {/* ─── Navbar ─── */}
      <nav className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-xl">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Code2 className="w-5 h-5" />
          </div>
          <span>21st<span className="text-muted-foreground font-normal">.dev</span></span>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="text-sm font-medium bg-primary text-primary-foreground px-5 py-2 rounded-lg hover:opacity-90 transition-opacity"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative z-10 text-center px-6 pt-20 pb-24 md:pt-32 md:pb-32 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-8">
          <Sparkles className="w-4 h-4" />
          AI-powered component generation
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
          Build stunning UIs
          <br />
          <span className="bg-gradient-to-r from-primary via-blue-400 to-violet-400 bg-clip-text text-transparent">
            in minutes, not days.
          </span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          21st.dev is the open-source component registry for design engineers.
          Browse, install with one command, or generate custom components with Magic AI.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-8 py-3.5 rounded-xl text-base hover:opacity-90 transition-all hover:shadow-lg hover:shadow-primary/20"
          >
            Create Free Account
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 bg-accent text-foreground font-semibold px-8 py-3.5 rounded-xl text-base hover:bg-accent/80 transition-colors border border-border"
          >
            Sign In
          </Link>
        </div>

        {/* Install command */}
        <div className="mt-12 inline-flex items-center gap-3 bg-zinc-900/80 border border-zinc-700/50 rounded-xl px-6 py-3 font-mono text-sm text-zinc-300">
          <span className="text-zinc-500">$</span>
          npx shadcn@latest add &quot;{process.env.NEXT_PUBLIC_APP_URL || 'https://21st.dev'}/r/user/component&quot;
        </div>
      </section>

      {/* ─── Feature Grid ─── */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Layers className="w-6 h-6" />}
            title="Component Registry"
            description="Hundreds of production-ready React components. Install any component with a single CLI command via shadcn."
          />
          <FeatureCard
            icon={<Sparkles className="w-6 h-6" />}
            title="Magic AI Generation"
            description="Describe what you need and get a fully coded, styled component in seconds. Powered by Claude with context from our registry."
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            title="One-Click Install"
            description="Every component works with shadcn CLI. Copy one command, paste in your terminal, and it&rsquo;s in your project."
          />
          <FeatureCard
            icon={<Shield className="w-6 h-6" />}
            title="Admin Review Pipeline"
            description="Every submitted component goes through a human review before it&rsquo;s listed. Quality is guaranteed."
          />
          <FeatureCard
            icon={<Code2 className="w-6 h-6" />}
            title="Open Source First"
            description="All components are open source with MIT license. Use them in personal or commercial projects freely."
          />
          <FeatureCard
            icon={<Globe2 className="w-6 h-6" />}
            title="Community Driven"
            description="Built by and for design engineers. Submit your own components and earn recognition in the community."
          />
        </div>
      </section>

      {/* ─── CTA Section ─── */}
      <section className="relative z-10 border-t border-border/40 bg-accent/5">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Ready to ship faster?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join thousands of developers using 21st.dev to build beautiful interfaces.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-8 py-3.5 rounded-xl text-base hover:opacity-90 transition-all"
          >
            Get Started for Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 border-t border-border/40 bg-background px-6 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4" />
            <span>© 2026 21st.dev</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/21st-dev" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              GitHub
            </a>
            <a href="https://twitter.com/21stdev" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              Twitter
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group rounded-2xl border border-border/50 bg-card/50 p-6 hover:border-primary/30 hover:bg-card/80 transition-all duration-300">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
