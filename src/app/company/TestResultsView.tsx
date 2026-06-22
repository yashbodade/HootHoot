"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ChevronLeft, Trophy, Users, Clock, BarChart3,
  AlertTriangle, CheckCircle2, XCircle, TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getTestSessions, getTestAnalytics } from "@/features/company/actions";
import type { CompanyTest, TestSession, TestAnalytics } from "@/types/arena";

interface Props {
  test: CompanyTest;
  onBack: () => void;
}

function formatTime(ms: number | null): string {
  if (!ms) return "—";
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

function ScoreBar({ score, total }: { score: number | null; total: number }) {
  if (score === null) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = Math.round((score / total) * 100);
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full", pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums w-8 text-right">{score}/{total}</span>
    </div>
  );
}

export default function TestResultsView({ test, onBack }: Props) {
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [analytics, setAnalytics] = useState<TestAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getTestSessions(test.id), getTestAnalytics(test.id)]).then(([s, a]) => {
      setSessions(s);
      setAnalytics(a);
      setLoading(false);
    });
  }, [test.id]);

  // Score distribution for bar chart
  const scoreBuckets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => ({
    score,
    count: sessions.filter((s) => s.score === score && s.status === "completed").length,
  }));
  const maxBucket = Math.max(...scoreBuckets.map((b) => b.count), 1);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold font-heading">{test.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {test.total_questions} questions &bull; {test.time_limit_minutes}min &bull; Max {test.max_warnings} warnings
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0",
              test.status === "active" && "border-emerald-500/40 text-emerald-400",
              test.status === "closed" && "border-zinc-500/40 text-zinc-500",
              test.status === "draft" && "border-border text-muted-foreground"
            )}
          >
            {test.status}
          </Badge>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-4 gap-px bg-border rounded-xl overflow-hidden mb-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Analytics summary */}
          {analytics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden mb-6">
              {[
                { icon: Users, label: "Participants", value: analytics.total_participants },
                { icon: CheckCircle2, label: "Completed", value: analytics.completed_count },
                { icon: BarChart3, label: "Avg Score", value: analytics.avg_score != null ? `${Number(analytics.avg_score).toFixed(1)}%` : "—" },
                { icon: TrendingUp, label: "Pass Rate (70%+)", value: analytics.completed_count > 0 ? `${Math.round((Number(analytics.pass_count) / Number(analytics.completed_count)) * 100)}%` : "—" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-card px-5 py-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </div>
                  <p className="text-2xl font-bold font-heading">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Score distribution */}
          {sessions.some((s) => s.status === "completed") && (
            <div className="rounded-xl border border-border bg-card p-5 mb-6">
              <h3 className="text-sm font-semibold font-heading mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                Score Distribution
              </h3>
              <div className="flex items-end gap-1.5 h-24">
                {scoreBuckets.map(({ score, count }) => (
                  <div key={score} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "w-full rounded-t-sm transition-all",
                        count > 0 ? (score >= 7 ? "bg-emerald-500/70" : score >= 4 ? "bg-yellow-500/70" : "bg-red-500/70") : "bg-muted"
                      )}
                      style={{ height: `${(count / maxBucket) * 80}px`, minHeight: count > 0 ? "4px" : "2px" }}
                    />
                    <span className="text-xs text-muted-foreground">{score}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-center">Score (out of {test.total_questions})</p>
            </div>
          )}

          {/* Candidate table */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-muted/50 flex items-center justify-between">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                Candidate Results
              </h3>
              <span className="text-xs text-muted-foreground">{sessions.length} candidate{sessions.length !== 1 ? "s" : ""}</span>
            </div>

            {sessions.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No candidates have joined this test yet.</p>
                {test.status !== "active" && (
                  <p className="text-xs text-muted-foreground mt-1">Activate the test to start accepting submissions.</p>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-12 px-5 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wider bg-muted/30 border-b border-border/50">
                  <div className="col-span-1">Rank</div>
                  <div className="col-span-3">Candidate</div>
                  <div className="col-span-3">Score</div>
                  <div className="col-span-2 text-center">Time</div>
                  <div className="col-span-1 text-center">Warnings</div>
                  <div className="col-span-2 text-center">Status</div>
                </div>

                {sessions.map((session, i) => {
                  const candidate = session as TestSession & { candidate_name?: string; candidate_email?: string };
                  return (
                    <div
                      key={session.id}
                      className="grid grid-cols-12 px-5 py-3.5 border-b border-border/50 last:border-0 items-center hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="col-span-1">
                        <span className="text-xs font-mono text-muted-foreground">
                          {session.status === "completed" ? `#${i + 1}` : "—"}
                        </span>
                      </div>

                      <div className="col-span-3 flex items-center gap-2">
                        <Avatar className="w-7 h-7 shrink-0">
                          <AvatarFallback className="text-xs bg-muted">
                            {candidate.candidate_name?.[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{candidate.candidate_name ?? "Unknown"}</p>
                          <p className="text-xs text-muted-foreground truncate">{candidate.candidate_email ?? ""}</p>
                        </div>
                      </div>

                      <div className="col-span-3 pr-4">
                        <ScoreBar score={session.score} total={test.total_questions} />
                      </div>

                      <div className="col-span-2 text-center">
                        <span className="text-xs text-muted-foreground font-mono">{formatTime(session.time_taken_ms)}</span>
                      </div>

                      <div className="col-span-1 text-center">
                        {session.warnings_count > 0 ? (
                          <span className="inline-flex items-center gap-1 text-xs text-orange-400">
                            <AlertTriangle className="w-3 h-3" />
                            {session.warnings_count}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">0</span>
                        )}
                      </div>

                      <div className="col-span-2 text-center">
                        <StatusBadge status={session.status} />
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: TestSession["status"] }) {
  const config = {
    completed: { icon: CheckCircle2, label: "Done", className: "text-emerald-400" },
    in_progress: { icon: Clock, label: "Active", className: "text-blue-400" },
    disqualified: { icon: XCircle, label: "DQ'd", className: "text-red-400" },
    abandoned: { icon: XCircle, label: "Left", className: "text-zinc-500" },
  }[status];

  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", config.className)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
