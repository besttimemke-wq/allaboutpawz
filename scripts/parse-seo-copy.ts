/**
 * scripts/parse-seo-copy.ts
 *
 * Parses the AllAboutPawz SEO copy markdown files in /home/z/my-project/upload/
 * into a single structured TypeScript data module at
 * /home/z/my-project/src/lib/shop/seo-copy.ts.
 *
 * Each markdown entry is converted into a SeoCopyBlock record. The output is a
 * static array literal — no runtime parsing happens in the consuming app.
 *
 * Run with: `bun run scripts/parse-seo-copy.ts`
 *
 * Idempotent: running it twice produces the same file (modulo trailing
 * whitespace, which we normalize).
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SeoCopyType =
  | "landing"
  | "animal"
  | "department"
  | "subcategory"
  | "collection"
  | "guide";

interface SeoCopyBlock {
  path: string;
  type: SeoCopyType;
  parent?: string;
  department?: string;
  title: string;
  metaDescription: string;
  h1: string;
  copyParagraphs: string[];
  links: { text: string; path: string }[];
  imageAlt: string;
  relatedSearches: string[];
  relatedGuides: string[];
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const UPLOAD_DIR = "/home/z/my-project/upload";
const OUTPUT_FILE = "/home/z/my-project/src/lib/shop/seo-copy.ts";

interface InputFile {
  name: string;
  defaultType: SeoCopyType;
}

const FILES: InputFile[] = [
  { name: "01-core-pages.md", defaultType: "landing" },
  { name: "02-animal-departments.md", defaultType: "landing" },
  { name: "03a-subcategories-cat.md", defaultType: "subcategory" },
  { name: "03b-subcategories-dog-1.md", defaultType: "subcategory" },
  { name: "03c-subcategories-dog-2.md", defaultType: "subcategory" },
  { name: "04-collections.md", defaultType: "collection" },
  { name: "05a-grooming-guides.md", defaultType: "guide" },
  { name: "05b-breed-guides-dog.md", defaultType: "guide" },
  { name: "05c-breed-guides-cat.md", defaultType: "guide" },
  { name: "05d-nutrition-guides.md", defaultType: "guide" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip surrounding double quotes if present.
 */
