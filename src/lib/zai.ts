/**
 * Z.AI singleton — backend only.
 * Used by the LeashGuide AI tutor route and the AI course builder.
 * The SDK reads credentials from the environment automatically.
 */
import ZAI from "z-ai-web-dev-sdk";

let _instance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

export async function getZAI() {
  if (!_instance) {
    _instance = await ZAI.create();
  }
  return _instance;
}

export type ZAIInstance = Awaited<ReturnType<typeof ZAI.create>>;
