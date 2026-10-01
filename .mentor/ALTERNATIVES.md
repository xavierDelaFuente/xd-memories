# ALTERNATIVES

Where a project overrode MENTOR_CODEX and the override has **not yet** graduated into the CODEX.
While an entry is here, it beats the CODEX.

An entry lives here only as long as it is unproven. Once a decision has proven itself in
practice — working, with reasoning that generalises — it moves into MENTOR_CODEX (Part 2/3) and
its entry is **deleted** from this file. A reversed decision gets a fresh entry saying so.

---

## Entry format

```
### <date> · <project> · <topic>
**CODEX said**: <one line>
**I did**: <one line>
**Because**: <one or two lines>
**Verdict**: <working | mixed | reverted — filled in later>
**Generalise**: <when this should apply again, or "one-off">
```

---

## Entries

### 2026-10-01 · xd-memories · Job execution on a €0 budget (gap filled)
**CODEX said**: nothing — no rule for where background jobs run.
**I did**: `jobs` table in Postgres (idempotent, resumable); `apps/worker` runs as a GitHub Actions job started by `workflow_dispatch` when a user asks for a sync.
**Because**: Free always-on workers barely exist; syncs are user-triggered, so ~30 s start latency is acceptable. Public repo → unlimited minutes.
**Verdict**: pending — Phase 4
**Generalise**: any user-triggered, minutes-long job in a €0 project; not for anything needing sub-second start

### 2026-10-01 · xd-memories · User-generated catalog data (gap filled)
**CODEX said**: External data rules cover third-party sources; nothing on data users create.
**I did**: Treat users as one more source: same schema validation, `source = 'community'`, provenance per field, append-only edit history, duplicate check before public.
**Because**: Community rows are as untrusted as an API response, and edits must be reversible.
**Verdict**: pending — Phase 6
**Generalise**: any app where users contribute shared records

### 2026-10-01 · xd-memories · Entity matching with a human queue (gap filled)
**CODEX said**: nothing on reconciling records from different sources.
**I did**: Matching is a pure domain scorer with fixture-driven tests; scores below a threshold go to a review queue, never auto-merge.
**Because**: A wrong merge silently corrupts a library; a review item costs one tap.
**Verdict**: pending — Phase 4
**Generalise**: any import that maps free-text rows onto canonical records

---

## Cross-project observations

**Styling by project type** — _pending: xd-memories starts on the CODEX Tailwind default_
**Testing depth by scale** — _pending second project_
**Monorepo vs single package, in hindsight** — _xd-tactics and xd-memories both landed on apps/+packages/ via the deployable-units tree_
