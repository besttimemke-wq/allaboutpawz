"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Bot, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  courseCode: string;
  moduleCode: string;
  moduleTitle: string;
  classId?: string;
  classTitle?: string;
}

const STARTERS = [
  "Help me start the Connect step.",
  "Quiz me on the five-step cycle.",
  "I'm stuck — where do I begin?",
];

export function LeashGuideChat({ courseCode, moduleCode, moduleTitle, classId, classTitle }: Props) {
  const learnerName = useAppStore((s) => s.learnerName);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset conversation when the module/class target changes.
  useEffect(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
  }, [courseCode, moduleCode, classId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    setInput("");
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    setLoading(true);
    try {
      const res = await api.sendTutorMessage({
        courseCode,
        moduleCode,
        classId,
        message: trimmed,
        sessionId: sessionId ?? undefined,
        learnerName: learnerName || undefined,
      });
      setSessionId(res.sessionId);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "LeashGuide couldn't reply.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-border/70 bg-card">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">LeashGuide</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {moduleTitle}
            {classTitle ? ` · ${classTitle}` : ""}
          </p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] font-medium text-primary">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Live AI
        </span>
      </div>

      <div ref={scrollRef} className="scroll-area-custom flex-1 space-y-3 overflow-y-auto p-4" style={{ minHeight: 240 }}>
        {messages.length === 0 && !loading && (
          <div className="space-y-3 py-2">
            <div className="rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              I&apos;m your Socratic coach for <strong className="text-foreground">{moduleTitle}</strong>. I won&apos;t hand
              you the artifact — I&apos;ll help you build it. One concept per reply, always ending in a question.
            </div>
            <div className="flex flex-wrap gap-1.5">
              {STARTERS.map((s) => (
                <Button key={s} variant="outline" size="sm" className="h-7 text-xs" onClick={() => send(s)}>
                  {s}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex gap-2.5", m.role === "user" && "flex-row-reverse")}>
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                m.role === "assistant" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground",
              )}
            >
              {m.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
            </span>
            <div
              className={cn(
                "max-w-[85%] rounded-xl px-3 py-2 text-sm",
                m.role === "assistant" ? "bg-muted/60" : "bg-primary text-primary-foreground",
              )}
            >
              {m.role === "assistant" ? <Markdown>{m.content}</Markdown> : <p className="leading-relaxed">{m.content}</p>}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </span>
            <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              LeashGuide is thinking…
            </div>
          </div>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-border/60 p-3"
      >
        <div className="flex items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask LeashGuide…"
            rows={2}
            className="min-h-[44px] resize-none text-sm"
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()} className="h-10 w-10 shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
