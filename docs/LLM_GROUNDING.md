# LLM grounding

CODEX Part 2, Non-deterministic components applies in full. This file is how.

## Shape

`Recommender` port in `packages/domain`. Adapters: `GroqRecommender`, `OllamaRecommender`,
`HeuristicRecommender` (Phase 8 ranker — also the fallback when the model is throttled or down).

## Tools the model may call

| Tool                              | Returns                                                | Computed by              |
| --------------------------------- | ------------------------------------------------------ | ------------------------ |
| `get_profile()`                   | library summary, ratings, highlights, current progress | db + domain              |
| `get_ordering(seriesId)`          | named orderings + user position → spoiler horizon      | domain                   |
| `find_candidates(workId, facets)` | candidates from groups, tags, co-consumption, with `n` | domain                   |
| `rank(candidates, profile)`       | ordered list with score components                     | domain — never the model |
| `search_catalog(query, type)`     | works from catalog/cache                               | sources                  |

## Rules

- The model asks at most one clarifying question, then answers.
- Output is a closed schema: `{ picks: [{ workId, reasons: [{ text, citation }] }] }`.
  A `workId` not returned by a tool, or a reason without a citation, is dropped before render.
- No grounding data → "I don't have enough to go on yet", produced by code.
- Spoiler horizon from `get_ordering` is enforced in code on descriptions sent to the model.
- Prompts are versioned files. A prompt or model change runs the eval suite.
- Record tokens and p95 per call from day one.
