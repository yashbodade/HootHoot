"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Clock, CheckCircle2, XCircle, ChevronRight, AlertTriangle, Shield, Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";
import ProctorEngine from "@/components/arena/ProctorEngine";
import type { ArenaUser, CompanyTest, QuestionLogEntry, WarningReason } from "@/types/arena";
import { generateArenaQuestions, checkArenaAnswer, type ArenaQuestion } from "@/features/arena/questionEngine";
import { submitTestSession } from "@/features/company/actions";
import Link from "next/link";
import { toast } from "sonner";

interface Props {
  user: ArenaUser;
  test: CompanyTest;
  sessionId: string;
}

type GameStatus = "countdown" | "playing" | "results";

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
}

export default function CompanyTestGame({ user, test, sessionId }: Props) {
  const startTimeRef = useRef(Date.now());
  const questionStartRef = useRef(Date.now());

  const [questions] = useState<ArenaQuestion[]>(() =>
    generateArenaQuestions().slice(0, Math.min(test.total_questions, 10))
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>("countdown");
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(questions[0]?.timeLimit ?? 30);
  // Overall timer from test.time_limit_minutes
  const [totalTimeLeft, setTotalTimeLeft] = useState(test.time_limit_minutes * 60);
  const [selected, setSelected] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [warningsCount, setWarningsCount] = useState(0);
  const [terminated, setTerminated] = useState(false);
  const [questionLog, setQuestionLog] = useState<QuestionLogEntry[]>([]);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;

  // Countdown
  useEffect(() => {
    if (gameStatus !== "countdown") return;
    if (countdown <= 0) { setGameStatus("playing"); questionStartRef.current = Date.now(); return; }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, gameStatus]);

  // Overall test timer (test.time_limit_minutes)
  useEffect(() => {
    if (gameStatus !== "playing") return;
    if (totalTimeLeft <= 0) { finishGame(score, "completed"); return; }
    const t = setTimeout(() => setTotalTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [totalTimeLeft, gameStatus]);

  // Per-question timer
  useEffect(() => {
    if (gameStatus !== "playing" || isAnswered) return;
    if (timeLeft <= 0) { handleAnswer(null); return; }
    const t = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, isAnswered, gameStatus]);

  const finishGame = useCallback(
    async (finalScore: number, status: "completed" | "disqualified") => {
      const elapsed = Date.now() - startTimeRef.current;
      setTotalElapsed(elapsed);
      setGameStatus("results");

      if (!submitted) {
        setSubmitted(true);
        const { error } = await submitTestSession({
          sessionId,
          testId: test.id,
          score: finalScore,
          timeTakenMs: elapsed,
          questionLog,
          warningsCount,
          status,
        });
        if (error) toast.error("Failed to submit result: " + error);
      }
    },
    [sessionId, test.id, questionLog, warningsCount, submitted]
  );

  const handleAnswer = useCallback(
    (answer: string | null) => {
      if (isAnswered || gameStatus !== "playing") return;
      const timeTaken = Date.now() - questionStartRef.current;
      const correct = answer !== null && checkArenaAnswer(currentQuestion, answer);

      setSelected(answer);
      setIsAnswered(true);
      setIsCorrect(correct);
      if (correct) setScore((s) => s + 1);

      setQuestionLog((log) => [
        ...log,
        {
          question_id: currentQuestion.id,
          game_slug: currentQuestion.type,
          difficulty: currentQuestion.difficulty,
          time_taken_ms: timeTaken,
          is_correct: correct,
          selected_answer: answer,
        },
      ]);

      setTimeout(() => {
        if (currentIndex + 1 >= totalQuestions) {
          finishGame(correct ? score + 1 : score, "completed");
        } else {
          setCurrentIndex((i) => i + 1);
          setTimeout(() => {
            setSelected(null);
            setIsAnswered(false);
            setIsCorrect(null);
            setTimeLeft(questions[currentIndex + 1]?.timeLimit ?? 20);
            questionStartRef.current = Date.now();
          }, 600);
        }
      }, 1000);
    },
    [isAnswered, gameStatus, currentQuestion, currentIndex, totalQuestions, questions, score, finishGame]
  );

  const handleWarning = useCallback((reason: WarningReason, count: number) => {
    setWarningsCount(count);
  }, []);

  const handleTerminate = useCallback(
    (reason: string) => {
      setTerminated(true);
      finishGame(score, "disqualified");
    },
    [score, finishGame]
  );

  // ── Countdown ─────────────────────────────────────────────────
  if (gameStatus === "countdown") {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">{test.title}</p>
          <p className="text-sm text-muted-foreground mb-6">Get ready for {totalQuestions} questions</p>
          <div className="text-8xl font-black font-heading text-foreground animate-pulse">
            {countdown === 0 ? "GO!" : countdown}
          </div>
          {test.require_fullscreen && (
            <div className="mt-6 flex items-center justify-center gap-2 text-orange-400 text-sm">
              <Shield className="w-4 h-4" />
              Proctored — Do not leave fullscreen
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Results ────────────────────────────────────────────────────
  if (gameStatus === "results") {
    const percentage = Math.round((score / totalQuestions) * 100);
    const passed = percentage >= 70;
    return (
      <div className="min-h-screen bg-background pt-20 pb-16">
        <div className="max-w-2xl mx-auto px-4">
          <div className="rounded-2xl border border-border bg-card p-8 text-center mb-6">
            {terminated && (
              <div className="flex items-center justify-center gap-2 text-red-400 text-sm mb-4">
                <AlertTriangle className="w-4 h-4" />
                Session terminated due to violations
              </div>
            )}
            <Trophy className={cn("w-12 h-12 mx-auto mb-4", passed ? "text-yellow-500" : "text-muted-foreground/40")} />
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Assessment Complete</p>
            <h1 className="text-5xl font-black font-heading mb-1">
              {score}<span className="text-muted-foreground text-3xl font-normal">/{totalQuestions}</span>
            </h1>
            <p className={cn("text-lg font-semibold mb-1", passed ? "text-emerald-400" : "text-orange-400")}>
              {passed ? "Passed" : "Did not pass"}
            </p>
            <p className="text-sm text-muted-foreground">{percentage}% correct &bull; {formatTime(totalElapsed)}</p>
            {warningsCount > 0 && (
              <p className="text-xs text-orange-400 mt-2 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {warningsCount} proctoring warning{warningsCount > 1 ? "s" : ""} recorded
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card mb-6">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-semibold text-sm font-heading">Question Breakdown</h3>
            </div>
            {questionLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3 border-b border-border/50 last:border-0">
                <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                {entry.is_correct ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                )}
                <span className="text-xs text-muted-foreground capitalize flex-1">{entry.game_slug}</span>
                <span className="text-xs text-muted-foreground font-mono">{Math.round(entry.time_taken_ms / 1000)}s</span>
              </div>
            ))}
          </div>

          <Button asChild className="w-full h-11">
            <Link href="/">Back to Hoot-Hoot</Link>
          </Button>
        </div>
      </div>
    );
  }

  // ── Playing ────────────────────────────────────────────────────
  const timerPercent = (timeLeft / (currentQuestion?.timeLimit ?? 30)) * 100;
  const overallPercent = (totalTimeLeft / (test.time_limit_minutes * 60)) * 100;

  return (
    <ProctorEngine
      sessionId={sessionId}
      sessionType="test"
      maxWarnings={test.max_warnings}
      requireFullscreen={test.require_fullscreen}
      enabled={true}
      onWarning={handleWarning}
      onTerminate={handleTerminate}
    >
      <div className="min-h-screen bg-background pt-20 pb-16">
        <div className="max-w-3xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 pt-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{currentIndex + 1}</span>/{totalQuestions}
              </span>
              <Badge variant="outline" className="text-xs text-muted-foreground">
                {test.title}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              {warningsCount > 0 && (
                <div className="flex items-center gap-1.5 text-orange-400 text-xs">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {warningsCount}/{test.max_warnings}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className={cn("text-xs font-mono tabular-nums", totalTimeLeft < 60 && "text-red-400")}>
                  {Math.floor(totalTimeLeft / 60)}:{String(totalTimeLeft % 60).padStart(2, "0")} total
                </span>
              </div>
              <span className={cn("text-lg font-bold font-mono tabular-nums", timeLeft <= 5 && "text-red-400")}>
                {timeLeft}s
              </span>
            </div>
          </div>

          {/* Progress bars */}
          <div className="flex gap-1 mb-3">
            {questions.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all",
                  i < currentIndex ? (questionLog[i]?.is_correct ? "bg-emerald-500" : "bg-red-500") : i === currentIndex ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
          <div className="h-px bg-muted rounded-full mb-6 overflow-hidden">
            <div className={cn("h-full rounded-full transition-all duration-1000", timerPercent > 60 ? "bg-emerald-500" : timerPercent > 30 ? "bg-yellow-500" : "bg-red-500")} style={{ width: `${timerPercent}%` }} />
          </div>

          {/* Question card */}
          <div className="rounded-2xl border border-border bg-card p-6 md:p-8 mb-6">
            {/* Switch question */}
            {currentQuestion?.type === "switch" && currentQuestion.switchPuzzle && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Switch Operator Challenge</p>
                <div className="mb-6 flex flex-col sm:flex-row items-center justify-center gap-6">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">Input</p>
                    <div className="flex gap-1.5">
                      {currentQuestion.switchPuzzle.input.map((s, i) => (
                        <div key={i} className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-sm font-bold">{s}</div>
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground hidden sm:block" />
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-2">Output</p>
                    <div className="flex gap-1.5">
                      {currentQuestion.switchPuzzle.output.map((s, i) => (
                        <div key={i} className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold">{s}</div>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground mb-5">Which operator transforms Input → Output?</p>
                <div className="grid grid-cols-2 gap-3">
                  {currentQuestion.switchPuzzle.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(opt)}
                      disabled={isAnswered}
                      className={cn(
                        "rounded-xl border p-4 text-sm font-mono transition-all duration-200",
                        !isAnswered && "hover:bg-white/5 hover:border-white/20 cursor-pointer border-border bg-card",
                        selected === opt && isCorrect && "bg-emerald-500/20 border-emerald-500/60 text-emerald-300",
                        selected === opt && !isCorrect && "bg-red-500/20 border-red-500/60 text-red-300",
                        selected !== opt && isAnswered && "opacity-40 cursor-not-allowed border-border bg-card"
                      )}
                    >
                      [{opt}]
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sequence / logic question */}
            {(currentQuestion?.type === "sequence" || currentQuestion?.type === "logic") && currentQuestion.options && (
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-4">Reasoning Challenge</p>
                <p className="text-base font-medium text-foreground text-center mb-6 leading-relaxed">
                  {currentQuestion.question}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {currentQuestion.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleAnswer(opt)}
                      disabled={isAnswered}
                      className={cn(
                        "rounded-xl border p-4 text-sm transition-all duration-200 text-center",
                        !isAnswered && "hover:bg-white/5 hover:border-white/20 cursor-pointer border-border bg-card",
                        selected === opt && isCorrect && "bg-emerald-500/20 border-emerald-500/60 text-emerald-300",
                        selected === opt && !isCorrect && "bg-red-500/20 border-red-500/60 text-red-300",
                        selected !== opt && isAnswered && "opacity-40 cursor-not-allowed border-border bg-card"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProctorEngine>
  );
}
