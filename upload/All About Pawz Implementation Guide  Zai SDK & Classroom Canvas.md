# All About Pawz AI Professor + Classroom Canvas
## Implementation Guide: Zai SDK Integration & Classroom Canvas Operation

**Version:** 1.0 | **Date:** September 24, 2026  
**Purpose:** Converts product design notes into an implementation blueprint for engineering teams.

> **Assumptions & SDK items to confirm:** This guide uses confirmed Z.ai SDK patterns for chat completions, function calling, structured outputs, and vision (image input) — verified against [Z.ai Developer Docs](https://docs.z.ai/guides/develop/python/introduction) and the [function calling](https://docs.z.ai/guides/capabilities/function-calling) and [structured output](https://docs.z.ai/guides/capabilities/struct-output) guides. The Zai SDK also provides audio (TTS/ASR), image generation, and embedding services, but exact method names for those services must be finalized from the [API reference](https://docs.z.ai/api-reference/introduction) before coding begins. Model names referenced (e.g., `glm-4.6`, `glm-4.6v`, `glm-5.3-flash`) appear in Z.ai documentation but should be confirmed against the current [model catalog](https://docs.z.ai/guides/llm) at implementation time. Per-token, per-minute, and per-image costs should be tracked per model from [Z.ai pricing](https://docs.z.ai/guides/overview/pricing).

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Zai SDK Integration Architecture](#2-zai-sdk-integration-architecture)
3. [AI Professor Runtime](#3-ai-professor-runtime)
4. [Classroom Canvas Operation](#4-classroom-canvas-operation)
5. [Day Lifecycle State Machine](#5-day-lifecycle-state-machine)
6. [Companion Document System](#6-companion-document-system)
7. [Assessment, Records & Evidence](#7-assessment-records--evidence)
8. [Co-Host Classroom](#8-co-host-classroom)
9. [LMS Module Mapping](#9-lms-module-mapping)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Implementation Phases](#11-implementation-phases)

---

## 1. System Overview

### Core Principle

All About Pawz IS the curriculum. The AI Professor does not tutor — it delivers the actual instruction, aligned to state standards, with printable companion documents and a mastery-gated progression system. The Zai SDK provides the AI orchestration layer that powers the Professor's reasoning, vision, voice, and tool execution.

### Core Actors

| Actor | Role |
|---|---|
| **Learner** | Student engaging with the Day Canvas and AI Professor |
| **AI Professor** | Zai SDK-powered instruction agent delivering curriculum |
| **Co-Host** | Human educator who handles hands-on verification, integrity judgment calls, and mentoring moments (target ratio 1:200) |
| **Guardian/Parent** | Read-only live progress access; optional notifications |
| **Employer/Sponsor** | Verifiable credential access via evidence portfolio links |
| **District/Admin** | Backend governance; controls companion printing, standards adoption, course configuration |

### Core Surfaces

| Surface | Description |
|---|---|
| **Day Canvas** | Learner-facing instruction screen with real-time Professor interaction |
| **Co-Host Classroom** | Queue-based interface for human educators |
| **Companion Documents** | Printable PDF curriculum materials mapped to state standards |
| **Records & Evidence** | Timestamped audit trail of all learning and conduct events |
| **Admin/Governance** | Backend for district configuration, standards management, print governance |

### Architecture Diagram (Conceptual)

```
┌─────────────────────────────────────────────────────────┐
│                    LEARNER (Browser)                      │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              CLASSROOM CANVAS (Frontend)             │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │ │
│  │  │ Day      │  │ Composer │  │  Typed Cards      │  │ │
│  │  │ Screen   │  │ /Lock    │  │  (Citation,       │  │ │
│  │  │          │  │ State    │  │   Upload, Break,  │  │ │
│  │  │          │  │          │  │   Homework, etc.) │  │ │
│  │  └──────────┘  └──────────┘  └──────────────────┘  │ │
│  └───────────────────┬─────────────────────────────────┘ │
│                      │ WebSocket / SSE                     │
│  ┌───────────────────▼─────────────────────────────────┐ │
│  │         All About Pawz BACKEND (Application Server)       │ │
│  │  ┌──────────┐ ┌──────────┐ ┌────────────────────┐  │ │
│  │  │ State    │ │ Evidence │ │ Companion Doc      │  │ │
│  │  │ Machine  │ │ Writer   │ │ Generator          │  │ │
│  │  └──────────┘ └──────────┘ └────────────────────┘  │ │
│  │  ┌──────────────────────────────────────────────┐  │ │
│  │  │         ZAI SDK ADAPTER LAYER                │  │ │
│  │  │  ┌────────────┐ ┌──────────┐ ┌────────────┐  │  │ │
│  │  │  │ Professor  │ │Assessment│ │ Integrity  │  │  │ │
│  │  │  │ Runtime    │ │Evaluator │ │Classifier  │  │  │ │
│  │  │  └────────────┘ └──────────┘ └────────────┘  │  │ │
│  │  │  ┌────────────┐ ┌──────────┐ ┌────────────┐  │  │ │
│  │  │  │ Vision     │ │ Voice    │ │ Model      │  │  │ │
│  │  │  │ Service    │ │ Service  │ │ Router     │  │  │ │
│  │  │  └────────────┘ └──────────┘ └────────────┘  │  │ │
│  │  └──────────────────────────────────────────────┘  │ │
│  └───────────────────┬─────────────────────────────────┘ │
│                      │ HTTPS                              │
│  ┌───────────────────▼─────────────────────────────────┐ │
│  │              Z.AI API (api.z.ai)                      │ │
│  │  GLM Chat │ Vision │ TTS/ASR │ Image Gen │ Embeddings│ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Zai SDK Integration Architecture

### 2.1 SDK Overview

The [Zai SDK](https://github.com/zai-org/z-ai-sdk-python) (`zai-sdk`) is the official Python SDK for the [Z.ai Open Platform](https://z.ai/model-api), providing access to Z.ai's GLM model family. The SDK is OpenAI-compatible, supports async, and provides typed responses ([Z.ai Developer Docs](https://docs.z.ai/guides/develop/python/introduction)).

**Installation:**

```bash
pip install zai-sdk
```

**Client initialization:**

```python
from zai import ZaiClient
import os

client = ZaiClient(api_key=os.getenv("ZAI_API_KEY"))
```

**Base URL:** `https://api.z.ai/api/paas/v4/` (overseas) or `https://open.bigmodel.cn/api/paas/v4/` (mainland China) ([Z.ai API Reference](https://docs.z.ai/api-reference/introduction)).

### 2.2 Available Models & Capability Mapping

The Zai SDK provides access to the full GLM model family. Each model serves a specific role in the All About Pawz architecture:

| Capability | Z.ai Model(s) | All About Pawz Role | Pricing Reference |
|---|---|---|---|
| **Text chat & instruction** | `glm-4.5`, `glm-4.6`, `glm-4.7`, `glm-5`, `glm-5.2`, `glm-5.3` | Primary Professor instruction, reteach, grading | Varies by model |
| **Fast/cheap drills** | `glm-4.5-flash`, `glm-5.3-flash` | Quick checks, drill practice, low-stakes interactions | Lower cost |
| **Vision (image/video)** | `glm-4.5v`, `glm-4.6v`, `glm-5v-turbo` | Image recognition of student work, video transcript reasoning | Track per-token cost |
| **Image generation** | `glm-image`, `cogview-4` | Reference image generation for lessons | Per-image pricing |
| **Text-to-speech** | `cogtts`, `cogtts-clone` | Read-aloud, voice accessibility | Track per-character cost |
| **Speech-to-text** | ASR models | Voice input, dictation, oral proctoring | Track per-minute cost |
| **Embeddings** | Embedding models | Semantic search, similarity for spaced repetition | Track per-token cost |
| **OCR** | `glm-ocr` | Document parsing for uploaded work | Track per-token cost |

([Z.ai Model Documentation](https://docs.z.ai/guides/llm), [DeepWiki: z-ai-sdk-python](https://deepwiki.com/zai-org/z-ai-sdk-python))

### 2.3 Model Routing Strategy

Cost management is a day-one architecture decision. A 6-hour day with vision, voice, and video transcription is real compute. The Model Router selects models based on task complexity:

```python
class ModelRouter:
    """Routes requests to the appropriate GLM model based on task type."""

    ROUTING_TABLE = {
        # High-stakes: instruction delivery, reteach, grading, assessment
        "instruction": "glm-4.6",
        "reteach": "glm-4.6",
        "grading": "glm-4.6",
        "assessment_generation": "glm-4.6",
        "teach_back_evaluation": "glm-4.6",

        # Medium-stakes: homework generation, forecast, recap
        "homework_generation": "glm-4.5",
        "recap": "glm-4.5",
        "forecast": "glm-4.5",

        # Low-stakes: quick checks, drill practice, sentiment
        "quick_check": "glm-5.3-flash",
        "drill": "glm-5.3-flash",
        "sentiment": "glm-5.3-flash",

        # Vision tasks
        "work_recognition": "glm-4.6v",
        "video_understanding": "glm-4.6v",
        "document_ocr": "glm-ocr",

        # Generation tasks
        "reference_image": "glm-image",
        "tts": "cogtts",
        "asr": "asr-model",  # Confirm exact model ID from Z.ai docs
        "embedding": "embedding-model",  # Confirm exact model ID from Z.ai docs
    }

    def get_model(self, task_type: str) -> str:
        return self.ROUTING_TABLE.get(task_type, "glm-4.5")
```

**Routing rules:**
- Drill practice and quick checks use `glm-5.3-flash` (cheapest, fastest).
- Reteach and grading use `glm-4.6` (strongest reasoning for mastery evaluation).
- Vision tasks use `glm-4.6v` (native multimodal function calling, 128K context) ([Z.ai Blog: GLM-4.6V](https://z.ai/blog/glm-4.6v)).
- The router is configurable per tenant — districts can override model choices based on budget.

### 2.4 Adapter Layer: Service Contracts

The Zai SDK is wrapped behind adapter services so the application never calls the SDK directly. This isolates the application from SDK version changes and enables mocking for tests.

#### 2.4.1 ProfessorRuntime

The core instruction engine. Manages multi-turn conversations with the GLM model, enforces pedagogy policies, and produces structured outputs.

```python
from zai import ZaiClient
from dataclasses import dataclass
from typing import Optional

@dataclass
class ProfessorResponse:
    message: str                          # What the learner sees
    citations: list[dict]                 # Source references for factual claims
    next_state: str                       # State machine transition
    remediation_step: Optional[str]       # Current step in remediation cycle
    evidence_events: list[dict]           # Events to write to evidence log
    tool_calls: list[dict]                # Python sandbox, diagram gen, etc.
    confidence: float                     # Model confidence 0-1
    requires_human: bool                  # Escalate to co-host?

class ProfessorRuntime:
    def __init__(self, client: ZaiClient, model_router: ModelRouter):
        self.client = client
        self.router = model_router

    async def teach(
        self,
        system_policy: str,         # Global pedagogy rules (answer suppression, etc.)
        tenant_policy: str,         # District/course-specific rules
        lesson_context: dict,       # Current lesson, standard, companion refs
        learner_state: dict,        # Mastery, sentiment, history, transcript
        current_item: dict,         # The question/exercise being worked on
        conversation_history: list  # Prior messages in this session
    ) -> ProfessorResponse:
        """Deliver instruction for the current item."""
        model = self.router.get_model("instruction")

        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_policy},
                {"role": "system", "content": tenant_policy},
                {"role": "system", "content": self._build_lesson_context(lesson_context)},
                {"role": "system", "content": self._build_learner_state(learner_state)},
                *conversation_history,
                {"role": "user", "content": self._format_current_item(current_item)},
            ],
            tools=self._get_professor_tools(),      # Python sandbox, diagram, etc.
            tool_choice="auto",
            response_format={"type": "json_object"}, # Structured output
            temperature=0.7,
        )

        return self._parse_response(response)
```

**Prompt layer hierarchy:**

```
┌─────────────────────────────────────────────┐
│  System Policy (global, immutable)          │  Answer suppression, no shaming,
│  - Never provide answers                     │  conversational tone, cite sources
│  - Always conversational, never shames      │
│  - Cite previous discussions                │
│  - Spaced repetition in recap                │
├─────────────────────────────────────────────┤
│  Tenant Policy (per district/course)         │  State standards, grade level,
│  - State standards mapping                   │  acceptable conduct rules,
│  - Grade level constraints                    │  print companion references
│  - Course-specific safety rules              │
├─────────────────────────────────────────────┤
│  Lesson Context (per lesson)                 │  Current standard, companion
│  - Current state standard(s)                 │  page references, prerequisite
│  - Companion document references             │  chain
│  - Prerequisite standards                     │
├─────────────────────────────────────────────┤
│  Learner State (per learner, per session)    │  What they've mastered,
│  - Mastery levels per standard               │  yesterday's progress,
│  - Sentiment (sick, groggy, frustrated)      │  weak spots from spaced
│  - Recent discussion topics                  │  repetition schedule
│  - Spaced repetition schedule                │
├─────────────────────────────────────────────┤
│  Current Item (per interaction)              │  The specific exercise,
│  - Item content and type                     │  rubric, expected standard,
│  - Assessment rubric                         │  remediation cycle step
│  - Target standard                            │
│  - Remediation cycle step (if in cycle)      │
├─────────────────────────────────────────────┤
│  Safety/Integrity Constraints               │  Prompt injection detection,
│  - Integrity event logging                   │  pattern attack awareness,
│  - Anti-jailbreak instructions              │  behavioral transcript notation
└─────────────────────────────────────────────┘
```

#### 2.4.2 AssessmentEvaluator

Evaluates learner attempts against rubrics. Never gives answers — cycles through remediation.

```python
class AssessmentEvaluator:
    def __init__(self, client: ZaiClient, model_router: ModelRouter):
        self.client = client
        self.router = model_router

    async def evaluate_attempt(
        self,
        item: dict,                  # The question/exercise
        learner_attempt: str,         # What the learner submitted
        rubric: dict,                 # Scoring criteria
        conversation_history: list,   # Prior context
        cycle_step: int = 0,          # 0=first attempt, 1=reframe, 2=nudge, 3=reteach
    ) -> dict:
        """
        Evaluate a learner's attempt.
        Returns: {
            "grade": "correct" | "incorrect" | "partial",
            "feedback": str,           # Encouraging, never reveals answer
            "remediation_step": str,   # "reframe" | "nudge" | "reteach" | "parallel_item"
            "evidence_event": dict,    # For the audit trail
            "mastery_delta": float,    # Change to mastery score
        }
        """
        model = self.router.get_model("grading")

        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": GRADING_POLICY},
                {"role": "system", "content": self._build_rubric_context(rubric)},
                *conversation_history,
                {"role": "user", "content": f"Student attempt: {learner_attempt}"},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,  # Low temperature for consistent grading
        )

        return self._parse_grade(response)
```

**The 4-step remediation cycle:**

```
Learner answers incorrectly
         │
         ▼
   ┌─────────────┐
   │ 1. REFRAME   │  Acknowledge the attempt, rephrase the question
   │   the question│  without revealing the answer
   └──────┬──────┘
          │ Learner tries again
          ▼
   ┌─────────────┐
   │ 2. NUDGE     │  Point toward the cited source material
   │   to source  │  (companion page, reference sheet, lesson text)
   └──────┬──────┘
          │ Learner tries again
          ▼
   ┌─────────────┐
   │ 3. RETEACH   │  Return to the lesson, re-explain the concept
   │   the lesson │  from a different angle
   └──────┬──────┘
          │ Learner tries again
          ▼
   ┌─────────────┐
   │ 4. PARALLEL  │  Present a parallel item labeled "Try it another way"
   │   ITEM       │  Same standard, different presentation
   └──────┬──────┘
          │
          ▼
   Mastery check: can the student demonstrate the standard?
```

**UI behavior during remediation:** No red "wrong" screen. Progress indicator shows "working on this idea," not answer proximity. After the nudge step, a `CitationCard` opens the exact source passage. After reteach, the parallel item is visually labeled "Try it another way."

#### 2.4.3 IntegrityClassifier

Separates learning from conduct. Detects prompt injection, jailbreak attempts, and AI-generated work.

```python
class IntegrityClassifier:
    def __init__(self, client: ZaiClient, model_router: ModelRouter):
        self.client = client
        self.router = model_router

    async def classify(
        self,
        learner_input: str,
        learner_transcript: list,  # Prior work — "does this match how you talk?"
        context: dict,
    ) -> dict:
        """
        Classify learner input for integrity concerns.
        Returns: {
            "is_prompt_injection": bool,
            "is_jailbreak_attempt": bool,
            "is_abusive": bool,
            "ai_generation_likelihood": float,  # 0-1
            "transcript_consistency": float,     # How well it matches prior work
            "action": "log" | "conduct_hold" | "terminate",
            "evidence_event": dict,
        }
        """
        model = self.router.get_model("sentiment")  # Fast model for classification

        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": INTEGRITY_POLICY},
                {"role": "system", "content": self._build_transcript_summary(learner_transcript)},
                {"role": "user", "content": learner_input},
            ],
            response_format={"type": "json_object"},
            temperature=0.0,  # Deterministic for safety classification
        )

        return self._parse_classification(response)
```

**Two records principle:** The learning grade and conduct transcript are never mixed. Integrity events are logged separately from academic performance.

#### 2.4.4 VisionReviewService

Handles image recognition of student work — uploaded worksheets, photos of welds, plated dishes, wiring diagrams, finished projects.

```python
class VisionReviewService:
    def __init__(self, client: ZaiClient, model_router: ModelRouter):
        self.client = client
        self.router = model_router

    async def review_work(
        self,
        image_url: str,           # URL of uploaded image (or base64 data URL)
        item_context: dict,        # What was the assignment?
        rubric: dict,              # What constitutes correct?
    ) -> dict:
        """
        Analyze uploaded student work using GLM-4.6V vision model.
        Returns: {
            "recognized_content": str,    # What the model sees in the image
            "assessment": str,            # Pass/fail/partial based on rubric
            "feedback": str,              # Specific, encouraging feedback
            "confidence": float,
            "requires_human": bool,       # Vision is a signal, not proof
        }
        """
        model = self.router.get_model("work_recognition")

        response = self.client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": VISION_REVIEW_POLICY},
                {"role": "user", "content": [
                    {"type": "text", "text": self._build_review_prompt(item_context, rubric)},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ]},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )

        return self._parse_vision_response(response)
```

**Critical design constraint:** Image recognition of a weld or plated dish is a signal, not proof. The VisionReviewService always sets `requires_human: true` for hands-on verification tasks and routes them to the Co-Host queue.

#### 2.4.5 VoiceService

Handles text-to-speech (read-aloud) and speech-to-text (dictation, oral proctoring).

```python
class VoiceService:
    def __init__(self, client: ZaiClient, model_router: ModelRouter):
        self.client = client
        self.router = model_router

    async def text_to_speech(self, text: str, voice_profile: str = "default") -> bytes:
        """Generate audio for read-aloud accessibility."""
        # TODO: Replace with exact Zai SDK audio API method after checking
        # https://docs.z.ai/api-reference/introduction for TTS endpoint
        # The SDK provides CogTTS / cogtts-clone models for speech synthesis
        response = self._call_tts_api(
            model=self.router.get_model("tts"),
            text=text,
            voice=voice_profile,
        )
        return response.audio_bytes

    async def speech_to_text(self, audio_data: bytes) -> str:
        """Transcribe learner voice input for dictation and oral proctoring."""
        # TODO: Replace with exact Zai SDK ASR API method after checking
        # https://docs.z.ai/api-reference/introduction for transcription endpoint
        response = self._call_asr_api(
            model=self.router.get_model("asr"),
            audio=audio_data,
        )
        return response.transcript
```

#### 2.4.6 EvidenceWriter

Not a Zai SDK service, but the persistence layer that receives structured events from all services and writes them to the evidence timeline. Every Zai SDK call that produces a grade, assessment, integrity event, or state transition writes an evidence event here.

```python
class EvidenceWriter:
    """Persists all learning and conduct events to the audit timeline."""

    def write_event(self, event_type: str, learner_id: str, data: dict):
        """Write an immutable evidence event."""
        event = {
            "event_id": generate_uuid(),
            "event_type": event_type,        # See Section 7 for event types
            "learner_id": learner_id,
            "timestamp": utc_now(),
            "data": data,
            "hash": self._hash_chain(event),  # Tamper-evident chain
        }
        self.store.append(event)

    def export(self, learner_id: str, format: str = "json") -> bytes:
        """Export full evidence timeline as JSON or PDF."""
        events = self.store.get_by_learner(learner_id)
        if format == "json":
            return self._to_json(events)
        elif format == "pdf":
            return self._to_pdf(events)
```

### 2.5 Function Calling: Professor Tools

The Professor uses Zai SDK function calling to execute tools during instruction. The SDK supports `tools` and `tool_choice` parameters, with `tool_calls` returned in the response ([Z.ai Function Calling Docs](https://docs.z.ai/guides/capabilities/function-calling)).

```python
def _get_professor_tools(self) -> list[dict]:
    """Define tools the Professor can call during instruction."""
    return [
        {
            "type": "function",
            "function": {
                "name": "run_python",
                "description": "Execute Python code in the sandbox for technical courses",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "code": {"type": "string", "description": "Python code to execute"},
                    },
                    "required": ["code"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "generate_reference_image",
                "description": "Generate a visual reference image for the current lesson",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "prompt": {"type": "string", "description": "Image generation prompt"},
                        "style": {"type": "string", "description": "diagram, illustration, schematic"},
                    },
                    "required": ["prompt"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "open_citation",
                "description": "Open a specific source passage for the learner",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "source_id": {"type": "string"},
                        "passage": {"type": "string", "description": "Exact text to display"},
                    },
                    "required": ["source_id", "passage"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "request_co_host",
                "description": "Escalate to human co-host for hands-on verification or mentoring",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "reason": {"type": "string", "enum": [
                            "hands_on_verification",
                            "integrity_judgment",
                            "mentoring_moment",
                        ]},
                        "context": {"type": "string"},
                    },
                    "required": ["reason", "context"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "present_parallel_item",
                "description": "Present a parallel exercise labeled 'Try it another way'",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "standard_id": {"type": "string"},
                        "difficulty": {"type": "string", "enum": ["grade", "challenge"]},
                    },
                    "required": ["standard_id"],
                },
            },
        },
    ]
```

### 2.6 Structured Outputs

All Professor responses use Zai SDK's structured output capability (`response_format: {"type": "json_object"}`) to produce machine-readable instructions for the frontend ([Z.ai Structured Output Docs](https://docs.z.ai/guides/capabilities/struct-output)).

The Professor's JSON response schema:

```json
{
  "message": "Let's look at this differently. When we talked about fractions yesterday, remember how we split the pizza into 8 equal slices?",
  "citations": [
    {"source_id": "companion_ref_p12", "passage": "A fraction represents equal parts of a whole..."}
  ],
  "next_state": "AWAITING_ATTEMPT",
  "remediation_step": "reframe",
  "evidence_events": [
    {"event_type": "attempt_submitted", "result": "incorrect", "cycle_step": 1}
  ],
  "tool_calls": [],
  "confidence": 0.85,
  "requires_human": false
}
```

### 2.7 Streaming

For real-time Professor responses, use streaming to deliver tokens to the Canvas as they arrive:

```python
async def stream_instruction(self, ...):
    """Stream Professor responses to the Canvas in real time."""
    model = self.router.get_model("instruction")

    stream = self.client.chat.completions.create(
        model=model,
        messages=messages,
        stream=True,
        tools=self._get_professor_tools(),
        response_format={"type": "json_object"},
    )

    for chunk in stream:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content
```

---

## 3. AI Professor Runtime

### 3.1 Pedagogy Policies (Enforced in System Prompts)

These policies are baked into the immutable system prompt layer. They cannot be overridden by tenant or learner input.

| Policy | Implementation |
|---|---|
| **Answer suppression** | System prompt explicitly forbids providing answers. Structured output schema has no "answer" field. |
| **Remediation cycle** | Cycle step tracked in `current_item.remediation_cycle_step`. ProfessorResponse includes `remediation_step` field. |
| **Teach-back rule** | Before unit closure, Professor prompts learner to explain the concept in their own words. A separate `teach_back_evaluation` task verifies understanding. |
| **Mastery grading** | Latest evidence counts; retakes are the default. No averaging of early failure. Implemented in the mastery tracking system, not in the model prompt. |
| **Just-in-time prerequisites** | If a learner lacks a prerequisite (e.g., fractions in a pipefitting problem), the Professor teaches the prerequisite inline, within the problem context, not as a separate course. |
| **Conversational & encouraging** | System prompt enforces tone. Never shames. |
| **Sentiment-adaptive** | Sentiment is recorded at check-in. It alters style metadata only (word choice, pace, encouragement frequency). It cannot alter standards, mastery, or grading. |
| **Citations required** | ProfessorResponse schema requires `citations` for any factual or curricular claim. CitationCard renders these in the UI. |
| **Spaced repetition** | Built into recap: yesterday, last week, the weak spot from two weeks ago. The recap prompt includes the learner's spaced repetition schedule. |

### 3.2 Day Modes

Day length is a mode, not a mandate. The system supports three modes:

| Mode | Duration | Use Case | Target User |
|---|---|---|---|
| **Full Day** | 6 hours learning in 8-hour window | Flagship mode with 4x15min breaks + 1x1hr break | Traditional students |
| **Shift** | 2 hours | Compressed sessions for working learners | Shift workers, parents |
| **Sprint** | 45 minutes | Quick focused sessions | Busy adults, review sessions |

All three modes are first-class. The mode is selected at Day opening and affects break scheduling, not standards or mastery requirements.

### 3.3 Abandonment Protocol

If the learner disappears mid-day:
1. Professor saves complete session state
2. Notes the abandonment on the timeline as an evidence event
3. On next login, re-opens with a recap of where things left off
4. Nobody quits silently

### 3.4 Source Material & Errata

The Professor trusts the canon but can surface errata. Codes change (NEC, food code). The rule: **teach the standard, flag the revision.**

```
"If the book says X but the code was revised in 2024 to say Y:
 → Teach Y (the current standard)
 → Flag the errata: 'Your companion references X, which was superseded by Y in the 2024 revision'
 → Log the errata as an evidence event
 → Never say 'the book is wrong' — say 'the book has been updated'"
```

### 3.5 Bilingual by Default

The Professor explains in any language the learner chooses. It assesses competency, not English proficiency. This is a system prompt instruction, not a separate mode.

### 3.6 Accessibility

- **Voice:** CogTTS for read-aloud; ASR for voice input
- **Captions:** All video content has transcripts; Professor responses can be spoken
- **Pacing:** Day modes (Full/Shift/Sprint) allow self-paced learning
- **Dyslexia fonts:** Frontend concern; Professor content is plain text, rendered with learner's font preference
- **Multilingual:** Any language for instruction; assessment is competency-based, not language-based

---

## 4. Classroom Canvas Operation

### 4.1 Day Screen Regions

The Classroom Canvas is the primary learner-facing interface during an active Day session. It has three vertical regions:

```
┌─────────────────────────────────────────────────────────┐
│ TOP: Status Bar                                          │
│ [Preferred Name] [Pathway/Unit] [Mode] [Active Minutes]  │
│ [Mastery Meter] [Transcript] [Close]                     │
├─────────────────────────────────────────────────────────┤
│ CENTER: Chronological Message Timeline                   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐     │
│  │ Professor message with citations directly       │     │
│  │ beneath factual content                        │     │
│  │ [citation] [citation]                           │     │
│  └─────────────────────────────────────────────────┘     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐     │
│  │ Typed Card: Upload Demand                       │     │
│  │ "Please upload yesterday's homework"            │     │
│  │ [Upload] [Ask question]                         │     │
│  └─────────────────────────────────────────────────┘     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐     │
│  │ Typed Card: Break                               │     │
│  │ "15-minute break. You've earned it."            │     │
│  │ [Countdown: 14:32]  [What happens next]         │     │
│  └─────────────────────────────────────────────────┘     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐     │
│  │ Typed Card: Python Result                       │     │
│  │ > print(2 ** 10)                                │     │
│  │ 1024                                            │     │
│  └─────────────────────────────────────────────────┘     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐     │
│  │ Typed Card: Homework Assignment                  │     │
│  │ "For tomorrow: Complete exercises 3-7 on        │     │
│  │  companion page 24"                             │     │
│  └─────────────────────────────────────────────────┘     │
│                                                         │
├─────────────────────────────────────────────────────────┤
│ BOTTOM: Composer or Lock State                           │
│ [Textarea] [Send] [Attach] [Dictate] [Read Aloud]       │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Typed Cards

All non-message content in the timeline is rendered as typed cards. Each card type has a specific visual treatment:

| Card Type | Content | Trigger |
|---|---|---|
| **CitationCard** | Exact source passage from companion or reference | After nudge step in remediation cycle |
| **UploadDemand** | Request for homework or assignment submission | Homework gate, end of day |
| **BreakCard** | Countdown timer + "What happens next" preview | Scheduled breaks (4x15min + 1x1hr in Full Day) |
| **HomeworkCard** | Tomorrow's assignment with companion page references | End of day recap |
| **ForecastCard** | Tomorrow's topics preview | End of day recap |
| **PythonResult** | Code execution output | Professor runs Python via function calling |
| **DiagramCard** | Generated or reference diagram/image | Professor generates via `generate_reference_image` tool |
| **AssessmentCard** | Quiz/exam item with answer input | Assessment phase |
| **CoHostRequest** | Notification that human co-host is needed | Professor escalates via `request_co_host` tool |
| **ParallelItem** | Alternative exercise labeled "Try it another way" | Step 4 of remediation cycle |

### 4.3 Canvas Modes

The Canvas operates in distinct modes, each with different available actions:

#### Open State

The default instructional state. The composer is fully available.

| Element | Behavior |
|---|---|
| Composer | Textarea active. Send, Attach, Dictate, Read-aloud toggle all available. |
| Send behavior | Enter sends on desktop; explicit Send button on mobile. |
| Duplicate prevention | Pending submission disables duplicate send but preserves draft. |
| Professor messages | Stream in real-time with citations rendered beneath factual content. |
| Tool results | Rendered as typed cards (see above). |

#### Awaiting Homework/Upload

The Professor has requested an upload. New instruction cannot advance until the upload is accepted.

| Element | Behavior |
|---|---|
| Composer | Remains available for clarification questions. |
| Primary control | Upload button is the primary action. |
| New instruction | Blocked. Cannot advance to new material. |
| File states | `selecting → uploading → scanning → processing → ready → assessed` or `rejected` |

The file scanning pipeline:

```
File selected
    │
    ▼
┌──────────┐    ┌──────────┐    ┌────────────┐    ┌─────────┐
│ Uploading│───>│ Scanning │───>│ Processing │───>│ Ready   │
│          │    │ (integrity│    │ (vision/   │    │         │
│          │    │  + AI    │    │  OCR/eval) │    │         │
│          │    │  check)  │    │            │    │         │
└──────────┘    └──────────┘    └────────────┘    └────┬────┘
                                                      │
                                              ┌───────┴───────┐
                                              │               │
                                         Assessed        Rejected
                                         (grade         (integrity
                                          recorded)       flag or
                                                          format error)
```

#### Break

Scheduled rest period. The composer is replaced by a countdown.

| Element | Behavior |
|---|---|
| Composer | Replaced by countdown timer and "What happens next" preview. |
| Extension | Learner may extend a break once if tenant policy permits. |
| Early return | Returning early does not unlock the Canvas before the minimum break time elapses. |
| Break count | Full Day: 4x15min + 1x1hr. Shift: 1x10min. Sprint: no scheduled breaks. |

#### Closed

The Day has ended. Terminal state for the Day (but not for enrollment).

| Element | Behavior |
|---|---|
| Pinned content | Recap of today's learning, assigned homework, tomorrow's forecast, next eligible open time. |
| Composer | Disabled. |
| Transcript | Learner may review the full transcript. |
| Records | Learner may view their Records (mastery, evidence, hours). |

#### Conduct Hold

Triggered by confirmed behavioral violation.

| Element | Behavior |
|---|---|
| Notice | Identifies the prohibited behavior without repeating slurs or profanity. |
| Acknowledge | Available for first confirmed violation. Returns to prior safe state. |
| Second violation | Shows termination, appeal process, and data-export access. |

#### Connectivity (Offline)

Limited offline capability for equity.

| Element | Behavior |
|---|---|
| Reading | Cached messages can be read. |
| Drafting | One message can be drafted offline. |
| Grading | No grading or state transitions occur offline. |
| Reconnect | On reconnect, the system asks the user to send the draft. It never silently submits. |

### 4.4 Day Opening

When a learner opens a new Day, a modal appears:

```
┌─────────────────────────────────────────────────────────┐
│                   DAY OPENING MODAL                       │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Full Day │  │  Shift   │  │  Sprint  │              │
│  │ 6h learn │  │ 2h       │  │ 45min    │              │
│  │ 8h total │  │          │  │          │              │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                         │
│  Today's Target: [Standard Y - Add fractions with        │
│                   unlike denominators]                   │
│                                                         │
│  Outstanding Homework: [Exercise set 3, companion p.12]  │
│                                                         │
│  Co-Host: [Available / In session / Not assigned]        │
│                                                         │
│              [ START DAY ]                               │
└─────────────────────────────────────────────────────────┘
```

On open, the Professor:
1. Welcomes learner by preferred name
2. Requests sentiment (5 accessible choices + optional text)
3. Sentiment alters style metadata only — it cannot alter standards, mastery, or grading

### 4.5 Incorrect Answer Experience

There is no red "wrong" screen. The flow:

1. Professor acknowledges the attempt ("I can see you're thinking about this...")
2. Progress UI shows "working on this idea" (not answer proximity)
3. Professor begins the server-selected remediation cycle step
4. After nudge: CitationCard opens the exact source passage
5. After reteach: parallel item appears, visually labeled "Try it another way"

### 4.6 Progress View

Shows units in order with their standards and status:

| Status | Meaning |
|---|---|
| `LOCKED` | Prerequisite not met. Shows which prerequisite is needed. |
| `AVAILABLE` | Prerequisites met, ready to start. |
| `IN_PROGRESS` | Currently being worked on. |
| `MASTERED` | Standard demonstrated successfully. |
| `REVIEW_DUE` | Spaced repetition schedule indicates review needed. |

Each unit shows: monotone grade, active minutes, evidence count. **No leaderboard.**

---

## 5. Day Lifecycle State Machine

### 5.1 State Diagram

```
                         ┌───────────┐
                         │  (no Day) │
                         └─────┬─────┘
                               │ OPEN_DAY
                               ▼
                         ┌───────────┐
                         │ CHECK_IN  │
                         └─────┬─────┘
                               │ RECORD_SENTIMENT
                               ▼
                         ┌───────────┐
              ┌─────────>│ HOMEWORK  │
              │          │ GATE      │
              │          └─────┬─────┘
              │     ┌──────────┴──────────┐
              │     │ EVALUATE_HOMEWORK   │
              │     │ GATE                │
              │     ▼                     ▼
              │ ┌───────────┐       ┌──────────────┐
              │ │AWAITING   │       │   TEACHING   │◄──────────────┐
              │ │HOMEWORK   │──────>│              │               │
              │ └───────────┘       └──────┬───────┘               │
              │       ATTACH_HOMEWORK      │ PRESENT_ITEM          │
              │     ACCEPT_HOMEWORK        ▼                       │
              │     ASSESSMENT      ┌──────────────┐               │
              └─────────────────────│ AWAITING     │               │
                                    │ ATTEMPT      │               │
                                    └──────┬───────┘               │
                                           │ SUBMIT_ATTEMPT         │
                                           ▼                       │
                                    ┌──────────────┐               │
                                    │   GRADING    │               │
                                    └──────┬───────┘               │
                                           │ ACCEPT_GRADE           │
                                    ┌──────┴───────┐               │
                                    │              │               │
                              correct│         incorrect           │
                                    │              │               │
                                    ▼              └───────────────┘
                              ┌──────────────┐    (next cycle step)
                              │   TEACHING   │
                              │ (continue)   │
                              └──────────────┘

                    At any point: BREAK_DUE ──> BREAK_LOCKED
                                                       │ END_BREAK
                                                       ▼
                                                  (previous state)

                    End sequence:
                    REQUEST_END_DAY or SCHEDULED_END_DAY
                              │
                              ▼
                        ┌───────────┐
                        │   RECAP   │
                        └─────┬─────┘
                              │ ACCEPT_RECAP
                              ▼
                   ┌────────────────────┐
                   │ HOMEWORK_GENERATION│
                   └─────────┬──────────┘
                             │ ACCEPT_HOMEWORK_GENERATION
                             ▼
                       ┌───────────┐
                       │ FORECAST  │
                       └─────┬─────┘
                             │ ACCEPT_FORECAST
                             ▼
                       ┌───────────┐
                       │  CLOSED   │ (terminal for Day)
                       └───────────┘

                    Special transitions:
                    ┌──────────────────────────────────┐
                    │ CONDUCT_CLASSIFIED (any state)   │
                    │   → no-op | CONDUCT_HOLD |       │
                    │     TERMINATED                   │
                    ├──────────────────────────────────┤
                    │ ACKNOWLEDGE_WARNING              │
                    │   CONDUCT_HOLD → prior safe state│
                    ├──────────────────────────────────┤
                    │ SYSTEM_FAILURE (any state)       │
                    │   → no advance or SYSTEM_HOLD    │
                    ├──────────────────────────────────┤
                    │ PATHWAY_COMPLETE                 │
                    │   → CERTIFICATION_PENDING        │
                    ├──────────────────────────────────┤
                    │ CERTIFICATE_ISSUED               │
                    │   → RECAP then normal closure    │
                    └──────────────────────────────────┘
```

### 5.2 Command Table

| Command | Preconditions | Service Invoked | Result State | Evidence Events Written |
|---|---|---|---|---|
| `OPEN_DAY` | Enrollment active; no active Day; mode entitled | Creates Day record | `CHECK_IN` | `day_opened` |
| `RECORD_SENTIMENT` | `CHECK_IN` | ProfessorRuntime (sentiment) | `HOMEWORK_GATE` | `sentiment_recorded` |
| `EVALUATE_HOMEWORK_GATE` | `HOMEWORK_GATE` | Checks for outstanding homework | `AWAITING_HOMEWORK` or `TEACHING` | `homework_gate_evaluated` |
| `ATTACH_HOMEWORK` | `AWAITING_HOMEWORK`; file `READY` | VisionReviewService + IntegrityClassifier | State stays `AWAITING_HOMEWORK` until accepted | `file_uploaded`, `file_scanned`, `file_processed` |
| `ACCEPT_HOMEWORK_ASSESSMENT` | `AWAITING_HOMEWORK` | AssessmentEvaluator | `TEACHING` | `homework_assessed` |
| `PRESENT_ITEM` | `TEACHING`; eligible item exists | ProfessorRuntime (instruction) | `AWAITING_ATTEMPT` | `item_presented` |
| `SUBMIT_ATTEMPT` | `AWAITING_ATTEMPT`; item matches; composer open | AssessmentEvaluator | `GRADING` | `attempt_submitted` |
| `ACCEPT_GRADE` | `GRADING`; grade validated | Mastery update + EvidenceWriter | Correct → `TEACHING`; Incorrect → next cycle step | `grade_accepted`, `mastery_updated` |
| `BREAK_DUE` | Instructional state; no critical safety flow | Timer service | `BREAK_LOCKED` | `break_started` |
| `END_BREAK` | `now >= endsAt` | Timer service | Previous instructional state | `break_ended` |
| `REQUEST_END_DAY` | Learner or authorized guardian/co-host policy | ProfessorRuntime (recap) | `RECAP` | `end_day_requested` |
| `SCHEDULED_END_DAY` | `now >= scheduledCloseAt` | ProfessorRuntime (recap) | `RECAP` | `scheduled_end_day` |
| `ACCEPT_RECAP` | `RECAP`; validated output | ProfessorRuntime (homework gen) | `HOMEWORK_GENERATION` | `recap_accepted` |
| `ACCEPT_HOMEWORK_GENERATION` | State match | ProfessorRuntime (homework gen) | `FORECAST` | `homework_generated` |
| `ACCEPT_FORECAST` | State match | ProfessorRuntime (forecast) | `CLOSED`; composer locked | `forecast_accepted`, `day_closed` |
| `PATHWAY_COMPLETE` | All required units mastered + attestations satisfied | Credential service | `CERTIFICATION_PENDING` | `pathway_completed` |
| `CERTIFICATE_ISSUED` | Credential policy satisfied | Credential service | `RECAP` then normal closure | `certificate_issued` |
| `CONDUCT_CLASSIFIED` | Any non-terminal state | IntegrityClassifier | `no-op`, `CONDUCT_HOLD`, or `TERMINATED` | `conduct_classified`, `integrity_event` |
| `ACKNOWLEDGE_WARNING` | `CONDUCT_HOLD`; first strike | State restoration | Prior safe state | `warning_acknowledged` |
| `SYSTEM_FAILURE` | Any state | Error handler | No advance or `SYSTEM_HOLD` | `system_failure` |

### 5.3 Terminal States

| State | Scope | Recoverable? |
|---|---|---|
| `CLOSED` | Terminal for the Day | Yes — a new Day can be opened |
| `TERMINATED` | Terminal for enrollment | Only via appeal → administrative command reinstates |
| `SYSTEM_HOLD` | System work failed | Recoverable — system resolves and continues |

---

## 6. Companion Document System

### 6.1 Companion Document Schema

```json
{
  "companion_id": "uuid",
  "course_id": "linked_to_All About Pawz_course",
  "state_code": "AL",
  "grade_level": "7",
  "subject": "Mathematics",
  "document_type": "course_outline | student_workbook | reference_sheet | exercise_set | lab_guide",
  "print_format": "PDF",
  "mapped_standard_ids": ["AL.7.NS.1", "AL.7.NS.2", "..."],
  "ai_instruction_link": "lesson_uuid_in_professor_system",
  "revision_date": "2026-09-24",
  "content": { /* generated content, standards-mapped */ }
}
```

### 6.2 Document Types

| Type | Purpose | Replaces |
|---|---|---|
| **Course outline** | Scope and sequence mapped to state standards | District curriculum documentation |
| **Student workbook** | Exercises, practice problems, writing prompts | Textbook exercises |
| **Reference sheets** | Formulas, vocabulary, key concepts | Textbook reference material |
| **Exercise sets** | Graded by difficulty, mapped to standards | Textbook problem sets |
| **Lab guides** | Hands-on activities using common materials (science courses) | Lab manuals |

### 6.3 Generation Workflow

```
1. DISTRICT ADOPTS All About Pawz
        │
        ▼
2. STANDARDS INGESTION
   ┌──────────────────────────────────────┐
   │ State standards (e.g., Alabama Math  │
   │ Standards for Grade 7) ingested       │
   │ from state education authority       │
   └──────────────────┬───────────────────┘
                      │
                      ▼
3. COURSE MAPPING
   ┌──────────────────────────────────────┐
   │ ProfessorRuntime generates course    │
   │ outline mapping each standard to     │
   │ lessons and companion sections       │
   │ Uses: glm-4.6 for curriculum design  │
   └──────────────────┬───────────────────┘
                      │
                      ▼
4. COMPANION GENERATION
   ┌──────────────────────────────────────┐
   │ Generate each document type:         │
   │ - Workbook exercises per standard    │
   │ - Reference sheets for key concepts  │
   │ - Exercise sets graded by difficulty │
   │ - Lab guides for science courses     │
   │ Uses: glm-4.6 for content generation │
   │       glm-image for diagrams         │
   └──────────────────┬───────────────────┘
                      │
                      ▼
5. DISTRICT APPROVAL
   ┌──────────────────────────────────────┐
   │ District admin reviews and approves  │
   │ companions in backend governance     │
   │ interface                            │
   └──────────────────┬───────────────────┘
                      │
                      ▼
6. PRINT / PDF EXPORT
   ┌──────────────────────────────────────┐
   │ District prints companions OR        │
   │ All About Pawz provides print-on-demand    │
   └──────────────────┬───────────────────┘
                      │
                      ▼
7. STUDENTS USE COMPANIONS
   ┌──────────────────────────────────────┐
   │ Students use printed companions      │
   │ alongside AI Professor instruction   │
   │ Professor references companion pages │
   │ in lessons and citations              │
   └──────────────────┬───────────────────┘
                      │
                      ▼
8. REVISION CYCLE
   ┌──────────────────────────────────────┐
   │ When state standards change:         │
   │ - Re-ingest updated standards         │
   │ - Regenerate affected companions     │
   │ - District approves changes          │
   │ - New companions printed             │
   │ NO MORE 7-YEAR TEXTBOOK ADOPTION     │
   └──────────────────────────────────────┘
```

### 6.4 Companion–Professor Linkage

Each companion document has an `ai_instruction_link` field that connects it to the corresponding AI Professor lesson. When the Professor teaches a standard:

1. It references the companion page in the lesson
2. Citations in Professor messages link to companion passages
3. Homework assignments reference specific companion pages
4. Exercise sets in companions are used during the Practice phase

### 6.5 Print Workflow Benefits

| Benefit | Detail |
|---|---|
| Replaces textbook costs | ~$1,370/year per student (business assumption from product notes — verify current figures before external use) |
| Statutory print compliance | Satisfies states requiring printed materials (Alabama, likely others) |
| Offline access | Equity for students without home internet |
| Instant updates | Companions update when standards change — no reprinting textbooks |
| District control | Backend governance determines what gets printed |

---

## 7. Assessment, Records & Evidence

### 7.1 Two Records Principle

The learning grade and conduct transcript are **never mixed.** They are stored in separate data structures with separate access controls.

| Record | Contents | Who Can See |
|---|---|---|
| **Learning Record** | Mastery levels, grades, evidence events, hours, certificates | Learner, guardian (if configured), employer/sponsor (via link), co-host (read-only) |
| **Conduct Transcript** | Behavioral incidents, integrity events, acknowledgments, terminations | Learner, admin, co-host (for context) |

### 7.2 Evidence Event Types

Every action in the system produces an immutable evidence event:

| Event Type | Trigger | Data Included |
|---|---|---|
| `day_opened` | `OPEN_DAY` command | Mode, scheduled close time, outstanding homework |
| `sentiment_recorded` | `RECORD_SENTIMENT` | Sentiment value, style metadata applied |
| `homework_gate_evaluated` | `EVALUATE_HOMEWORK_GATE` | Result (has homework / no homework) |
| `file_uploaded` | `ATTACH_HOMEWORK` | File metadata, hash, type |
| `file_scanned` | Integrity check | Integrity result, AI generation likelihood |
| `file_processed` | Vision/OCR processing | Recognized content, assessment result |
| `homework_assessed` | `ACCEPT_HOMEWORK_ASSESSMENT` | Grade, feedback, standard |
| `item_presented` | `PRESENT_ITEM` | Item ID, standard, lesson context |
| `attempt_submitted` | `SUBMIT_ATTEMPT` | Item ID, learner response, cycle step |
| `grade_accepted` | `ACCEPT_GRADE` | Grade, mastery delta, rubric, evidence |
| `mastery_updated` | After grade accepted | Standard, old level, new level, evidence link |
| `break_started` | `BREAK_DUE` | Break number, duration, return time |
| `break_ended` | `END_BREAK` | Actual duration, extended? |
| `end_day_requested` | `REQUEST_END_DAY` | Who requested (learner/guardian/co-host) |
| `recap_accepted` | `ACCEPT_RECAP` | Today's summary, standards covered |
| `homework_generated` | `ACCEPT_HOMEWORK_GENERATION` | Assignment content, companion page refs |
| `forecast_accepted` | `ACCEPT_FORECAST` | Tomorrow's topics |
| `day_closed` | `ACCEPT_FORECAST` | Total learning minutes, standards mastered |
| `conduct_classified` | `CONDUCT_CLASSIFIED` | Classification result, action taken |
| `integrity_event` | IntegrityClassifier triggers | Type (injection/jailbreak/abuse/AI-gen), confidence |
| `co_host_attestation` | Co-Host resolves queue item | Observation mode, standard, result, signature |
| `certificate_issued` | `CERTIFICATE_ISSUED` | Certificate ID, standards covered, audit link |
| `pathway_completed` | `PATHWAY_COMPLETE` | Units mastered, attestations satisfied |
| `system_failure` | `SYSTEM_FAILURE` | Error details, state at failure, recovery action |

### 7.3 Evidence Portfolio

Every certificate links to the auditable timeline. An employer or sponsor can verify a credential by:
1. Receiving a shareable link
2. Viewing the human-readable chronological evidence
3. Filtering by pathway, standard, event type, or verifier
4. Exporting as JSON or PDF

### 7.4 Hours Records

Hours are formatted for the boards that need them:

| Format | Use Case |
|---|---|
| RTI hours | Response to Intervention documentation |
| CE hours | Continuing Education credits |
| Seat-time equivalents | Traditional attendance compliance |

### 7.5 Consent & Access Logging

- Evidence-access page lists every active/revoked consent and every API read
- Revoke action is immediate for future reads
- Revocation does not retract an already-downloaded export
- Every external access is logged as an evidence event

### 7.6 Mastery Grading

| Principle | Implementation |
|---|---|
| Latest evidence counts | Mastery level reflects the most recent demonstrated competency, not an average |
| Retakes are default | Learners can retry items; the latest attempt replaces the prior grade |
| No averaging of early failure | A failed first attempt does not permanently lower the mastery score |
| Mastery gate | Student must demonstrate mastery of a standard before advancing to the next |

### 7.7 Oral Proctoring

The Professor asks follow-up questions from the exam itself. You cannot paste your way through a conversation. This uses the VoiceService (ASR) for spoken responses and the AssessmentEvaluator for real-time evaluation.

Remote webcam proctoring is a supplement for the final exam only, not a daily requirement.

---

## 8. Co-Host Classroom

### 8.1 Routes

| Route | Purpose |
|---|---|
| `/classroom` | Dashboard — shift overview, queue summary |
| `/classroom/queue` | Main queue — items awaiting human attention |
| `/classroom/learners/[id]` | Individual learner detail and context |
| `/classroom/shifts` | Shift management — check in/out, assigned cohorts |
| `/classroom/qualifications` | Qualification management — what this co-host can attest |

### 8.2 Shift Workflow

```
START SHIFT
    │
    ▼
CHOOSE ASSIGNED TENANT/COHORT
    │
    ▼
CHECK IN
    │
    ▼
┌─────────────────────────────────────────┐
│ QUEUE                                    │
│ ┌──────┬──────┬─────────┬────────┬─────┐ │
│ │ SLA  │Learner│Pathway  │ Reason │Action│ │
│ ├──────┼──────┼─────────┼────────┼─────┤ │
│ │ 2min │ J.M. │ Welding │ Hands- │Claim │ │
│ │      │      │         │ on ver │      │ │
│ ├──────┼──────┼─────────┼────────┼─────┤ │
│ │ 5min │ S.K. │ Culinary│Integrity│Claim│ │
│ │      │      │         │ judgmt │      │ │
│ └──────┴──────┴─────────┴────────┴─────┘ │
│                                         │
│ Claiming leases item for 10 minutes.    │
│ Resolution forms are type-specific.      │
└─────────────────────────────────────────┘
```

### 8.3 Queue Item Columns

| Column | Content |
|---|---|
| **SLA** | Time until response required |
| **Learner** | Learner name and ID |
| **Pathway** | Current course/pathway |
| **Reason** | Why the Professor escalated (hands-on, integrity, mentoring) |
| **Context Summary** | Brief summary of the situation |
| **Requested Action** | What the co-host needs to do |

### 8.4 Attestation Requirements

When a co-host resolves a queue item, the attestation form requires:

| Field | Description |
|---|---|
| **Observation mode** | `live` / `in-person` / `recorded` |
| **Standard/Item** | Which standard is being verified |
| **Result** | `pass` / `fail` / `needs-repeat` |
| **Evidence attachment** | Required if policy mandates (photo, video, document) |
| **Fixed declaration** | Typed declaration statement (prevents template responses) |
| **Typed signature** | Co-host types their name as signature |
| **WebAuthn reauthentication** | Biometric/device reauthentication required |
| **Qualification snapshot** | Co-host's qualifications at time of attestation (for audit) |

### 8.5 Co-Host Constraints

| Can | Cannot |
|---|---|
| Add notes to future Professor context | Modify a grade |
| View learner evidence and transcript | Modify a mastery row |
| Request follow-up from Professor | Override an assessment |
| Escalate to admin | Change state machine transitions |

### 8.6 Co-Host Protocol

The human co-host is summoned for exactly three things:

| Trigger | Example |
|---|---|
| **Hands-on verification** | "I need you to verify this weld in person" |
| **Integrity judgment calls** | "This submission looks AI-generated — please review" |
| **Mentoring moments** | "The learner seems frustrated — this might be a good time for human connection" |

Everything else stays with the Professor. Target ratio: 1 co-host per 200 learners.

### 8.7 Parent/Employer/Sponsor View

A read-only live progress link replaces quarterly report cards. Authorized viewers can:
- See current mastery levels and progress
- View recent evidence events (no sensitive conduct details)
- See next scheduled Day and topics
- Cannot interact with the learner or Professor

---

## 9. LMS Module Mapping

The LMS shell (Leashed.io) has 14 bottom-nav modules. Each maps to backend services and the Zai SDK adapter layer:

### 9.1 Global Shell (Cross-Cutting)

| Component | Backend Service | Zai SDK Usage |
|---|---|---|
| Top nav bar | Session/auth service | None |
| Global search | Embedding service | Zai embeddings for semantic search |
| Voice search | VoiceService | ASR model |
| Notifications | Event bus | None |
| Quick actions | Context service | None |
| Achievement badges | Gamification service | None |
| Streak tracking | Progress service | None |
| Mastery gauge | Mastery service | None |

### 9.2 Module-to-Service Matrix

| Module | Primary Backend Service | Zai SDK Integration |
|---|---|---|
| **Home/Dashboard** | Aggregation service | ProfessorRuntime for AI Teacher card |
| **Lessons** | Content service + ProfessorRuntime | GLM instruction delivery, reference image generation, video transcript reasoning |
| **Assignments** | Assignment service + AssessmentEvaluator | GLM for homework generation, grading |
| **Grades** | Mastery service + EvidenceWriter | Structured output for grade reports |
| **Notes** | Notes service | None (local storage) |
| **Books/Reads** | Content service | None |
| **Calendar** | Scheduling service | None |
| **Messages** | Messaging service | None (unless Professor messaging) |
| **Files/Uploads** | File service + VisionReviewService | GLM-4.6V for work recognition, GLM-OCR for documents |
| **Notebook** | AI study assistant | GLM for summarize, study guide, brainstorm |
| **Media** | Media service | GLM-4.6V for video understanding |
| **Meet** | Video service | None |
| **Share** | Sharing service | None |
| **More** | Settings, help | None |

### 9.3 Module Permissions by Role

| Module | Learner | Co-Host | Guardian | Admin |
|---|---|---|---|---|
| Home/Dashboard | Full | View assigned learners | View linked learner | All |
| Lessons | Full | View + add context notes | Read-only | All |
| Assignments | Submit + view own | View assigned | Read-only | All |
| Grades | View own | View assigned | Read-only | All |
| Notes | Own notes | Add Professor context | None | All |
| Calendar | View own | View assigned | Read-only | All |
| Messages | Full | With assigned learners | Limited | All |
| Files | Upload own | Review uploads | None | All |
| Records | View own + export | View assigned + attest | Read-only link | All |
| Classroom | N/A | Full | N/A | All |

---

## 10. Non-Functional Requirements

### 10.1 Privacy & Student Data

- All learner data is tenant-isolated (district-level isolation)
- Evidence events are tamper-evident (hash-chained)
- Consent management is explicit and revocable
- Data exports include all evidence; revocation does not retract downloaded exports
- Follow FERPA-style controls for US educational institutions (verify specific state requirements per district)

### 10.2 Accessibility

| Requirement | Implementation |
|---|---|
| Voice input/output | CogTTS for read-aloud; ASR for dictation |
| Captions | All video content has transcripts |
| Pacing | Day modes (Full/Shift/Sprint) |
| Dyslexia fonts | Frontend rendering with learner preference |
| Multilingual | Professor instructs in any language; assesses competency, not English |
| Screen reader compatible | ARIA labels on all interactive elements |

### 10.3 Offline Behavior

- Cached messages can be read
- One message can be drafted
- No grading or state transitions occur
- Reconnect asks user to send draft (never silently submits)

### 10.4 Auditability

- Every state transition produces an evidence event
- Every grade links to the rubric, the attempt, and the conversation context
- Every external access to evidence is logged
- Certificates link to the full auditable timeline
- Integrity events are logged separately from learning records

### 10.5 Model Cost Management

- Model routing is a day-one architecture decision
- Cheap models (e.g., `glm-5.3-flash`) for drills, quick checks, sentiment
- Strong models (e.g., `glm-4.6`) for reteach, grading, instruction
- Vision models (e.g., `glm-4.6v`) only when image/video input is needed
- Token usage monitoring per learner, per tenant
- Cost alerts and budget caps configurable per district
- Track per-token, per-minute, and per-image costs by model from [Z.ai pricing](https://docs.z.ai/guides/overview/pricing)

### 10.6 Reliability & System Hold

- `SYSTEM_HOLD` is used when required system work failed without a safe continuation
- System hold is recoverable — the system resolves the issue and continues
- The Day never ends mid-course unless the learner initiates
- If the Zai SDK API is unavailable, the system enters `SYSTEM_HOLD` and resumes when connectivity returns

### 10.7 Tenant Governance

- Districts control what companions get printed
- Districts control model routing overrides (budget constraints)
- Districts control co-host assignments and qualifications
- Districts control consent policies for parent/employer access
- Districts control standards adoption and revision cycles

---

## 11. Implementation Phases

### Phase 1: Day Canvas + State Machine + Text AI Professor

**Goal:** A learner can open a Day, receive text-based instruction, answer questions, get graded through the remediation cycle, and close the Day with homework and forecast.

| Component | Tasks |
|---|---|
| State machine | Implement all states and transitions from Section 5 |
| ProfessorRuntime | Text-only instruction via `glm-4.6` |
| AssessmentEvaluator | Text-based grading with remediation cycle |
| Day Canvas | Open, Awaiting Attempt, Grading, Break, Closed modes |
| EvidenceWriter | Log all events from Section 7.2 |
| Composer | Text input, send, lock states |

**Zai SDK calls used:** `chat.completions.create` (instruction, grading), structured outputs, streaming. Audio/image/embedding APIs to be finalized from [API reference](https://docs.z.ai/api-reference/introduction).

### Phase 2: Companion Documents + Standards Mapping

**Goal:** Districts can generate printable companion PDFs mapped to state standards, and the Professor references them in instruction.

| Component | Tasks |
|---|---|
| Standards ingestion | Import state standards for target states |
| Companion generator | Generate all 5 document types via `glm-4.6` |
| PDF export | Render companions as print-optimized PDFs |
| Companion-Professor link | Professor cites companion pages in lessons |
| Backend governance | District approval workflow for companions |

**Zai SDK calls used:** `chat.completions.create` (content generation), image generation API for GLM-Image diagrams (confirm exact method from [API reference](https://docs.z.ai/api-reference/introduction)).

### Phase 3: Evidence Records + Mastery Transcripts

**Goal:** Full evidence timeline, mastery tracking, certificate generation, and exportable records.

| Component | Tasks |
|---|---|
| Mastery tracking | Latest-evidence grading, spaced repetition scheduling |
| Evidence timeline | Human-readable chronological view with filters |
| Certificate generation | Link certificates to auditable evidence |
| Export | JSON and PDF export of evidence |
| Consent management | Access logging, revocation |
| Hours records | RTI, CE, seat-time formatting |

**Zai SDK calls used:** Structured outputs for certificate generation, evidence formatting.

### Phase 4: Co-Host Queue + Attestation

**Goal:** Human co-hosts can check in, claim queue items, and complete attestations with WebAuthn.

| Component | Tasks |
|---|---|
| Classroom routes | `/classroom`, `/classroom/queue`, `/classroom/learners/[id]`, `/classroom/shifts`, `/classroom/qualifications` |
| Queue system | SLA tracking, 10-minute lease, type-specific resolution forms |
| Attestation | Observation mode, standard, result, evidence, signature, WebAuthn |
| Co-host constraints | Read-only grade/mastery; can add context notes |

**Zai SDK calls used:** ProfessorRuntime `request_co_host` tool call triggers queue items.

### Phase 5: Voice, Vision, Video + Model Routing

**Goal:** Full multimodal Professor with image recognition, video understanding, voice I/O, and cost-optimized model routing.

| Component | Tasks |
|---|---|
| VisionReviewService | GLM-4.6V for work recognition, always routes hands-on to co-host |
| VoiceService | CogTTS for read-aloud, ASR for dictation and oral proctoring |
| Video understanding | GLM-4.6V for video transcript reasoning |
| Model Router | Full routing table from Section 2.3 |
| Python sandbox | Function calling for code execution in technical courses |
| Reference image generation | GLM-Image for lesson diagrams |

**Zai SDK calls used:** `chat.completions.create` (vision via GLM-4.6V), TTS API (CogTTS), ASR API (transcription), image generation API (GLM-Image), function calling (Python sandbox). Confirm exact method names for audio/image services from [Z.ai API reference](https://docs.z.ai/api-reference/introduction) before implementation.

### Phase 6: Certificates, Partner Verification, Portals

**Goal:** Employer-verifiable credentials, parent/guardian portals, and the full LMS shell.

| Component | Tasks |
|---|---|
| Certificate system | Auditable, employer-verifiable credential links |
| Parent portal | Read-only live progress, notification configuration |
| Employer/sponsor portal | Credential verification via evidence link |
| Full LMS shell | All 14 modules from Section 9 |
| Gamification | Achievement badges, streaks, mastery gauges |
| Conduct system | Two records, behavioral transcript, appeal process |

**Zai SDK calls used:** All prior services in production configuration.

---

## Appendix A: Zai SDK Quick Reference

### Installation & Setup

```bash
pip install zai-sdk
```

```python
from zai import ZaiClient
import os

# Initialize client
client = ZaiClient(api_key=os.getenv("ZAI_API_KEY"))

# Base URL (overseas): https://api.z.ai/api/paas/v4/
# Base URL (China):    https://open.bigmodel.cn/api/paas/v4/
```

([Z.ai Python SDK Docs](https://docs.z.ai/guides/develop/python/introduction), [GitHub: z-ai-sdk-python](https://github.com/zai-org/z-ai-sdk-python))

### Basic Chat Completion

```python
response = client.chat.completions.create(
    model="glm-4.6",
    messages=[
        {"role": "system", "content": "You are an AI Professor..."},
        {"role": "user", "content": "Explain photosynthesis"},
    ],
    temperature=0.7,
    stream=False,
)
print(response.choices[0].message.content)
```

### Function Calling

```python
tools = [
    {
        "type": "function",
        "function": {
            "name": "run_python",
            "description": "Execute Python code",
            "parameters": {
                "type": "object",
                "properties": {
                    "code": {"type": "string"}
                },
                "required": ["code"],
            },
        },
    },
]

response = client.chat.completions.create(
    model="glm-4.6",
    messages=messages,
    tools=tools,
    tool_choice="auto",  # Only "auto" is supported
)

# Check for tool calls
if response.choices[0].message.tool_calls:
    for tool_call in response.choices[0].message.tool_calls:
        print(f"Tool: {tool_call.function.name}")
        print(f"Args: {tool_call.function.arguments}")
```

([Z.ai Function Calling Docs](https://docs.z.ai/guides/capabilities/function-calling))

### Structured Output

```python
response = client.chat.completions.create(
    model="glm-4.6",
    messages=messages,
    response_format={"type": "json_object"},  # Forces JSON output
    temperature=0.3,
)

import json
result = json.loads(response.choices[0].message.content)
```

([Z.ai Structured Output Docs](https://docs.z.ai/guides/capabilities/struct-output))

### Vision (Image Input)

```python
response = client.chat.completions.create(
    model="glm-4.6v",
    messages=[
        {"role": "system", "content": "Analyze the student's submitted work..."},
        {"role": "user", "content": [
            {"type": "text", "text": "What do you see in this worksheet?"},
            {"type": "image_url", "image_url": {"url": "https://..."}},
        ]},
    ],
    response_format={"type": "json_object"},
)
```

([Z.ai Vision Model Docs](https://docs.z.ai/guides/vlm/glm-4.5v), [GLM-4.6V Blog](https://z.ai/blog/glm-4.6v))

### Streaming

```python
stream = client.chat.completions.create(
    model="glm-4.6",
    messages=messages,
    stream=True,
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
```

### Available SDK Packages

| Language | Package | Repository |
|---|---|---|
| Python | `pip install zai-sdk` | [zai-org/z-ai-sdk-python](https://github.com/zai-org/z-ai-sdk-python) |
| TypeScript | `@ai-sdk/zai` (via Vercel AI SDK) | [Vercel AI SDK Z.AI Provider](https://ai-sdk.dev/providers/ai-sdk-providers/zai) |
| Java | `ai.z.openapi:z-ai-sdk` (Maven) | [zai-org/z-ai-sdk-java](https://github.com/zai-org/z-ai-sdk-java) |
| Go | Community SDK | [sofianhadi1983/zai-sdk-go](https://pkg.go.dev/github.com/sofianhadi1983/zai-sdk-go/pkg/zai) |
| REST API | Any HTTP client | [Z.ai API Reference](https://docs.z.ai/api-reference/introduction) |

> **Note:** The Python SDK provides chat completions, function calling, and structured outputs with verified patterns. Audio (TTS/ASR), image generation, and embedding service method names should be confirmed from the [Z.ai API reference](https://docs.z.ai/api-reference/introduction) before implementation. The SDK also supports [MCP (Model Context Protocol) server calling](https://docs.z.ai/guides/capabilities/mcp-call) for extending tool capabilities.

([Z.ai Quick Start](https://docs.z.ai/guides/overview/quick-start), [Z.ai Developer Docs](https://docs.z.ai))

---

## Appendix B: Key Design Decisions Summary

| Decision | Rationale |
|---|---|
| Zai SDK as the sole AI provider | GLM model family covers text, vision, TTS, ASR, image generation, and embeddings through one SDK and API key |
| Adapter pattern wrapping SDK | Isolates application from SDK version changes; enables mocking for tests |
| Model routing from day one | A 6-hour day with vision, voice, and video is real compute — routing is architecture, not optimization |
| Structured outputs for all Professor responses | Frontend needs machine-readable instructions (state transitions, citations, tool calls) |
| Two records (learning + conduct) | Never mix academic performance with behavioral incidents |
| Vision is a signal, not proof | Image recognition routes to co-host for hands-on verification |
| Oral proctoring over webcam proctoring | Conversational, cumulative assessment is the real defense; webcam is supplement only |
| Teach the standard, flag the errata | "The book is always right" becomes a liability when codes change |
| Day modes (Full/Shift/Sprint) | Rigid 6-hour day loses shift workers and parents — the vocational market |
| No leaderboard | Learning is private; mastery is individual |
| Evidence is hash-chained | Tamper-evident audit trail for employer-verifiable credentials |
