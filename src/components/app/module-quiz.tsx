"use client";
import { useMemo, useState } from "react";
import type { Module } from "@/lib/framework/types";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Trophy, RotateCcw, ListChecks } from "lucide-react";

interface Props {
  courseCode: string;
  courseRowId: string;
  module: Module;
  onPassed?: (score: number, passed: boolean) => void;
}

interface QItem {
  question: string;
  options: string[];
  answer: string;
  source: string;
}

const PASS_THRESHOLD = 80;

export function ModuleQuiz({ courseCode, courseRowId, module, onPassed }: Props) {
  const learnerName = useAppStore((s) => s.learnerName);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<{ score: number; passed: boolean; correct: number; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Build an 8-question quiz from the module's per-class knowledge checks.
  const questions = useMemo<QItem[]>(() => {
    const pool: QItem[] = [];
    for (const sm of module.subModules) {
      for (const cls of sm.classes) {
        for (const k of cls.knowledgeCheck) {
          if (k.options && k.options.length > 1) {
            pool.push({ question: k.question, options: k.options, answer: k.answer, source: `${module.code} · ${cls.id}` });
          }
        }
      }
    }
    // Deterministic-ish shuffle then take 8.
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 8);
  }, [module]);

  async function submit() {
    if (Object.keys(answers).length < questions.length) {
      setErr("Answer all questions before submitting.");
      return;
    }
    setErr(null);
    setSubmitting(true);
    const payload = questions.map((q, i) => ({ question: q.question, selected: answers[i] ?? "", correct: q.answer }));
    try {
      const res = await api.submitQuiz({
        courseCode,
        moduleCode: module.code,
        learnerName: learnerName || undefined,
        answers: payload,
      });
      setResult({ score: res.score, passed: res.passed, correct: res.correctCount, total: res.total });
      onPassed?.(res.score, res.passed);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Quiz submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setAnswers({});
    setResult(null);
    setErr(null);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-primary" /> Module Quiz · {module.code}
          </CardTitle>
          <Badge variant={result ? (result.passed ? "default" : "destructive") : "outline"} className="text-[11px]">
            {result ? `${result.score}%` : `${PASS_THRESHOLD}% to pass`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result ? (
          <>
            <div className="space-y-4">
              {questions.map((q, i) => (
                <div key={i} className="rounded-lg border border-border/60 p-3">
                  <p className="text-sm font-medium">
                    {i + 1}. {q.question}
                  </p>
                  <RadioGroup
                    value={answers[i] ?? ""}
                    onValueChange={(v) => setAnswers((a) => ({ ...a, [i]: v }))}
                    className="mt-2 space-y-1.5"
                  >
                    {q.options.map((opt) => {
                      const id = `q${i}-${opt}`;
                      return (
                        <div key={opt} className="flex items-center gap-2">
                          <RadioGroupItem id={id} value={opt} />
                          <Label htmlFor={id} className="text-sm font-normal leading-snug">
                            {opt}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
              ))}
            </div>
            {err && <p className="text-xs text-destructive">{err}</p>}
            <Button onClick={submit} disabled={submitting} className="w-full">
              {submitting ? "Submitting…" : `Submit quiz (${questions.length} questions)`}
            </Button>
          </>
        ) : (
          <div className="space-y-3 py-2 text-center">
            <span
              className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${
                result.passed ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
              }`}
            >
              {result.passed ? <Trophy className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
            </span>
            <p className="text-lg font-semibold">{result.passed ? "Module passed!" : "Not quite — retake it"}</p>
            <p className="text-sm text-muted-foreground">
              You scored <span className="font-medium text-foreground">{result.correct}/{result.total}</span> ({result.score}%).
              Pass threshold is {PASS_THRESHOLD}%.
            </p>
            <div className="mx-auto max-w-sm space-y-1.5 text-left">
              {questions.map((q, i) => {
                const ok = answers[i] === q.answer;
                return (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    {ok ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                    )}
                    <span className={ok ? "text-muted-foreground" : "text-foreground"}>
                      {ok ? q.answer : `You: ${answers[i] ?? "—"} · Correct: ${q.answer}`}
                    </span>
                  </div>
                );
              })}
            </div>
            <Button variant="outline" onClick={reset} className="mt-2 gap-2">
              <RotateCcw className="h-4 w-4" /> Retake quiz
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
