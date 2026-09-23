import atlas from "@/data/atlas.json";
import type { Area, StateSummary } from "./types";

type RawArea = { area: string; statute: string };

type RawState = {
  state: string;
  curriculum: { entity: string };
  standards: { entity: string; mode: "require" | "recommend"; statute: string };
  areas: RawArea[];
  texts: Record<string, string>;
};

type SourceBlock = {
  citation: string;
  text: string;
};

const states = atlas.states as Record<string, RawState>;
const ignoredWords = new Set([
  "and", "the", "for", "with", "from", "into", "education", "instruction",
  "studies", "study", "state", "school", "schools", "grade", "grades",
]);

function normalize(value: string) {
  return value
    .toLocaleLowerCase()
    .replace(/\(\d{4}\)/g, "")
    .replace(/[^\p{L}\p{N}§]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourceBlocks(source: string): SourceBlock[] {
  const starts = [...source.matchAll(/^([^\n]{3,180}(?:§|Statute|Code)[^\n]*):\s*$/gm)];
  return starts.map((match, index) => {
    const start = match.index ?? 0;
    const end = starts[index + 1]?.index ?? source.length;
    return {
      citation: match[1].trim(),
      text: source
        .slice(start, end)
        .replace(/\[\d+\]/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    };
  });
}

function areaTokens(area: string) {
  return [...new Set(
    normalize(area)
      .split(" ")
      .filter((word) => word.length >= 4 && !ignoredWords.has(word)),
  )];
}

function excerptFor(raw: RawState, area: RawArea) {
  const blocks = sourceBlocks(raw.texts.areas ?? "");
  const targetCitation = normalize(area.statute);
  const tokens = areaTokens(area.area);

  const ranked = blocks
    .map((block) => {
      const normalizedText = normalize(block.text);
      const normalizedCitation = normalize(block.citation);
      const tokenMatches = tokens.filter((token) => normalizedText.includes(token)).length;
      const topicScore = tokens.length ? tokenMatches / tokens.length : 0;
      const citationMatch =
        normalizedCitation === targetCitation ||
        normalizedCitation.includes(targetCitation) ||
        targetCitation.includes(normalizedCitation);
      return {
        ...block,
        topicScore,
        citationMatch,
        score: topicScore + (citationMatch && topicScore >= 0.2 ? 0.35 : 0),
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  if (!best || (best.topicScore === 0 && !best.citationMatch)) {
    return {
      sourceExcerpt:
        "The full matching excerpt is not available in this demonstration dataset. Use the listed citation to inspect the authoritative source before adoption.",
      excerptCitation: "",
      citationMatchesExcerpt: false,
    };
  }

  const excerpt =
    best.text.length > 1250 ? `${best.text.slice(0, 1247).trim()}…` : best.text;

  return {
    sourceExcerpt: excerpt,
    excerptCitation: best.citation,
    citationMatchesExcerpt: best.citationMatch,
  };
}

function gradeScope(label: string): string[] | null {
  const normalized = label.toLowerCase();
  const range =
    normalized.match(/grades?\s+(k|kindergarten|\d{1,2})\s+(?:to|through|-)\s+(k|kindergarten|\d{1,2})/) ??
    normalized.match(/(?:grade|grades)\s+(k|kindergarten|\d{1,2})\s*[-–]\s*(k|kindergarten|\d{1,2})/);

  const gradeNumber = (value: string) =>
    value === "k" || value === "kindergarten" ? 0 : Number(value);

  if (range) {
    const start = gradeNumber(range[1]);
    const end = gradeNumber(range[2]);
    if (Number.isInteger(start) && Number.isInteger(end) && start <= end && end <= 12) {
      return Array.from({ length: end - start + 1 }, (_, index) => {
        const grade = start + index;
        return grade === 0 ? "K" : String(grade);
      });
    }
  }

  const single = normalized.match(/\bgrade\s+(k|kindergarten|\d{1,2})\b/);
  if (single) {
    const grade = gradeNumber(single[1]);
    if (Number.isInteger(grade) && grade <= 12) return [grade === 0 ? "K" : String(grade)];
  }

  return null;
}

function mapAreas(raw: RawState): Area[] {
  return raw.areas.map((area) => ({
    ...area,
    grades: gradeScope(area.area),
    ...excerptFor(raw, area),
  }));
}

export function listStates(): StateSummary[] {
  return Object.values(states)
    .map((item) => ({
      state: item.state,
      authority: item.standards.entity,
      mode: item.standards.mode,
      standardStatute: item.standards.statute,
      curriculumEntity: item.curriculum.entity,
      areas: mapAreas(item),
    }))
    .sort((a, b) => a.state.localeCompare(b.state));
}

export function getState(name: string) {
  return states[name] ?? null;
}

export function findArea(state: string, area: string) {
  const raw = states[state];
  return raw ? mapAreas(raw).find((candidate) => candidate.area === area) ?? null : null;
}
