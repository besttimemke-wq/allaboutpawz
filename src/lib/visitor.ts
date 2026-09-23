import type { NextRequest } from "next/server";

export type Visitor = {
  id: string;
  name: string;
  email: string | null;
  token: string;
};

// Demo learner identity for the unified classroom build.
// The original app derived identity from PromptQL visitor-token headers at a
// trusted proxy. This standalone build uses a fixed demo learner so the
// classroom runs anywhere, while keeping the same getVisitor() contract so the
// rest of the server code is unchanged.
const DEMO_VISITOR: Visitor = {
  id: "demo-avery",
  name: "Avery Johnson",
  email: "avery.johnson@classroom.demo",
  token: "demo-token",
};

export function getVisitor(_request: NextRequest): Visitor {
  return DEMO_VISITOR;
}
