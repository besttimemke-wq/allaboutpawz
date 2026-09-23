// Unified AI router for the UNLEASHED classroom.
//
// Two providers coexist in this build:
//   - Gemini (lib/gemini.ts) — preserved from the original build; used when
//     AI_PROVIDER=gemini AND PROMPTQL_PLATFORM_API_URL is configured.
//   - ZAI (lib/zai.ts) — added in the unified build via z-ai-web-dev-sdk; the
//     default working provider so the classroom runs anywhere.
//
// Both expose identical generateText / generateJson signatures, so the API
// routes import from here and never need to know which provider is active.

import * as gemini from "./gemini";
import * as zai from "./zai";

export type AiProvider = "gemini" | "zai";

export function activeProvider(): AiProvider {
  const requested = process.env.AI_PROVIDER?.toLowerCase();
  if (requested === "gemini" && process.env.PROMPTQL_PLATFORM_API_URL) {
    return "gemini";
  }
  return "zai";
}

export const modelLabel =
  activeProvider() === "gemini" ? gemini.modelLabel : zai.modelLabel;

type History = Array<{ role: "user" | "model"; text: string }>;

export async function generateText(
  visitorToken: string,
  systemInstruction: string,
  history: History,
  description: string,
): Promise<string> {
  return activeProvider() === "gemini"
    ? gemini.generateText(visitorToken, systemInstruction, history, description)
    : zai.generateText(visitorToken, systemInstruction, history, description);
}

export async function generateJson<T>(
  visitorToken: string,
  systemInstruction: string,
  userPrompt: string,
  schema: Record<string, unknown>,
  description: string,
): Promise<T> {
  return activeProvider() === "gemini"
    ? gemini.generateJson<T>(visitorToken, systemInstruction, userPrompt, schema, description)
    : zai.generateJson<T>(visitorToken, systemInstruction, userPrompt, schema, description);
}
