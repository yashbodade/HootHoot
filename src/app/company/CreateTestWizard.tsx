"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft, ChevronRight, Check, Plus, Minus,
  Shield, Camera, Monitor, AlertTriangle, Clock, FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createCompanyTest } from "@/features/company/actions";
import type { QuestionConfig } from "@/types/arena";
import { toast } from "sonner";

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

type Step = 1 | 2 | 3 | 4 | 5;

const GAME_OPTIONS = [
  { slug: "switch-challenge", label: "Switch Challenge", desc: "Operator pattern recognition" },
  { slug: "deductive-challenge", label: "Deductive Challenge", desc: "Grid pattern completion" },
  { slug: "sequence", label: "Sequence & Logic", desc: "Numerical and verbal reasoning" },
];

const DIFFICULTY_LABELS: Record<number | "mixed", string> = {
  1: "Easy", 2: "Medium-Easy", 3: "Medium", 4: "Medium-Hard", 5: "Hard", mixed: "Mixed",
};

const STEP_LABELS: Record<Step, string> = {
  1: "Test Details",
  2: "Questions",
  3: "Proctoring",
  4: "Schedule",
  5: "Review",
};

export default function CreateTestWizard({ onSuccess, onCancel }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Details
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);

  // Step 2: Questions
  const [questionConfig, setQuestionConfig] = useState<QuestionConfig[]>([
    { game_slug: "switch-challenge", count: 5, difficulty: "mixed" },
    { game_slug: "sequence", count: 5, difficulty: "mixed" },
  ]);

  // Step 3: Proctoring
  const [requireFullscreen, setRequireFullscreen] = useState(true);
  const [requireCamera, setRequireCamera] = useState(false);
  const [maxWarnings, setMaxWarnings] = useState(3);
  const [allowTabSwitch, setAllowTabSwitch] = useState(false);

  // Step 4: Schedule
  const [maxParticipants, setMaxParticipants] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const totalQuestions = questionConfig.reduce((s, q) => s + q.count, 0);
  const canProceed = step === 1 ? title.trim().length >= 3 : step === 2 ? totalQuestions >= 1 && totalQuestions <= 30 : true;

  function updateConfig(index: number, updates: Partial<QuestionConfig>) {
    setQuestionConfig((prev) => prev.map((q, i) => i === index ? { ...q, ...updates } : q));
  }

  function addGameType() {
    const unused = GAME_OPTIONS.find((g) => !questionConfig.some((q) => q.game_slug === g.slug));
    if (unused) {
      setQuestionConfig((prev) => [...prev, { game_slug: unused.slug as QuestionConfig["game_slug"], count: 5, difficulty: "mixed" }]);
    }
  }

  function removeConfig(index: number) {
    setQuestionConfig((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      const { test, error } = await createCompanyTest({
        title: title.trim(),
        description: description.trim() || undefined,
        questionConfig,
        totalQuestions,
        timeLimitMinutes,
        requireFullscreen,
        requireCamera,
        maxWarnings,
        allowTabSwitch,
        maxParticipants: maxParticipants ? Number(maxParticipants) : undefined,
        startsAt: startsAt || undefined,
        endsAt: endsAt || undefined,
      });

      if (error || !test) { toast.error(error ?? "Failed to create test."); return; }
      toast.success("Test created successfully!");
      onSuccess();
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <button onClick={onCancel} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold font-heading">Create Assessment Test</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your test in {Object.keys(STEP_LABELS).length} simple steps</p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-1 mb-8">
        {(Object.keys(STEP_LABELS) as unknown as Step[]).map((s, i) => {
          const stepNum = Number(s) as Step;
          const isDone = stepNum < step;
          const isActive = stepNum === step;
          return (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0",
                  isDone ? "bg-emerald-500 text-white" : isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : stepNum}
              </div>
              <span className={cn("text-xs hidden sm:block truncate", isActive ? "text-foreground" : "text-muted-foreground")}>
                {STEP_LABELS[stepNum]}
              </span>
              {i < 4 && <div className={cn("h-px flex-1 mx-1 transition-colors", stepNum < step ? "bg-emerald-500/40" : "bg-border")} />}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="rounded-xl border border-border bg-card p-6 mb-6">

        {/* Step 1: Details */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Test Details
              </h2>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Test Title <span className="text-red-400">*</span></Label>
              <Input id="title" placeholder="e.g., Frontend Engineer Assessment — Q1 2025" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="desc">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="desc" placeholder="Brief instructions or context for candidates" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="time" className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                Time Limit (minutes)
              </Label>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="sm" onClick={() => setTimeLimitMinutes((t) => Math.max(5, t - 5))}>
                  <Minus className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xl font-bold w-16 text-center tabular-nums">{timeLimitMinutes}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setTimeLimitMinutes((t) => Math.min(180, t + 5))}>
                  <Plus className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground">min (5–180)</span>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Questions */}
        {step === 2 && (
          <div>
            <h2 className="text-base font-semibold mb-1 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              Question Configuration
            </h2>
            <p className="text-xs text-muted-foreground mb-5">
              Select game types and question counts. Max 30 questions total.
            </p>

            <div className="space-y-3 mb-4">
              {questionConfig.map((config, index) => {
                const game = GAME_OPTIONS.find((g) => g.slug === config.game_slug);
                return (
                  <div key={index} className="rounded-lg border border-border p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-medium">{game?.label ?? config.game_slug}</p>
                        <p className="text-xs text-muted-foreground">{game?.desc}</p>
                      </div>
                      {questionConfig.length > 1 && (
                        <button onClick={() => removeConfig(index)} className="text-muted-foreground hover:text-red-400 transition-colors">
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Count */}
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => updateConfig(index, { count: Math.max(1, config.count - 1) })}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-bold w-6 text-center tabular-nums">{config.count}</span>
                        <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => updateConfig(index, { count: Math.min(30 - (totalQuestions - config.count), config.count + 1) })}>
                          <Plus className="w-3 h-3" />
                        </Button>
                        <span className="text-xs text-muted-foreground">questions</span>
                      </div>

                      {/* Difficulty */}
                      <div className="flex gap-1 flex-wrap">
                        {([1, 2, 3, 4, 5, "mixed"] as Array<1 | 2 | 3 | 4 | 5 | "mixed">).map((d) => (
                          <button
                            key={d}
                            onClick={() => updateConfig(index, { difficulty: d })}
                            className={cn(
                              "text-xs px-2 py-1 rounded-md border transition-colors",
                              config.difficulty === d
                                ? "border-primary bg-primary/10 text-foreground"
                                : "border-border text-muted-foreground hover:border-border/80"
                            )}
                          >
                            {DIFFICULTY_LABELS[d]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {questionConfig.length < GAME_OPTIONS.length && (
              <Button variant="outline" size="sm" onClick={addGameType}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Question Type
              </Button>
            )}

            <div className={cn(
              "mt-4 flex items-center gap-2 text-sm p-3 rounded-lg",
              totalQuestions > 30 ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-muted text-muted-foreground"
            )}>
              <span className="font-bold text-foreground">{totalQuestions}</span>
              <span>/ 30 questions total</span>
              {totalQuestions > 30 && <AlertTriangle className="w-4 h-4 ml-auto" />}
            </div>
          </div>
        )}

        {/* Step 3: Proctoring */}
        {step === 3 && (
          <div>
            <h2 className="text-base font-semibold mb-1 flex items-center gap-2">
              <Shield className="w-4 h-4 text-muted-foreground" />
              Proctoring & Security
            </h2>
            <p className="text-xs text-muted-foreground mb-5">Control how strictly candidates are monitored during the test.</p>

            <div className="space-y-3">
              {[
                {
                  key: "fullscreen" as const,
                  icon: Monitor,
                  title: "Require Fullscreen",
                  desc: "Candidate must stay in fullscreen mode. Exit triggers a warning.",
                  value: requireFullscreen,
                  toggle: () => setRequireFullscreen((v) => !v),
                },
                {
                  key: "camera" as const,
                  icon: Camera,
                  title: "Require Camera",
                  desc: "Webcam access required. Face detection logs violations.",
                  value: requireCamera,
                  toggle: () => setRequireCamera((v) => !v),
                },
                {
                  key: "tab" as const,
                  icon: AlertTriangle,
                  title: "Allow Tab Switching",
                  desc: "If off, switching tabs or apps counts as a warning.",
                  value: allowTabSwitch,
                  toggle: () => setAllowTabSwitch((v) => !v),
                  inverted: true,
                },
              ].map(({ key, icon: Icon, title, desc, value, toggle, inverted }) => (
                <div key={key} className="flex items-center justify-between gap-4 p-4 rounded-lg border border-border">
                  <div className="flex items-start gap-3">
                    <Icon className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  </div>
                  <button
                    onClick={toggle}
                    className={cn(
                      "w-10 h-6 rounded-full transition-colors shrink-0 relative",
                      (inverted ? !value : value) ? "bg-emerald-500" : "bg-muted"
                    )}
                    aria-pressed={value}
                  >
                    <span className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform",
                      (inverted ? !value : value) ? "translate-x-5" : "translate-x-1"
                    )} />
                  </button>
                </div>
              ))}

              {/* Max warnings */}
              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Max Warnings Before Termination</p>
                    <p className="text-xs text-muted-foreground">Test auto-terminates after this many violations.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setMaxWarnings((w) => Math.max(1, w - 1))}>
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="text-base font-bold w-6 text-center tabular-nums">{maxWarnings}</span>
                    <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => setMaxWarnings((w) => Math.min(10, w + 1))}>
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Schedule */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-base font-semibold mb-1 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Schedule & Limits
            </h2>
            <p className="text-xs text-muted-foreground">All fields optional — leave blank for open-ended tests.</p>

            <div className="space-y-1.5">
              <Label htmlFor="maxP">Max Participants <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="maxP" type="number" min={1} placeholder="e.g., 50" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="starts">Start Date/Time <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input id="starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ends">End Date/Time <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Input id="ends" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div>
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              Review & Create
            </h2>
            <div className="space-y-3">
              {[
                { label: "Title", value: title },
                { label: "Description", value: description || "—" },
                { label: "Time Limit", value: `${timeLimitMinutes} minutes` },
                { label: "Total Questions", value: `${totalQuestions} questions` },
                {
                  label: "Question Breakdown",
                  value: questionConfig.map((q) => `${q.count}x ${GAME_OPTIONS.find(g => g.slug === q.game_slug)?.label ?? q.game_slug} (${DIFFICULTY_LABELS[q.difficulty]})`).join(", ")
                },
                { label: "Fullscreen Required", value: requireFullscreen ? "Yes" : "No" },
                { label: "Camera Required", value: requireCamera ? "Yes" : "No" },
                { label: "Tab Switching", value: allowTabSwitch ? "Allowed" : "Not allowed" },
                { label: "Max Warnings", value: maxWarnings.toString() },
                { label: "Max Participants", value: maxParticipants || "Unlimited" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start gap-4 py-2.5 border-b border-border/50 last:border-0">
                  <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                  <span className="text-xs text-foreground text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={step === 1 ? onCancel : () => setStep((s) => (s - 1) as Step)}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          {step === 1 ? "Cancel" : "Back"}
        </Button>

        {step < 5 ? (
          <Button onClick={() => setStep((s) => (s + 1) as Step)} disabled={!canProceed}>
            Next
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading} className="px-8">
            {loading ? "Creating..." : "Create Test"}
          </Button>
        )}
      </div>

      {/* Question count helper */}
      {step === 2 && totalQuestions > 30 && (
        <p className="text-xs text-red-400 text-center mt-2">Reduce total questions to 30 or fewer to continue.</p>
      )}
    </div>
  );
}
