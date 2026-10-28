# ReviewLens redesign

A visual redesign of every screen. Features, data, API behavior, auth, limits and analysis stay exactly as they are.

## Intent

The old look was dark (it followed the device's dark mode) and green everywhere. The new look is bright, calm and approachable: a warm white page, white cards, dark readable text, and green only where it means something (primary actions, links, selected states, small highlights, positive sentiment). Inspiration: the Refero "Duolingo" style board (white paper canvas, chubby rounded headings, 12px rounded controls with 2px borders that feel pressed onto the page), adapted for a professional analytics tool. ReviewLens keeps its own identity: the Philippine eagle icon, never Duolingo's owl, name or art.

Anti-goals: large green backgrounds, a dark default theme, gradients, glass, decorative clutter, a children's-app feel, invented insights.

## Tokens (src/app/globals.css)

| Role | Value | Notes |
| --- | --- | --- |
| Page | `#fdfbf7` | warm white canvas |
| Surface | `#ffffff` | cards, inputs |
| Surface 2 | `#f7f4ee` | table headers, hovers, tracks |
| Ink / ink 2 / ink 3 | `#23211d` / `#57524a` / `#6b655b` | 15.6, 7.5, 5.6:1 on the page |
| Line / line strong | `#ebe5db` / `#ded6c9` | card and control borders (decorative) |
| Field | `#8f887c` | input and checkbox borders, 3.4:1 (WCAG 1.4.11) |
| Brand / hover / edge | `#1e8443` / `#187339` / `#125a2c` | primary fill (white text 4.7:1), pressed edge |
| Brand ink / soft | `#17703a` / `#e7f3e9` | links and selected text (6:1), selected fills |
| Positive / neutral / negative | `#176e3c` / `#bdb5a7` / `#e5732f` | chart marks; validated with the dataviz palette script (CVD ΔE 11.6, normal-vision ΔE 17.4); neutral is a gray midpoint and is always labeled |
| Sentiment text | `#176e3c` / `#5a554c` / `#a3461b` | on their soft fills, 5.2 to 6.4:1 |

No dark theme: the app is light on every device (`color-scheme: light`).

Type: **Nunito** (rounded, 700 to 900) for headings, numbers and buttons; **Nunito Sans** for body, forms and tables, with tabular figures for data. Both load through `next/font/google`, so nothing is fetched from Google at runtime. Sentence case everywhere; no all-caps labels.

Shape: controls 12px radius with a 2px border and a 3px bottom edge that compresses on press; cards 20px radius, 1.5px warm border, no shadow; shadows only on floating things (menus, dialogs, toasts).

## Components

Buttons (primary, secondary, ghost, danger; sm and md, 44px+ targets), cards, notices, status and mode badges, empty states with the eagle, skeletons, segmented tabs, account menu, footer.

## Screens

- **Shell:** white sticky header with the eagle tile and wordmark, the account menu, and a quiet footer with the SPUP seal and a "student project, not an official SPUP service" note.
- **Account screens:** two columns on wide screens (a warm panel with the eagle and what ReviewLens does; the form card); one column on phones.
- **Uploads:** list of upload cards with status, mode, row counts and a labeled sentiment bar; a friendly empty state.
- **Upload wizard:** a numbered stepper (file, columns, preview and import), a large drop zone, clear errors.
- **Analysis progress:** progress bar with counts, paused, failed and finished states.
- **Overview:** filters in one row; summary tiles (reviews analyzed, how customers feel, average rating); what customers mention most; needs attention (topics with the most negative mentions, reviews to read first); how sure the labels are; sentiment over time only when the file has dates; words that stand out; label check.
- **Reviews, issues, report:** restyled with the same parts. Report stays printable.

## Charts

Bars for comparisons, a stacked bar for sentiment shares (labeled, with icons and counts), a line chart only for real dates. Every chart has a title, labels, a one-line text summary and a table view. Sentiment is never color alone: every mark sits next to its word, icon and number; the timeline also uses dash patterns. Only numbers that come from the upload are shown.

## Motion and accessibility

Motion only for feedback: button press (100 ms), menu and dialog open (150 ms), progress. `prefers-reduced-motion` turns it off. Visible 2px focus rings, skip link, labeled controls, 44px touch targets, no horizontal scrolling at 320px, WCAG 2.2 AA contrast.

## Brand assets

- `public/brand/reviewlens-eagle.png`, `src/app/icon.png`, `src/app/apple-icon.png`, `src/app/favicon.ico`, `public/icons/*`: resized copies of the provided eagle artwork, unaltered.
- `src/app/manifest.ts`: name, colors and icons so the app can be added to a phone's home screen.
- `public/brand/spup-seal.png`: the official seal from spup.edu.ph, unaltered, shown small.
