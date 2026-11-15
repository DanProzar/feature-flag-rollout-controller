---
name: feature-spec
description: Start the next roadmap phase by creating a feature branch and a dated spec directory under specs/ containing plan.md, requirements.md and validation.md, after interviewing the user with AskUserQuestion. Use this whenever the user wants to start, plan, spec out or kick off the next phase, feature or roadmap item — e.g. "let's start phase 2", "spec the next feature", "what's next on the roadmap, let's plan it", "write the feature spec" — even if they don't say "spec" explicitly.
argument-hint: "[phase or feature name]"
---

# Feature spec

Turn the next phase of `specs/roadmap.md` into a branch and a reviewed spec, so implementation can
start from agreed scope instead of guesses. If `$ARGUMENTS` names a phase or feature, use that
instead of the next one.

## 1. Gather context

1. Read `specs/roadmap.md` and pick the first phase not marked `✅ Complete` (or the one named in
   `$ARGUMENTS`). Note its title and item numbers.
2. Read `specs/mission.md` and `specs/tech-stack.md` — the spec must stay consistent with the
   mission's principles and the chosen stack.
3. Skim the most recent `specs/YYYY-MM-DD-*/` directory to match its tone, structure and level of
   detail, and to see what earlier phases already delivered.
4. Check `git status` and `git branch --show-current`. If there are uncommitted changes, tell the
   user before branching.

## 2. Create the branch

Create `feature/<feature-name>` from an up-to-date `main`, where `<feature-name>` is a short
kebab-case slug of the phase (e.g. `phase-2-persistence`). If the branch already exists, ask the
user whether to reuse it rather than overwrite anything.

## 3. Interview the user — before writing anything

Use the **AskUserQuestion** tool, with questions grouped around the three files you are about to
write. Nothing goes to disk until the user has answered: the spec captures *their* decisions, and
writing first tends to anchor them on your guesses.

- **Plan** — how to slice the work into task groups, ordering, test-first or not, commit granularity.
- **Requirements** — scope boundaries (what's in/out), open design decisions the roadmap leaves
  ambiguous, library or API choices, data shapes.
- **Validation** — what proves the phase is done: required checks/commands, coverage targets,
  specific tests, manual verification, merge criteria.

Ask about real open questions you found while reading the roadmap and mission — offer concrete
options with a recommended default first, not generic "anything else?" prompts. Ask follow-ups if
an answer opens a new question.

## 4. Write the spec

Create `specs/YYYY-MM-DD-<feature-name>/` using today's date, containing:

### `requirements.md` — scope, decisions, context
- Title `# <Phase title>: Requirements`, then the branch name and the roadmap phase/items covered.
- **Context**: why this phase now, what earlier phases delivered, how it ties to the mission.
- **Scope**: what will be built, concretely (files, types, endpoints, behaviours).
- **Out of scope**: what is deliberately deferred.
- **Decisions**: each decision from the interview, with its reasoning.

### `plan.md` — numbered task groups
- Title `# <Phase title>: Plan`.
- A series of `## N. <Group name>` sections, each with numbered steps. Reference roadmap item
  numbers where relevant. Each group should end in a working, committable state.

### `validation.md` — how to know it can be merged
- Title `# <Phase title>: Validation`.
- Exact commands to run and their expected result, required tests as a `- [ ]` checklist, and any
  manual checks. Every item should be objectively checkable.

## 5. Finish

Summarise the branch name, the spec directory and the key decisions, and ask the user to review the
files. Don't start implementing and don't commit unless the user asks.