function stripQuotes(s: string): string {
  const trimmed = s.trim();
  if (
    trimmed.length >= 2 &&
    trimmed.startsWith('"') &&
    trimmed.endsWith('"')
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Match [label](path) markdown links. Handles paths containing most characters
 * except closing paren.
 */
const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Match **bold** markdown emphasis.
 */
const BOLD_RE = /\*\*([^*]+)\*\*/g;

/**
 * Extract { text, path } link pairs from a string and strip the link syntax
 * to leave plain text labels.
 */
function extractLinksAndStripMarkdown(text: string): {
  stripped: string;
  links: { text: string; path: string }[];
} {
  const links: { text: string; path: string }[] = [];
  const stripped = text
    .replace(LINK_RE, (_m, label: string, path: string) => {
      links.push({ text: label, path });
      return label;
    })
    .replace(BOLD_RE, (_m, word: string) => word);
  return { stripped, links };
}

/**
 * Split a comma- or pipe-separated list into trimmed items.
 *
 * The Related searches / Related guides lines may use either ", " (most
 * files) or " | " (03c) as separators. Split on whichever is present.
 *
 * Items themselves never contain commas or pipes — verified across all source
 * markdown files.
 */
function splitList(line: string): string[] {
  return line
    .split(/\s*\|\s*|\s*,\s*/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Split file content into raw entry chunks. Each chunk starts with a `# ` line
 * (the page title/slug) and ends at the next `---` separator or EOF.
 */
function splitEntries(content: string): string[] {
  const lines = content.split("\n");
  const chunks: string[] = [];
  let current: string[] = [];
  let inEntry = false;

  for (const line of lines) {
    // A `---` on its own line (allowing trailing whitespace) is an entry
    // separator.
    if (/^---\s*$/.test(line)) {
      if (inEntry && current.length > 0) {
        chunks.push(current.join("\n"));
        current = [];
        inEntry = false;
      }
      continue;
    }
    // A `# ` line that is a true heading (one #, not ## or ###) starts a new
    // entry. The file header (e.g. "# 01 — Core Site Pages") is also a #
    // line, but it won't contain a URL: line, so parseEntry will return null
    // for it and we skip.
    if (/^# [^\n]/.test(line)) {
      if (inEntry && current.length > 0) {
        chunks.push(current.join("\n"));
        current = [];
      }
      inEntry = true;
    }
    if (inEntry) {
      current.push(line);
    }
  }
  if (inEntry && current.length > 0) {
    chunks.push(current.join("\n"));
  }
  return chunks;
}

/**
 * Parse the URL line: `URL: <path> | Key: Value | Key: Value ...`
 * Returns the path plus a map of key→value pairs.
 */
function parseUrlLine(
  line: string
): { path: string; fields: Record<string, string> } | null {
  const match = line.match(/^URL:\s*(.*)$/);
  if (!match) return null;
  const rest = match[1];
  // Split on " | " (with whitespace tolerance). URL values never contain " | "
  // (paths don't, and Parent/Department/Season/Pillar values don't either).
  const pieces = rest.split(/\s*\|\s*/);
  const path = pieces.shift()?.trim() ?? "";
  if (!path) return null;
  const fields: Record<string, string> = {};
  for (const piece of pieces) {
    const idx = piece.indexOf(":");
    if (idx === -1) continue;
    const key = piece.slice(0, idx).trim();
    const value = piece.slice(idx + 1).trim();
    fields[key] = value;
  }
  return { path, fields };
}

/**
 * Find the Title/Meta/H1 in either inline or multi-line form.
 *
 * Inline form (02, 03a-c, 04, 05d):
 *   Title: "..." | Meta: "..." | H1: "..."
 * or (unquoted, 02):
 *   Title: ... | Meta: ... | H1: ...
 *
 * Multi-line form (05a, 05b, 05c, 01-core-pages):
 *   Title: ...
 *   Meta: ...
 *   H1: ...
 */
function findTitleMetaH1(
  lines: string[]
): { title: string; metaDescription: string; h1: string } | null {
  const titleIdx = lines.findIndex((l) => /^Title:\s*/.test(l));
  if (titleIdx === -1) return null;
  const titleLine = lines[titleIdx];

  // Inline form: same line contains " | Meta: " and " | H1: ".
  const inlineMatch = titleLine.match(
    /^Title:\s*(.*?)\s*\|\s*Meta:\s*(.*?)\s*\|\s*H1:\s*(.*?)\s*$/
  );
  if (inlineMatch) {
    return {
      title: stripQuotes(inlineMatch[1]),
      metaDescription: stripQuotes(inlineMatch[2]),
      h1: stripQuotes(inlineMatch[3]),
    };
  }

  // Multi-line form: title is just the rest of this line; look forward for
  // Meta: and H1: lines.
  const title = stripQuotes(titleLine.replace(/^Title:\s*/, ""));
  let meta = "";
  let h1 = "";
  for (let i = titleIdx + 1; i < lines.length && (meta === "" || h1 === ""); i++) {
    const l = lines[i];
    if (meta === "" && /^Meta:\s*/.test(l)) {
      meta = stripQuotes(l.replace(/^Meta:\s*/, ""));
    } else if (h1 === "" && /^H1:\s*/.test(l)) {
      h1 = stripQuotes(l.replace(/^H1:\s*/, ""));
    }
  }
  return { title, metaDescription: meta, h1 };
}

/**
 * Lines that mark the end of the SEO copy block / body.
 */
const BODY_STOP_RES: RegExp[] = [
  /^\[IMAGE:/,
  /^\[CTA:/,
  /^FAQ:/,
  /^## Frequently asked questions/,
  /^Schema:/,
  /^Internal links:/,
  /^Related searches:/,
  /^Related guides:/,
  /^Related categories:/,
  /^Shop the collection/,
  /^## Keep reading/,
  /^Promo headline:/,
];

function isBodyStopLine(line: string): boolean {
  return BODY_STOP_RES.some((re) => re.test(line));
}

/**
 * Given the lines of an entry, find the copy block. We support four leading
 * markers:
 *   - "SEO copy block:" (shop pages 02, 03a-c)
 *   - "Curated copy:" (collections 04)
 *   - "Intro:" (guides 05a-d)
 *   - "Body:" (core site pages 01)
 *
 * For shop pages with no leading marker (03c drops the "SEO copy block:" prefix
 * on some entries), the first non-empty line after the Title/Meta/H1 block is
 * the copy.
 */
function extractCopyParagraphs(lines: string[]): {
  paragraphs: string[];
  links: { text: string; path: string }[];
} {
  const links: { text: string; path: string }[] = [];
  const markerIdx = lines.findIndex(
    (l) =>
      /^SEO copy block:/.test(l) ||
      /^Curated copy:/.test(l) ||
      /^Intro:/.test(l) ||
      /^Body:/.test(l)
  );

  let bodyStartIdx: number;
  let leadingPrefix = "";
  if (markerIdx !== -1) {
    bodyStartIdx = markerIdx + 1;
    // For "Intro:", the rest of the marker line may contain the first paragraph.
    const markerLine = lines[markerIdx];
    const colonIdx = markerLine.indexOf(":");
    if (colonIdx !== -1 && colonIdx < markerLine.length - 1) {
      leadingPrefix = markerLine.slice(colonIdx + 1).trim();
    }
  } else {
    // Fall back: first non-empty line after the H1/Title region.
    const titleIdx = lines.findIndex((l) => /^Title:/.test(l));
    const h1Idx = lines.findIndex((l) => /^H1:/.test(l));
    const afterIdx = Math.max(titleIdx, h1Idx);
    bodyStartIdx = afterIdx + 1;
  }

  // Collect body lines until we hit a stop line.
  const bodyLines: string[] = [];
  if (leadingPrefix) bodyLines.push(leadingPrefix);

  for (let i = bodyStartIdx; i < lines.length; i++) {
    const line = lines[i];
    if (isBodyStopLine(line)) break;
    bodyLines.push(line);
  }

  // Join body lines into a single string, then split into paragraphs on blank
  // lines (\n\n boundaries).
  const bodyText = bodyLines.join("\n");
  const rawParagraphs = bodyText.split(/\n\s*\n/);

  const paragraphs: string[] = [];
  for (let raw of rawParagraphs) {
    // Strip ## heading lines from each paragraph block.
    const linesInPara = raw.split("\n");
    const nonHeading = linesInPara.filter((l) => !/^\s*##\s/.test(l));
    const cleaned = nonHeading
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .join(" ")
      .trim();
    if (cleaned.length === 0) continue;
    // Skip pure-table paragraphs (every line starts with |).
    const allTable = linesInPara
      .filter((l) => l.trim().length > 0)
      .every((l) => /^\s*\|/.test(l));
    if (allTable) continue;
    const { stripped, links: found } = extractLinksAndStripMarkdown(cleaned);
    links.push(...found);
    paragraphs.push(stripped);
  }

  return { paragraphs, links };
}

/**
 * Find the [IMAGE: ...] bracket content and return as imageAlt.
 */
function extractImageAlt(lines: string[]): string {
  for (const line of lines) {
    const m = line.match(/^\[IMAGE:\s*([\s\S]*?)\]\s*$/);
    if (m) return m[1].trim();
  }
  return "";
}

/**
 * Find a "Related searches:" line and split into a list.
 */
function extractRelatedSearches(lines: string[]): string[] {
  for (const line of lines) {
    const m = line.match(/^Related searches:\s*(.*)$/);
    if (m) return splitList(m[1]);
  }
  return [];
}

/**
 * Find a "Related guides:" line and split into a list of paths.
 */
function extractRelatedGuides(lines: string[]): string[] {
  for (const line of lines) {
    const m = line.match(/^Related guides:\s*(.*)$/);
    if (m) return splitList(m[1]);
  }
  return [];
}

/**
 * Parse a single entry chunk into a SeoCopyBlock.
 */
function parseEntry(
  chunk: string,
  defaultType: SeoCopyType
): SeoCopyBlock | null {
  const lines = chunk.split("\n");

  const urlLineIdx = lines.findIndex((l) => /^URL:\s*/.test(l));
  if (urlLineIdx === -1) return null; // not an entry (e.g. file header)

  const parsedUrl = parseUrlLine(lines[urlLineIdx]);
  if (!parsedUrl) return null;

  const { path, fields } = parsedUrl;

  // Determine type:
  // 1. If URL line has a Type: field, use it.
  // 2. Else, infer from the path or file default.
  let type: SeoCopyType = defaultType;
  if (fields.Type) {
    const t = fields.Type.toLowerCase();
    if (
      t === "landing" ||
      t === "animal" ||
      t === "department" ||
      t === "subcategory" ||
      t === "collection" ||
      t === "guide"
    ) {
      type = t as SeoCopyType;
    }
  } else {
    if (path.startsWith("/guides/")) type = "guide";
    else if (path.startsWith("/shop/collections/")) type = "collection";
    else type = defaultType;
  }

  const tmh = findTitleMetaH1(lines);
  if (!tmh) {
    console.warn(`[skip] no Title/Meta/H1 for ${path}`);
    return null;
  }

  const { paragraphs, links } = extractCopyParagraphs(lines);
  const imageAlt = extractImageAlt(lines);
  const relatedSearches = extractRelatedSearches(lines);
  const relatedGuides = extractRelatedGuides(lines);

  // parent / department:
  // - For subcategory entries, both Parent and Department fields are present
  //   in the URL line and contain the human department name.
  // - For collection entries, the URL line has a Parent field that is either
  //   "none" (top-level collection) or a parent collection slug.
  // - For other types, these are absent.
  const parentRaw = fields.Parent;
  const departmentRaw = fields.Department;

  const block: SeoCopyBlock = {
    path,
    type,
    title: tmh.title,
    metaDescription: tmh.metaDescription,
    h1: tmh.h1,
    copyParagraphs: paragraphs,
    links,
    imageAlt,
    relatedSearches,
    relatedGuides,
  };

  if (parentRaw && parentRaw !== "none" && parentRaw.length > 0) {
    block.parent = parentRaw;
  }
  if (departmentRaw && departmentRaw.length > 0) {
    block.department = departmentRaw;
  }

  return block;
}

// ---------------------------------------------------------------------------
// Output module generation
// ---------------------------------------------------------------------------

function generateModule(blocks: SeoCopyBlock[]): string {
  const header = `/**
 * src/lib/shop/seo-copy.ts
 *
 * AUTO-GENERATED by scripts/parse-seo-copy.ts. Do not edit by hand — edit
 * the markdown sources in /home/z/my-project/upload/ and re-run the parser:
 *
 *   bun run scripts/parse-seo-copy.ts
 *
 * Total entries: ${blocks.length}
 *
 * Entry counts by type:
${Object.entries(countByType(blocks))
  .map(
    ([type, count]) =>
      ` *   - ${type}: ${count}`
  )
  .join("\n")}
 */

export type SeoCopyBlock = {
  /** Canonical URL path (e.g. "/shop", "/shop/dog", "/shop/cat/beds-bedding", "/shop/cat/beds-bedding/bolster-cat-beds"). */
  path: string
  /** Page type from the markdown. */
  type:
    | "landing"
    | "animal"
    | "department"
    | "subcategory"
    | "collection"
    | "guide"
  /** Parent department or collection slug (subcategory + collection entries). */
  parent?: string
  /** Department name (subcategory entries). */
  department?: string
  /** SEO <title>. */
  title: string
  /** Meta description. */
  metaDescription: string
  /** H1 heading text (may include "in Memphis, TN" suffix). */
  h1: string
  /** Full SEO copy block — markdown links stripped to plain labels. */
  copyParagraphs: string[]
  /** Internal links extracted from the copy: { text, path }. */
  links: { text: string; path: string }[]
  /** Image alt text (the bracketed [IMAGE: ...] description). */
  imageAlt: string
  /** Related search phrases. */
  relatedSearches: string[]
  /** Related guide paths (e.g. "/guides/bed-buying-by-sleep-style"). */
  relatedGuides: string[]
}

export const SHOP_SEO_COPY: SeoCopyBlock[] = `;

  const body = JSON.stringify(blocks, null, 2) + "\n";

  const footer = `
export function findSeoCopy(path: string): SeoCopyBlock | null {
  return SHOP_SEO_COPY.find((entry) => entry.path === path) ?? null
}
`;

  return header + body + footer;
}

function countByType(blocks: SeoCopyBlock[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const b of blocks) {
    counts[b.type] = (counts[b.type] ?? 0) + 1;
  }
  // Sort by type name for stable output.
  const sorted: Record<string, number> = {};
  for (const k of Object.keys(counts).sort()) sorted[k] = counts[k];
  return sorted;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const all: SeoCopyBlock[] = [];
  let totalSkipped = 0;

  for (const file of FILES) {
    const content = readFileSync(join(UPLOAD_DIR, file.name), "utf8");
    const chunks = splitEntries(content);
    let fileParsed = 0;
    for (const chunk of chunks) {
      const parsed = parseEntry(chunk, file.defaultType);
      if (parsed) {
        all.push(parsed);
        fileParsed++;
      } else {
        totalSkipped++;
      }
    }
    console.log(
      `  ${file.name}: ${fileParsed} parsed (${chunks.length} chunks)`
    );
  }

  // Sort entries: by path for a stable, findable order.
  all.sort((a, b) => {
    if (a.path < b.path) return -1;
    if (a.path > b.path) return 1;
    return 0;
  });

  const output = generateModule(all);
  mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
  writeFileSync(OUTPUT_FILE, output, "utf8");

  console.log("");
  console.log(
    `Wrote ${all.length} entries to ${OUTPUT_FILE} (${totalSkipped} chunks skipped — file headers + non-entry blocks).`
  );
  console.log("");
  console.log("Counts by type:");
  for (const [type, count] of Object.entries(countByType(all))) {
    console.log(`  ${type}: ${count}`);
  }
}

main();
