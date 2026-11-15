---
name: changelog
description: Create or update CHANGELOG.md in the project root with date-headed bullet entries. Bootstraps the file from git history if it doesn't exist; otherwise adds entries for the current branch's changes. Run manually before merging a branch.
disable-model-invocation: true
argument-hint: "[base-branch]"
allowed-tools: Bash(git log:*), Bash(git diff:*), Bash(git status:*), Bash(git branch:*), Bash(git rev-parse:*), Bash(git merge-base:*), Bash(git add CHANGELOG.md), Bash(git commit:*), Read, Edit, Write
---

# Changelog

Maintain `CHANGELOG.md` at the repository root. The base branch is `$ARGUMENTS` if given, otherwise `main`.

## Format

```markdown
# Changelog

## 2026-11-15

- Adopted shadcn/ui on Tailwind CSS v4 as the UI framework
- Fixed hydration warning caused by browser-extension body attributes

## 2026-11-14

- Scaffolded Next.js + TypeScript project
- Added Dockerfile and Docker Compose setup
```

- One `## YYYY-MM-DD` heading per date, newest first. Never two headings for the same date.
- Bullets are short, past-tense, human-readable descriptions of what changed — not raw commit subjects. Drop conventional-commit prefixes (`feat:`, `fix:`, `docs:`), start with a capital letter, no trailing period.
- One bullet per meaningful change. Merge several commits that describe the same change into one bullet.
- Skip noise: merge commits, changelog updates, pure formatting/lint fixes, typo fixes, and "WIP"/"fixup" commits.
- Order bullets within a date by importance: features, then fixes, then docs/chores.

## Mode 1: Bootstrap (no CHANGELOG.md exists)

1. Get the full history of the base branch, excluding merges:
   `git log <base> --no-merges --date=short --format='%ad%x09%h%x09%s'`
2. Group commits by date (author date).
3. Write `CHANGELOG.md` with a `# Changelog` title and one section per date, following the format above. Use `git show --stat <hash>` on any commit whose subject is too vague to describe ("first commit", "updates").
4. Continue to Mode 2 if the current branch is not the base branch and has unmerged commits; otherwise stop at step "Finish".

## Mode 2: Pre-merge update (CHANGELOG.md exists)

1. Confirm the current branch with `git branch --show-current`. If it is the base branch, tell the user and stop — this mode is for feature branches.
2. List the branch's own commits:
   `git log <base>..HEAD --no-merges --date=short --format='%h%x09%s%n%b'`
   Also check `git status` — mention uncommitted changes to the user, but don't log them.
3. If there are no commits, say so and stop.
4. Read `CHANGELOG.md`. Skip any change that already has a bullet (e.g. the skill ran earlier on this branch).
5. Add the new bullets under a heading for **today's date** (the merge date — the changelog records when changes landed on the base branch). If today's heading exists, append to it; otherwise insert a new heading directly below `# Changelog`.

## Finish

1. Show the user the added section(s).
2. Stage and commit only the changelog:
   `git add CHANGELOG.md` then commit with message `docs: update changelog` (or `docs: add changelog` when bootstrapping).
   Do not stage any other files. Do not push.
