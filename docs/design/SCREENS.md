# Screens v1: the visual baseline

`screens-v1.html` is the Claude Design export of _xd-memories Screens_ (turn 1, responsive web +
PWA). It runs offline: open it in a browser. It's a reference, not code. Nothing in `apps/web`
imports it. This file is the part to read: tokens, screen inventory, and the phase that ships each
screen.

## Style tokens

Warm paper neutrals, one ink colour, and colour used only for the media-type dot.

| Role                   | Value     | Notes                                                      |
| ---------------------- | --------- | ---------------------------------------------------------- |
| Page background        | `#F7F5F1` | paper                                                      |
| Raised surface (cards) | `#FCFBF8` |                                                            |
| Sidebar / sunken       | `#F1EEE8` | hover `#E7E3DB`                                            |
| Subtle fill            | `#ECE8E1` | also `#EEEAE3`, `#E6E1D8`: fold into one                   |
| Divider                | `#E2DDD4` |                                                            |
| Border                 | `#D6D0C5` | chips, inputs; strong border `#CFC8BC`                     |
| Disabled / placeholder | `#BDB5A8` | `#A9A196`, `#8C857A` for decorative only                   |
| Muted text             | `#5E5A53` | the most used colour: metadata, counts                     |
| Secondary ink          | `#3F3B35` |                                                            |
| Ink (text, primary UI) | `#1C1B19` | selected nav and primary buttons are ink-on-paper inverted |

**Media types**: a 9px dot, always next to a text label (never colour alone, never coloured text).
Same lightness and chroma, so no type shouts:

| Movies                | Series                 | Books                  | Music                  |
| --------------------- | ---------------------- | ---------------------- | ---------------------- |
| `oklch(0.62 0.13 35)` | `oklch(0.62 0.13 250)` | `oklch(0.62 0.13 150)` | `oklch(0.62 0.13 320)` |

**Type**: three families, all open-licence:

- **Newsreader** (serif, 400, italic for the wordmark): page titles and work titles. 30px page
  title desktop, 32px mobile, 46px title-detail hero, 52px marketing line.
- **Geist** (sans): UI and body. 15px/600 section headings, 13–14px body, 11–12px small.
- **Geist Mono**: counts, years, steps, metadata, sources (the 11–12px tabular bits).

**Shape**: pills `999px` (chips, filters, status); cards `8–10px`; small tags `3–4px`; nav items `7px`.
Shadow only on floating frames: `0 12px 40px rgba(40,30,20,.12)`.

**Layout**: desktop 1280 with a 232px sidebar (wordmark, nav with counts, media list); mobile 390
with a 5-tab bottom bar (For you · Browse · Library · Journey · Ask), 48px touch targets.

**Not in the design**: dark mode. The app already ships light/dark (3.15), so the dark values are
derived (same hues, inverted lightness) and checked for contrast, not invented per screen.

## Screen inventory

| Screen                    | Phase(s)          | Before the LLM? | What it needs                                                        |
| ------------------------- | ----------------- | --------------- | -------------------------------------------------------------------- |
| 1a For you (desktop)      | 3 · 4 · 5 · 7 · 8 | yes             | Continue (entries) · sync nudge (4) · next in sagas (5) · groups (7) |
| 1b Browse · Books         | 2 (+6)            | yes             | per-media filters, "in my library", community label (6)              |
| 1c Title detail + related | 2 · 3 · 5 · 7     | yes             | sources, status, rating, dates, highlight · saga (5) · related (7)   |
| 1d Author reading order   | 5                 | yes             | named orderings, global step number, provenance + votes              |
| 1e Ask                    | 9                 | **no**          | clarifying question, cited picks, "how this answer was built"        |
| 1f Journey                | 10                | yes (see below) | threads over time from entries + orderings                           |
| 1g Platform sync + review | 4                 | yes             | importers, match review queue, bulk confirm                          |
| 1h Mobile · For you       | 3 · 8             | yes             | as 1a                                                                |
| 1i Mobile · Library       | 3                 | yes             | media chips, status tabs with counts, rating + highlight per row     |
| 1j Mobile · New entry     | 6                 | yes             | community work form, new creator, duplicate check                    |
| 1k Mobile · Ask           | 9                 | **no**          | as 1e                                                                |

Only Ask (1e, 1k) needs a model. Everything else is deterministic, which the design itself states:
"Home mixes three deterministic sources … before any model is involved."

## Where the app differs from the screens (as of #40)

The screens are the target, not a description of what's shipped. Each difference below is owned by
a 3.2x task or is a decision to make:

| In the app now                                                           | In screens v1                                                                    | Resolved by                                                                                                                                                                         |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Terra theme, system font; selected state in `--xd-color-primary` (terra) | Paper neutrals; selected state is ink `#1C1B19` (inverted nav, ink buttons)      | 3.20, 3.21: the theme's primary is ink, so `.media` tabs etc. follow without CSS changes                                                                                            |
| Media labelled **Albums** (`/catalog/albums`, type `album`)              | **Music**                                                                        | Decided (Open Question 13): "Music" for the section and nav, "Album" for the item; renamed in 3.23                                                                                  |
| Catalog media as underline tabs above the search (3.18)                  | Desktop: media list in the sidebar (1b). Mobile: pill chips (1i)                 | 3.23: on desktop the sidebar replaces the tabs; on a phone they become chips. `mediaLinks` stays the source of both                                                                 |
| Results as a card list with the title only (`resultLabel`)               | Cover grid with title, creator · year, the status if in library, community label | 3.25 (covers); community label in Phase 6                                                                                                                                           |
| "Add as" + Want · In progress · Done, one tap each (3.18)                | A single "+ Add" (1b) or "+ Want" (1h, 1d); status chosen on the title page      | Keep the one-tap group: it's tested and needs no extra page. The design's "+ Want" is the same group with only Want shown, for later screens where want is the only sensible status |
| `doing` labelled **In progress**                                         | **Reading** on a book (presumably Watching / Listening for the others)           | 3.22: per-media verb as a display label; "In progress" stays where the media is mixed (library "Active" tab)                                                                        |
| No cover on `CatalogItem`                                                | Covers on 1b, 1c, 1i, 1j                                                         | 3.25                                                                                                                                                                                |

## Gaps the screens open

- **Dropped status.** 1c and 1i show Want · Reading · Done · **Dropped**. Decided (Open
  Question 11): a domain status since 3.27.
- **Per-media verbs.** "Reading" for books, presumably "Watching" and "Listening" for the others:
  a display label over `doing`, not a new status. Today all media show "In progress".
- **Sync in the nav** with a review count (desktop only); Browse is a mobile tab but on desktop it
  is the media list.
