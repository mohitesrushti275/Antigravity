import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { Code2 } from "lucide-react";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">

      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-[80px]" />
      </div>

      {/* Left side — branding (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-accent/5 border-r border-border/40 p-12 relative z-10">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-xl">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Code2 className="w-5 h-5" />
          </div>
          <span>21st<span className="text-muted-foreground font-normal">.dev</span></span>
        </Link>

        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-foreground leading-tight">
            Welcome back to<br />
            the component foundry.
          </h2>
          <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
            Browse, install, and generate production-ready React components with AI-powered Magic Chat.
          </p>
        </div>

        <p className="text-sm text-muted-foreground">
          © 2026 21st.dev — Open source component registry
        </p>
      </div>

      {/* Right side — sign in form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-xl">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                <Code2 className="w-5 h-5" />
              </div>
              21st.dev
            </Link>
          </div>

          <div className="text-center lg:text-left">
            <h1 className="text-2xl font-bold text-foreground mb-1">Sign in to your account</h1>
            <p className="text-muted-foreground text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/sign-up" className="text-primary hover:underline font-medium">
                Create one
              </Link>
            </p>
          </div>

          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-card border border-border shadow-xl rounded-xl w-full",
                formButtonPrimary: "bg-primary hover:opacity-90 transition-opacity",
                footerAction: "text-muted-foreground",
                formFieldInput: "bg-background border-border text-foreground",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
              },
            }}
            afterSignInUrl="/components"
            signUpUrl="/sign-up"
          />
        </div>
      </div>
    </div>
  );
}
