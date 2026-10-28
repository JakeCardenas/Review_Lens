# ReviewLens redesign: Refero "Duolingo" style

A visual redesign of every screen, following the Refero "Duolingo" style board (https://styles.refero.design/style/7088d695-362b-4e09-b325-fa8136d4f350). Features, data, API behavior, auth, limits and analysis are unchanged.

## Intent

White paper canvas, chubby rounded headings, one saturated green for progress and primary actions, Spark Blue for links and secondary actions, calm gray body text, and 12px controls with 2px borders and a solid bottom lip, like stickers pressed onto the page. ReviewLens keeps its own identity: its own square logo and green eagle mark, never Duolingo's name, wordmark, owl, illustrations or game features (no XP, hearts, streaks or leaderboards).

## Colors (src/app/globals.css)

| Refero token | Value | Used for |
| --- | --- | --- |
| Paper White | `#ffffff` | page and card surfaces |
| Eager Green | `#58cc02` | primary button fills, progress meters, positive sentiment, footer band, wordmark |
| Storybook Green | `#d7ffb8` | soft washes behind positive and success tags |
| Fresh Leaf | `#a5ed6e` | outlines of green tags and success notices |
| Spark Blue | `#1cb0f6` | selected tabs and pills (2px outline), blue accents |
| Night Ink | `#000437` | labels on green buttons, negative sentiment, footer text |
| Charcoal | `#4b4b4b` | headings and primary text |
| Pencil Gray | `#777777` | body text (see below), medium confidence |
| Faded Gray | `#afafaf` | outlined button and pill borders, neutral sentiment, low confidence |

Readable text: where a Refero color would carry small text and fall below WCAG AA, a same-hue shade is used for the text only. Green text `#377e01` (big green headings `#49a902`, 3:1 for large text), blue links and secondary labels `#1274a2`, body gray `#717171` (Pencil Gray is 4.48:1, just under 4.5:1). Labels on Eager Green buttons are Night Ink (9.4:1; white would be 2.1:1). Input borders are `#949494` (3:1). Fills, bars, borders and washes use the exact Refero values.

Charts: sentiment uses Eager Green, Faded Gray and Night Ink (validated with the dataviz palette script: color-blind ΔE 14.4, normal-vision ΔE 22.9); confidence uses Faded Gray, Pencil Gray and Charcoal as an ordered light-to-dark ramp. Every chart has text values, icons and a table view; the timeline also uses dash patterns.

## Type

Nunito Black for large headings (64 and 48px, -0.02em), Nunito Sans for everything else: 32px small headings, 19px subheadings, 17px body at weight 500, 15px uppercase navigation and buttons with 0.053em tracking, 13px captions. Both load through `next/font/google`. Sentence case everywhere except navigation, buttons and tags.

## Shapes and layout

12px controls with 2px borders; primary and secondary buttons have a 4px or 3px lip that disappears on press; link cards ("stickers") have a 2px border with a 4px bottom edge; cards 16px radius with 2px `#e5e5e5` borders; thick 16px progress meters with a highlight strip. No gradients, glass or blurred shadows. Content max width 1200px. A full-width Eager Green footer band.

## Screens

Header (eagle mark, green wordmark, Upload reviews, account pill), account screens (eagle mark beside the form), upload wizard, analysis progress, upload pages, and the empty, loading, error and not-found states.

Every upload follows one four-step path, Upload → Match columns → Analyze → Insights (`src/components/journey-path.tsx`, steps in `src/lib/journey.ts`): done steps are filled green with a check, the current step is ringed, later steps are outlined, and the words say the same for screen readers. The home page, the wizard, analysis progress, an unfinished import and an unfinished analysis all show it, next to the one action that moves the upload forward.

Home (`src/app/page.tsx`):
- No uploads: a short welcome, one Upload reviews button, the four steps explained, and a sample CSV. No empty charts.
- Latest upload: its name, file, status and mode, the path, and the next action (Upload again, Continue analysis, or the review count, one sentiment bar with labels, and See insights).
- Earlier uploads as sticker rows; on phones the status sits under the name.

Upload overview (`src/app/uploads/[id]/page.tsx`): reviews analyzed, one labeled positive/neutral/negative bar, the top 3 topics, up to 3 reviews that need attention (only when there are negative reviews), and links to all reviews, topics, the accuracy check and the report. Every number comes from the upload; nothing is estimated.

Detail pages, as tabs (a bottom bar on phones): Overview, Reviews (search, filters, details, CSV exports), Topics (every topic, the timeline when the file has dates, standout words, with filters), Accuracy (label or rating check, disagreements, confidence) and Report (printable summary and exports). Data issues is linked from where it matters.

## Brand assets

- Square logo ("Magnifying Bird Mascot Icon"), for the browser and home screen only, resized and never cropped or recolored: `src/app/favicon.ico` (16, 32 and 48px), `src/app/icon.png` (192px), `src/app/apple-icon.png` (180px), and `public/icons/icon-192.png` and `icon-512.png` for `src/app/manifest.ts`. The manifest lists plain icons only; a maskable icon would let Android crop the logo.
- Eagle silhouette, `public/brand/reviewlens-mark.png`: the provided transparent PNG, byte-for-byte, drawn by `BrandMark` in `src/components/brand.tsx`. It sits in the top-left of the header and is the in-app mark on the welcome screen, account screens, empty states, analysis progress and the error page. It is never used as a browser icon, and the square logo never appears in the header.
- `public/brand/spup-seal.png`: the official seal from spup.edu.ph, unaltered, on a white badge in the footer band.
