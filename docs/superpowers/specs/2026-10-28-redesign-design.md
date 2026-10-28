# ReviewLens redesign: Refero "Duolingo" style

A visual redesign of every screen, following the Refero "Duolingo" style board (https://styles.refero.design/style/7088d695-362b-4e09-b325-fa8136d4f350). Features, data, API behavior, auth, limits and analysis are unchanged.

## Intent

White paper canvas, chubby rounded headings, one saturated green for progress and primary actions, Spark Blue for links and secondary actions, calm gray body text, and 12px controls with 2px borders and a solid bottom lip, like stickers pressed onto the page. ReviewLens keeps its own identity: the Philippine eagle icon wherever a mascot appears, never Duolingo's name, wordmark, owl or illustrations.

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

Header (eagle, green wordmark, New upload, account pill), account screens (eagle beside the form), uploads list (sticker cards), upload wizard, analysis progress, overview, reviews and review details, data issues, report, and the empty, loading, error and not-found states.

## Brand assets

- `public/brand/reviewlens-eagle.png`, `src/app/icon.png`, `src/app/apple-icon.png`, `src/app/favicon.ico`, `public/icons/*`, `src/app/manifest.ts`: the provided eagle artwork, resized only.
- `public/brand/spup-seal.png`: the official seal from spup.edu.ph, unaltered, on a white badge in the footer band.
