"use client";

// ---------------------------------------------------------------------------
// PawzslyChat — the floating AI triage assistant, wired to the owner's
// `triage-chat` Supabase edge function (deployed + verified live).
//
// The owner supplied this widget code verbatim; the only change is the vet
// escalation link: the spec's /vet-care/book route does not exist on this
// site, so escalation goes to the real booking flow (/book).
//
// Contract (edge function v6, tested):
//   POST { message, conversation_history } →
//   { triage_id, urgency, message, red_flags, escalate_to_vet, products[] }
//   products: { id, name, slug, brand, short_description, price(cents), reason }
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";

const STORE_KEY = "pawzsly:v1";
const HIDDEN_PREFIXES = ["/admin", "/groomer", "/seller", "/access-", "/learn", "/auth"];

interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  short_description: string;
  price: number | null;
  reason: string;
}

interface Message {
  role: "user" | "pawzsly";
  content: string;
  urgency?: string;
  products?: Product[];
  escalate_to_vet?: boolean;
}

const URGENCY_COLORS: Record<string, string> = {
  EMERGENCY: "bg-red-100 text-red-800 border-red-300",
  URGENT: "bg-orange-100 text-orange-800 border-orange-300",
  ROUTINE: "bg-blue-100 text-blue-800 border-blue-300",
  INFO: "bg-gray-100 text-gray-700 border-gray-300",
};

const GREETING: Message = {
  role: "pawzsly",
  content: "Hey! I'm Pawzsly 🐾 How can I help your pet today? Describe any symptoms or ask me about products.",
};

export default function PawzslyChat() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Array<{ role: string; content: string }>>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Restore the conversation + open state so context follows the visitor
  // across every page (including into the customer portal).
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.messages) && saved.messages.length) setMessages(saved.messages);
        if (Array.isArray(saved.history)) setHistory(saved.history);
        if (typeof saved.open === "boolean") setOpen(saved.open);
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ open, messages, history }));
    } catch {}
  }, [hydrated, open, messages, history]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/triage-chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({
            message: text,
            conversation_history: history,
          }),
        }
      );
      const data = await res.json();

      const reply: Message = {
        role: "pawzsly",
        content: data.message || "Sorry, I had trouble with that. Can you try again?",
        urgency: data.urgency,
        products: data.products || [],
        escalate_to_vet: data.escalate_to_vet,
      };

      setMessages((m) => [...m, reply]);
      setHistory((h) => [
        ...h.slice(-6),
        { role: "user", content: text },
        { role: "assistant", content: data.message || "" },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "pawzsly", content: "Something went wrong. Please try again." },
      ]);
    }
    setLoading(false);
  };

  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      {/* Collapsed: slim side tab on the right edge */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-0 top-1/2 z-50 -translate-y-1/2 rounded-l-xl bg-indigo-600 px-2 py-4 text-white shadow-lg hover:bg-indigo-700 flex flex-col items-center gap-2"
          aria-label="Open Pawzsly chat"
        >
          <span className="text-xl">🐾</span>
          <span className="text-[11px] font-semibold tracking-widest [writing-mode:vertical-rl]">ASK PAWZSLY</span>
        </button>
      )}

      {/* Open: docked side card, persists across pages */}
      {open && (
        <div className="fixed bottom-0 right-0 z-50 w-full sm:w-[380px] h-[70vh] sm:h-[calc(100vh-6rem)] sm:max-h-[720px] sm:right-4 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 bg-white sm:rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🐾</span>
              <div>
                <div className="font-semibold">Pawzsly</div>
                <div className="text-xs text-indigo-200">AI Pet Care Assistant</div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white text-xl">
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white rounded-br-md"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm"
                  }`}
                >
                  {m.urgency && m.urgency !== "INFO" && (
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border mb-1 ${URGENCY_COLORS[m.urgency]}`}>
                      {m.urgency}
                    </span>
                  )}
                  <p className="whitespace-pre-wrap">{m.content}</p>

                  {/* Vet escalation */}
                  {m.escalate_to_vet && (
                    <a
                      href="/book"
                      className="mt-2 inline-block bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-red-700"
                    >
                      🩺 Book a Vet Consult
                    </a>
                  )}

                  {/* Product recommendations */}
                  {m.products && m.products.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <div className="text-xs font-semibold text-gray-500">Recommended for you:</div>
                      {m.products.map((p) => (
                        <a
                          key={p.id}
                          href={`/products/${p.slug}`}
                          className="block bg-gray-50 border border-gray-200 rounded-lg p-2 hover:border-indigo-300 transition"
                        >
                          <div className="font-medium text-sm text-gray-900 truncate">{p.name}</div>
                          <div className="text-xs text-gray-500">{p.brand}</div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-indigo-600">{p.reason}</span>
                            {p.price && (
                              <span className="text-sm font-semibold text-gray-900">
                                ${(p.price / 100).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-2 text-sm text-gray-500">
                  <span className="animate-pulse">Pawzsly is thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 p-3 bg-white">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Describe symptoms or ask about products..."
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                disabled={loading}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="bg-indigo-600 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50"
              >
                →
              </button>
            </div>
            <div className="text-[10px] text-gray-400 mt-1 text-center">
              Pawzsly provides general guidance only, not veterinary diagnosis.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
