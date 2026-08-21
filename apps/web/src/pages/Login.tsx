import { useState } from "react";
import { supabase } from "@/supabaseClient";
import { useNavigate } from "react-router-dom";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert("Check your email for the confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate("/");
      }
    } catch (err: unknown) {
      setError(errorMessage(err, "Authentication failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setLoading(true);
    setError(null);
    try {
      const redirectUrl =
        import.meta.env.VITE_APP_BASE_URL || window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError(errorMessage(err, "Could not start sign-in. Please try again."));
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell flex items-center justify-center px-4 py-8 font-body sm:px-6">
      <div className="auth-grid pointer-events-none absolute inset-0" />
      <div className="relative z-10 grid w-full max-w-5xl gap-5 lg:grid-cols-[0.84fr_1.16fr]">
        <aside className="hidden min-h-[620px] flex-col justify-between rounded-[1.75rem] border border-primary/20 bg-primary/[0.07] p-8 lg:flex">
          <div>
            <div className="mb-12 flex items-center gap-3">
              <div className="gradient-primary glow-primary flex h-11 w-11 items-center justify-center rounded-2xl">
                <span className="font-heading text-xl font-extrabold">A</span>
              </div>
              <div>
                <p className="font-heading text-base font-extrabold tracking-tight text-foreground">
                  Apply AI
                </p>
                <p className="text-xs text-muted-foreground">
                  Career command center
                </p>
              </div>
            </div>
            <p className="eyebrow mb-4">A calmer way to move forward</p>
            <h2 className="max-w-sm font-heading text-4xl font-extrabold leading-[1.04] tracking-[-0.05em] text-foreground xl:text-5xl">
              Your next opportunity, with less noise.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
              Discover roles, prepare stronger applications, and keep every next
              step in one focused workspace.
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
            <p className="text-sm font-semibold text-foreground">
              Built around your momentum
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Search, organize, and act without losing sight of the work that
              matters.
            </p>
          </div>
        </aside>

        <div className="glass border-shimmer auth-card w-full max-w-md p-6 shadow-2xl sm:p-8 lg:justify-self-end">
          <div className="mb-8 text-center">
            <div className="gradient-primary glow-primary mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl lg:hidden">
              <span className="font-heading text-xl font-extrabold">A</span>
            </div>
            <p className="eyebrow mb-3">
              {isSignUp ? "Start here" : "Welcome back"}
            </p>
            <h1 className="mb-2 font-heading text-3xl font-extrabold tracking-[-0.04em] text-gradient">
              Apply AI
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {isSignUp
                ? "Create your workspace and make your search more intentional."
                : "Sign in to manage your career workspace."}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          )}

          <div className="mb-6 space-y-3">
            <button
              type="button"
              onClick={() => void handleOAuth("github")}
              disabled={loading}
              className="auth-provider flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-3"
            >
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
              Continue with GitHub
            </button>

            <button
              type="button"
              onClick={() => void handleOAuth("google")}
              disabled={loading}
              className="auth-provider flex w-full items-center justify-center gap-3 rounded-xl border px-4 py-3"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                Email
              </label>
              <input
                type="email"
                required
                className="auth-input w-full rounded-xl border p-3 text-foreground outline-none"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-foreground">
                Password
              </label>
              <input
                type="password"
                required
                className="auth-input w-full rounded-xl border p-3 text-foreground outline-none"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="primary-action mt-4 flex w-full items-center justify-center px-4 py-3"
            >
              {loading
                ? "Processing..."
                : isSignUp
                  ? "Create Account"
                  : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="rounded-md px-1 font-semibold text-primary hover:bg-primary/10 hover:underline"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
