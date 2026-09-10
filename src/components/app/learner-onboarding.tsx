"use client";
import { useState } from "react";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, User, Heart, Target, BookOpen, Sparkles } from "lucide-react";

interface Props {
  onComplete: () => void;
}

const SITUATIONS = [
  "Reentering after incarceration",
  "Single parent",
  "Currently unhoused",
  "Recent immigrant",
  "Career changer",
  "First-time job seeker",
  "Recovering from setbacks",
  "Veteran transitioning",
];

export function LearnerOnboarding({ onComplete }: Props) {
  const learnerName = useAppStore((s) => s.learnerName);
  const setLearnerName = useAppStore((s) => s.setLearnerName);
  const [name, setName] = useState(learnerName);
  const [email, setEmail] = useState("");
  const [situation, setSituation] = useState("");
  const [goals, setGoals] = useState("");
  const [background, setBackground] = useState("");
  const [strengths, setStrengths] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      setLearnerName(name.trim());
      await api.saveLearnerProfile({
        name: name.trim(),
        email: email.trim() || undefined,
        situation: situation.trim() || undefined,
        goals: goals.trim() || undefined,
        background: background.trim() || undefined,
        strengths: strengths.trim() || undefined,
      });
      onComplete();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome to Leashed.io</h1>
          <p className="text-sm text-muted-foreground">
            Before your first class, help LeashGuide understand who you are so the lessons fit your life.
          </p>
        </div>
      </div>

      {/* Progress steps */}
      <div className="mb-6 flex items-center gap-1.5">
        {["Name", "Situation", "Goals", "Background"].map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-1.5">
            <div className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold transition ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-xs ${i <= step ? "font-medium text-foreground" : "text-muted-foreground"}`}>{label}</span>
            {i < 3 && <div className={`h-px flex-1 ${i < step ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">What should LeashGuide call you?</h2>
              </div>
              <div>
                <Label className="text-xs">Your name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marcus, Aisha, James" className="mt-1" autoFocus />
              </div>
              <div>
                <Label className="text-xs">Email (optional — for certificate delivery)</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1" type="email" />
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={() => setStep(1)} disabled={!name.trim()} className="gap-2">
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">What&apos;s your situation right now?</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                This helps LeashGuide pick examples and language that fit your life. Pick one or write your own.
              </p>
              <div className="flex flex-wrap gap-2">
                {SITUATIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSituation(s)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      situation === s
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <Textarea
                value={situation}
                onChange={(e) => setSituation(e.target.value)}
                placeholder="Or describe your situation in your own words…"
                rows={2}
              />
              <div className="flex justify-between gap-2">
                <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
                <Button onClick={() => setStep(2)} className="gap-2">Continue</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">What do you want to achieve?</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Be specific — a real goal helps LeashGuide connect the lessons to your why.
              </p>
              <Textarea
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="e.g. Get a stable job in pet grooming within 6 months so I can support my kids. Or: Learn to manage my money so I stop living paycheck to paycheck."
                rows={3}
                autoFocus
              />
              <div className="flex justify-between gap-2">
                <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                <Button onClick={() => setStep(3)} className="gap-2">Continue</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Your background & strengths</h2>
              </div>
              <div>
                <Label className="text-xs">Background — prior experience, education, or constraints</Label>
                <Textarea
                  value={background}
                  onChange={(e) => setBackground(e.target.value)}
                  placeholder="e.g. Worked construction for 10 years before my incarceration. GED. Comfortable with hands-on work."
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Strengths — what are you good at?</Label>
                <Textarea
                  value={strengths}
                  onChange={(e) => setStrengths(e.target.value)}
                  placeholder="e.g. I'm good with people, I show up on time, I learn fast by doing."
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-between gap-2">
                <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
                <Button onClick={save} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {saving ? "Saving…" : "Start learning"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Your information stays private — LeashGuide uses it only to teach you better.
      </p>
    </div>
  );
}
