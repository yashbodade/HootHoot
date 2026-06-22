"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, KeyRound, Clock, Shield, Camera, Monitor, LogIn, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { joinTestByCode, startTestSession } from "@/features/company/actions";
import type { ArenaUser, CompanyTest } from "@/types/arena";
import Link from "next/link";
import CompanyTestGame from "../CompanyTestGame";
import { toast } from "sonner";

interface Props {
  user: ArenaUser | null;
}

export default function JoinTestClient({ user }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [test, setTest] = useState<CompanyTest | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const { test: foundTest, error } = await joinTestByCode(code.trim());
      if (error || !foundTest) { toast.error(error ?? "Test not found."); return; }
      setTest(foundTest);
    } catch {
      toast.error("Failed to look up the test.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    if (!test || !user) return;
    setLoading(true);
    try {
      const { sessionId: sid, error } = await startTestSession(test.id);
      if (error || !sid) { toast.error(error ?? "Could not start test."); return; }
      setSessionId(sid);
      setStarted(true);
    } catch {
      toast.error("Failed to start session.");
    } finally {
      setLoading(false);
    }
  }

  // ── Taking the test ───────────────────────────────────────────
  if (started && test && sessionId && user) {
    return <CompanyTestGame user={user} test={test} sessionId={sessionId} />;
  }

  // ── Test preview before starting ─────────────────────────────
  if (test) {
    return (
      <div className="min-h-screen bg-background pt-20 pb-16 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="rounded-2xl border border-border bg-card p-8">
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-400 mb-4">Test Found</Badge>
            <h1 className="text-2xl font-bold font-heading mb-2">{test.title}</h1>
            {test.description && <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{test.description}</p>}

            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { icon: Clock, label: "Time Limit", value: `${test.time_limit_minutes} minutes` },
                { icon: KeyRound, label: "Questions", value: `${test.total_questions}` },
                { icon: Shield, label: "Max Warnings", value: test.max_warnings.toString() },
                { icon: Monitor, label: "Fullscreen", value: test.require_fullscreen ? "Required" : "Optional" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-lg bg-muted p-3 flex items-start gap-2.5">
                  <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Proctoring warnings */}
            <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 mb-6 space-y-1.5">
              <p className="text-xs font-semibold text-orange-300 uppercase tracking-wider mb-2">Before you start</p>
              {test.require_fullscreen && (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Monitor className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  You will be required to stay in fullscreen mode.
                </p>
              )}
              {test.require_camera && (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Camera className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  Your camera will be accessed for proctoring.
                </p>
              )}
              {!test.allow_tab_switch && (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  Do not switch tabs or minimize — {test.max_warnings} warnings terminate the test.
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setTest(null)} className="flex-1">Change Code</Button>
              <Button onClick={handleStart} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>Begin Test <ChevronRight className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Join form ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pt-20 pb-16 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <KeyRound className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h1 className="text-2xl font-bold font-heading">Join an Assessment</h1>
          <p className="text-sm text-muted-foreground mt-2">Enter the invite code from your recruiter or HR team.</p>
        </div>

        {!user ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-foreground mb-1">Sign in to take a test</p>
            <p className="text-xs text-muted-foreground mb-4">You need a student account to join assessments.</p>
            <Button asChild>
              <Link href="/arena/auth?role=student&redirect=/company/join">
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6">
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">Invite Code</Label>
                <Input
                  id="code"
                  placeholder="e.g., ABC12XYZ"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="font-mono text-lg tracking-widest text-center"
                  maxLength={12}
                  autoComplete="off"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full h-11" disabled={loading || code.length < 4}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find Test"}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
