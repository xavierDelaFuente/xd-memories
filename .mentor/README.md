# .mentor — Development Mentor System

A portable context system. Four files, no tooling, works in any Claude session.

```
.mentor/
├── README.md        ← you are here (loader + how to use)
├── MENTOR_CODEX.md  ← universal rules (same in every repo)
├── PROJECT.md       ← this repo's state (different per repo)
└── ALTERNATIVES.md  ← unproven overrides only; entries graduate into the CODEX and are deleted
```

---

## How to start a session

Paste this, then paste the three files:

```
You are my development mentor. Three files follow.

MENTOR_CODEX = binding rules. Follow the Session Protocol in it exactly.
PROJECT      = where this repo currently stands.
ALTERNATIVES = decisions where I overrode the CODEX. These win over the CODEX.

Read all three, then give me the Session Opening from the protocol.
Do not write code until I confirm.

--- MENTOR_CODEX.md ---
[paste]

--- PROJECT.md ---
[paste]

--- ALTERNATIVES.md ---
[paste]
```

**Shortcut:** if you only need a quick answer, paste MENTOR_CODEX + ALTERNATIVES and skip PROJECT.

---

## How to close a session

Ask:

```
Close the session. Give me:
1. The PROJECT.md diff (current state, next step)
2. An ALTERNATIVES.md entry if I overrode the CODEX and the override is still unproven
3. Any decision that has now proven itself — fold it into MENTOR_CODEX and delete its ALTERNATIVES entry
```

Then paste the results into the files and commit:

```bash
git add .mentor/
git commit -m "docs(mentor): update after <phase>"
```

---

## How to start a NEW project

```bash
mkdir -p new-project/.mentor
cp xd-components/.mentor/MENTOR_CODEX.md  new-project/.mentor/
cp xd-components/.mentor/ALTERNATIVES.md  new-project/.mentor/
cp xd-components/.mentor/README.md        new-project/.mentor/
# then write a fresh PROJECT.md from the template below
```

MENTOR_CODEX carries over untouched — that is the whole point. Everything you learned in the last
repo is already in it. Copy ALTERNATIVES.md too, but it should be near-empty: anything proven has
already graduated into the CODEX. Only PROJECT.md is genuinely new.

### PROJECT.md template

```markdown
# PROJECT — <name>

**Type**: <library | app | monorepo | docs site | micro frontend | CLI>
**Status**: <phase> of <total>
**Repo**: <url>
**Local**: <path>

## Stack
<language, framework, package manager, test runner, build, styling, CI, deploy>

## Architecture Decisions
| Decision | Choice | Why |
|---|---|---|

## Constraints
<anything that limits choices: browser support, bundle budget, team size, deadline>

## Phases
- [x] <phase 1> — <one line on what shipped>
- [ ] <phase 2> — <what it covers>

## Current State
**Done**: <what exists and works>
**In progress**: <what you are mid-way through>
**Next**: <the immediate next step>

## Open Questions
<things you have not decided yet>
```

---

## Maintenance rules

- **MENTOR_CODEX** grows when a decision proves itself in practice — working, with reasoning that
  generalises. No project-count gate. That is the file that carries learning between repos.
- **PROJECT.md** changes every phase. Keep it under ~150 lines; it is state, not history.
- **ALTERNATIVES.md** holds only *unproven* overrides. When one graduates into the CODEX, delete
  its entry. A reversed decision gets a fresh entry saying so. The file starts empty in a new repo.
- Everything is committed. `git log .mentor/` is the story of how you learned.
