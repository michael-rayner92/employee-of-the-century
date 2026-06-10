---
name: rules-check
description: Check that a given file or directory complies with this repository's rule files (.claude/rules/*.md). Use when the user asks to review, audit, or lint code against the repo's stated conventions.
argument-hint: <file-or-directory-path>
---

# 🔍 Rules check — review against repository rules

Check that the target file or directory complies with every applicable rule file in this repository, and report any violations.

## 🎯 Resolve the target

The argument (`$ARGUMENTS`) is a file or directory path, relative to the repo root.

- If it's a file, review just that file.
- If it's a directory, review every file under it (recursively), excluding `.git/`.
- If no argument is given, ask the user which path to review — do not assume the whole repo.

## 📜 Load the rules

1. Read every rule file in `.claude/rules/` and note each file's `paths` frontmatter globs.
2. Also read `.claude/CLAUDE.md` for repo-wide constraints (layering, load order, domain invariants).
3. Match each target file against the rule globs to build the checklist that applies to it — e.g. a `.js` file is checked against the JavaScript rules, a `.css` file against the CSS rules. Files matching no rule globs are skipped (note them as "no rules apply").

## ✅ Review each file

For each target file, read it in full and check it against every rule in its applicable rule files. Judge against what the rule actually says — do not invent extra conventions that are not written down. When a rule is subjective (e.g. "comments explain why"), only flag clear violations, not borderline cases.

Pay particular attention to the repo's hard invariants from CLAUDE.md when reviewing JavaScript (vote percentages summing to exactly 100, the snapshot→mutate→applyTrends bracket, `Utils` staying domain/DOM-free, shared logic living in `democracyApi`).

## 📋 Report

Present the findings as a compliance report:

- **Lead with the verdict**: fully compliant, or N violations across M files.
- For each violation, give the file and line as a clickable reference (`file.js:42`), the rule file and rule being violated, and a one-line description with the suggested fix.
- Group findings by file. Omit files with no findings except for a summary count of files checked.
- **Do not modify any files.** This skill only reports. Offer to fix the violations as a follow-up, and only apply fixes if the user asks.
