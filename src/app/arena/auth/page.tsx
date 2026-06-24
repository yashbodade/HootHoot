"use client";

/**
 * /arena/auth — Sign In / Sign Up page backed by AWS Cognito via Amplify.
 *
 * Flow:
 *  Sign Up  → Cognito creates user → sends verification email → confirmation step
 *  Sign In  → Amplify signIn() → on success, syncTokenCookie() → redirect
 *  Confirm  → Enter the 6-digit code from email → auto sign-in → redirect
 */

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Zap, Building2, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/context/SessionContext";
import { configureAmplify } from "@/lib/cognito-config";
import {
  signIn,
  signUp,
  confirmSignUp,
  signIn as amplifySignIn,
  fetchAuthSession,
  resendSignUpCode,
} from "aws-amplify/auth";

// Ensure Amplify is configured before any auth call
configureAmplify();

type Role = "student" | "company";
type Mode = "signin" | "signup" | "confirm";

async function syncTokenCookie() {
  try {
    const session = await fetchAuthSession();
    const idToken = session.tokens?.idToken?.toString();
    if (!idToken) return;
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
  } catch {
    // Non-fatal
  }
}

export default function ArenaAuthPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { refresh } = useSession();

  const defaultRole = (searchParams.get("role") as Role) || "student";
  const redirect = searchParams.get("redirect") || "/arena";

  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>(defaultRole);
  const [loading, setLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    confirmCode: "",
  });

  const update =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  // ── Sign In ────────────────────────────────────────────────────────────────
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn({
        username: form.email.trim().toLowerCase(),
        password: form.password,
      });

      if (result.isSignedIn) {
        await syncTokenCookie();
        await refresh();
        toast.success("Welcome back!");
        router.push(redirect);
        router.refresh();
      } else if (result.nextStep?.signInStep === "CONFIRM_SIGN_UP") {
        setPendingEmail(form.email.trim().toLowerCase());
        setMode("confirm");
        toast.info("Please verify your email first.");
      } else {
        toast.error("Sign-in incomplete. Please try again.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign-in failed";
      if (message.includes("User does not exist") || message.includes("Incorrect username")) {
        toast.error("Invalid email or password.");
      } else if (message.includes("not confirmed")) {
        setPendingEmail(form.email.trim().toLowerCase());
        setMode("confirm");
        toast.info("Please verify your email to continue.");
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Sign Up ────────────────────────────────────────────────────────────────
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const result = await signUp({
        username: form.email.trim().toLowerCase(),
        password: form.password,
        options: {
          userAttributes: {
            email: form.email.trim().toLowerCase(),
            name: form.name.trim() || form.email.split("@")[0],
            // Store role as a custom attribute
            "custom:role": role,
          },
        },
      });

      if (result.nextStep?.signUpStep === "CONFIRM_SIGN_UP") {
        setPendingEmail(form.email.trim().toLowerCase());
        setMode("confirm");
        toast.success("Account created! Check your email for a verification code.");
      } else if (result.isSignUpComplete) {
        // Auto-confirmed (e.g. Cognito auto-verify is enabled)
        await syncTokenCookie();
        await refresh();
        toast.success("Account created! Welcome to Hoot-Hoot.");
        router.push(redirect);
        router.refresh();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign-up failed";
      if (message.includes("already exists") || message.includes("UsernameExistsException")) {
        toast.error("An account with this email already exists. Try signing in.");
        setMode("signin");
      } else if (message.includes("Password did not conform")) {
        toast.error("Password must be at least 8 characters and include a number.");
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }

  // ── Confirm Sign Up ────────────────────────────────────────────────────────
  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await confirmSignUp({
        username: pendingEmail || form.email.trim().toLowerCase(),
        confirmationCode: form.confirmCode.trim(),
      });

      if (result.isSignUpComplete) {
        // Auto sign-in after confirmation
        const signInResult = await amplifySignIn({
          username: pendingEmail || form.email.trim().toLowerCase(),
          password: form.password,
        });

        if (signInResult.isSignedIn) {
          await syncTokenCookie();
          await refresh();
          toast.success("Email verified! Welcome to Hoot-Hoot.");
          router.push(redirect);
          router.refresh();
        } else {
          toast.success("Email verified! Please sign in.");
          setMode("signin");
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed";
      if (message.includes("Invalid verification code") || message.includes("CodeMismatchException")) {
        toast.error("Incorrect code. Please check your email and try again.");
      } else if (message.includes("ExpiredCodeException")) {
        toast.error("Code expired. We&apos;ve sent a new one.");
        await resendSignUpCode({ username: pendingEmail });
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      await resendSignUpCode({ username: pendingEmail || form.email.trim().toLowerCase() });
      toast.success("Verification code resent to your email.");
    } catch {
      toast.error("Could not resend code. Please try again.");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6 group">
            <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
              &larr; Back to Hoot-Hoot
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground font-heading">
            {mode === "confirm"
              ? "Verify Your Email"
              : mode === "signin"
              ? "Sign in to"
              : "Create your"}{" "}
            {mode !== "confirm" && (
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
                {role === "company" ? "Company Portal" : "Practice Arena"}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {mode === "confirm"
              ? `Enter the 6-digit code sent to ${pendingEmail || form.email}`
              : mode === "signin"
              ? "Access your competitive arena account"
              : "Join the competitive practice platform"}
          </p>
        </div>

        {/* Role Selector (not shown on confirm step) */}
        {mode !== "confirm" && (
          <div className="flex rounded-lg border border-border overflow-hidden mb-6">
            <button
              type="button"
              onClick={() => setRole("student")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                role === "student"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Zap className="w-4 h-4" />
              Student / Player
            </button>
            <button
              type="button"
              onClick={() => setRole("company")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
                role === "company"
                  ? "bg-primary text-primary-foreground"
                  : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              <Building2 className="w-4 h-4" />
              Company / HR
            </button>
          </div>
        )}

        {/* Form Card */}
        <div className="rounded-xl border border-border bg-card p-6">
          {/* Sign In / Sign Up tab switcher */}
          {mode !== "confirm" && (
            <div className="flex gap-1 mb-6 bg-muted rounded-lg p-1">
              {(["signin", "signup"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                    mode === m
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {m === "signin" ? "Sign In" : "Sign Up"}
                </button>
              ))}
            </div>
          )}

          {/* Confirm step */}
          {mode === "confirm" && (
            <form onSubmit={handleConfirm} className="space-y-4">
              <div className="flex justify-center mb-2">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Mail className="w-6 h-6 text-purple-400" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmCode">Verification Code</Label>
                <Input
                  id="confirmCode"
                  placeholder="123456"
                  value={form.confirmCode}
                  onChange={update("confirmCode")}
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  inputMode="numeric"
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify Email"}
              </Button>
              <button
                type="button"
                onClick={handleResend}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Didn&apos;t receive a code? Resend
              </button>
            </form>
          )}

          {/* Sign In form */}
          {mode === "signin" && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={update("email")}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your password"
                  value={form.password}
                  onChange={update("password")}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
              </Button>
            </form>
          )}

          {/* Sign Up form */}
          {mode === "signup" && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={update("name")}
                  required
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={update("email")}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 8 characters"
                  value={form.password}
                  onChange={update("password")}
                  required
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Account"}
              </Button>
            </form>
          )}
        </div>

        {mode !== "confirm" && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-foreground underline underline-offset-4 hover:text-primary"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
