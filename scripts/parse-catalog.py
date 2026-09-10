#!/usr/bin/env python3
"""
Parse the Learning Catalog markdown and extract every module + sub-module
for each detailed pathway (LSH, GRM, TEC).

The catalog format per pathway:
  - Level header: "100 level Foundation" ... "Module    Title    Capstone / primary evidence"
  - Module rows: "  LSH-101   Title text    Capstone evidence"
  - Some titles wrap to a continuation line.

Also extracts the M01-M10 sub-module detail section:
  - "GRM-101 through GRM-405 Module" header
  - Rows: "  GRM-101   M01 text; M02 text; ... M10 text"

Outputs JSON per pathway with modules + sub-module content.
"""
import re
import json
import sys

with open("/tmp/catalog.md", "r") as f:
    text = f.read()
lines = text.split("\n")

# Find pathway section boundaries (bold: **CODE: Title**)
sections = []
for i, line in enumerate(lines):
    m = re.match(r"^\*\*([A-Z]{3}):\s+(.+?)\*\*$", line.strip())
    if m:
        sections.append((m.group(1), m.group(2).strip(), i))

def find_next_section(start):
    for _, _, s in sections:
        if s > start:
            return s
    return len(lines)

def parse_modules(section_lines, code):
    """Parse module rows like '  CODE-101   Title    Capstone evidence'"""
    modules = []
    current = None
    for line in section_lines:
        # Match: optional spaces, CODE-NNN, 2+ spaces, then title (may have trailing capstone)
        m = re.match(rf"^\s+{code}-(\d)\d{{2}}\s{{2,}}(.+)$", line.rstrip())
        if m:
            if current:
                modules.append(current)
            level_digit = int(m.group(1))
            # Split the rest on 2+ spaces to separate title from capstone
            rest = m.group(2)
            chunks = re.split(r"\s{2,}", rest.strip())
            # The line might just be the title (capstone on next line)
            current = {
                "code_line": line.strip(),
                "level_digit": level_digit,
                "title": chunks[0].strip() if chunks else rest.strip(),
                "capstone": chunks[1].strip() if len(chunks) > 1 else "",
            }
        elif current and line.strip() and not re.match(r"^\s+(Level|Module|Component|Foundation|Core|Advanced|Capstone|100|200|300|400)", line):
            # Continuation — could be wrapped title or capstone
            stripped = line.strip()
            # If current has no capstone yet, this might be it
            chunks = re.split(r"\s{2,}", stripped)
            if not current["capstone"] and len(chunks) == 1:
                # Could be title continuation OR capstone on its own
                current["capstone"] = stripped
            elif len(chunks) >= 2:
                # title continuation + capstone
                current["title"] = current["title"] + " " + chunks[0]
                current["capstone"] = chunks[1] if len(chunks) > 1 else current["capstone"]
            else:
                current["title"] = current["title"] + " " + stripped
    if current:
        modules.append(current)
    return modules

def parse_submodules(section_lines, code):
    """Parse M01-M10 sub-module detail rows."""
    subs = {}
    for line in section_lines:
        m = re.match(rf"^\s+{code}-(\d{{3}})\s+(.+)$", line.rstrip())
        if m:
            mod_code = f"{code}-{m.group(1)}"
            text = m.group(2).strip()
            # Split on "; " to get M01-M10 items
            items = [x.strip() for x in text.split(";") if x.strip()]
            if mod_code not in subs:
                subs[mod_code] = []
            subs[mod_code].extend(items)
    return subs

pathways = {}
for code, title, start in sections:
    end = find_next_section(start)
    section = lines[start:end]
    
    # Parse module tables
    modules = parse_modules(section, code)
    
    # Also look for sub-module detail (M01-M10)
    # This appears in a section like "GRM-101 through GRM-405 Module"
    subs = parse_submodules(section, code)
    
    level_names = {1: "Foundation", 2: "Core", 3: "Advanced", 4: "Capstone"}
    parsed = []
    seen_codes = set()
    for mod in modules:
        # Extract code from the line
        cm = re.search(rf"({code}-\d{{3}})", mod["code_line"])
        if not cm:
            continue
        full_code = cm.group(1)
        if full_code in seen_codes:
            continue
        seen_codes.add(full_code)
        level_digit = mod["level_digit"]
        parsed.append({
            "code": full_code,
            "title": mod["title"],
            "capstone": mod["capstone"],
            "level": level_digit * 100,
            "levelName": level_names.get(level_digit, "Foundation"),
            "submodules": subs.get(full_code, []),
        })
    
    pathways[code] = {"title": title, "modules": parsed}

# Print summary + JSON
for code, data in pathways.items():
    print(f"{code}: {data['title']} — {len(data['modules'])} modules, {sum(len(m['submodules']) for m in data['modules'])} sub-items", file=sys.stderr)

print(json.dumps(pathways, indent=2))
