import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { Code2 } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">

      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-violet-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[80px]" />
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
            Join the community of<br />
            design engineers.
          </h2>
          <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
            Submit your own components, generate with AI, and help build the largest open-source UI registry.
          </p>
          <div className="flex gap-6 pt-4 text-sm text-muted-foreground">
            <div>
              <div className="text-2xl font-bold text-foreground">500+</div>
              <div>Components</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">1K+</div>
              <div>Engineers</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">Free</div>
              <div>Forever</div>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          © 2026 21st.dev — Open source component registry
        </p>
      </div>

      {/* Right side — sign up form */}
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
            <h1 className="text-2xl font-bold text-foreground mb-1">Create your account</h1>
            <p className="text-muted-foreground text-sm">
              Already have an account?{" "}
              <Link href="/sign-in" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>

          <SignUp
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
            afterSignUpUrl="/components"
            signInUrl="/sign-in"
          />
        </div>
      </div>
    </div>
  );
}
