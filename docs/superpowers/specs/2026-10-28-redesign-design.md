# ReviewLens design: friendly, clear and its own

A visual and UX redesign of every screen, aiming for "approachable mastery": friendly and a little playful, but clear enough to trust with real feedback. Duolingo's design file (https://www.designmd.co/d/duolingo) and its shape-language article (https://blog.duolingo.com/shape-language-duolingos-art-style/) are the inspiration for warmth, plain words, chunky rounded shapes and simple hierarchy, not a template: ReviewLens keeps its own name, eagle logo, mascots and look, with no Duolingo logo, owl, characters, artwork, page layout or game features (no XP, hearts, streaks or leaderboards). Features, data, API behavior, auth, limits and analysis are unchanged.

The second pass (2026-10-30) fixed two complaints: colours that felt inconsistent and an overview that felt overwhelming. The causes were green used for five jobs in nine shades, an off-palette navy for negative sentiment, yellow warning tints on routine progress, sky and grey panels doing the same job, and an overview with two equal heroes, the same split shown three times, and the other tools repeated as buttons.

## Colors (src/app/globals.css)

Five colours from the brief do all the work on a white page. Each brand colour has one deeper step for lower edges and lines, and one pale step for tints.

| Token | Value | Used for |
| --- | --- | --- |
| Page | `#ffffff` | every page, signed in or not |
| Lime | `#a5ed6e` | the one primary button per screen (labels `#111111`, 13:1), positive sentiment, the current journey step |
| Lime edge | `#6ac513` | the logo's own green: the primary button's lower edge, sticker shading, progress fills, the positive trend line |
| Pale lime | `#e6fad6` | Ready tags, success notices, agreeing cells in the accuracy check, search highlights |
| Blue | `#1cb0f6` | link underlines and sticker badges; its edge `#1899d6` is the 2px focus ring (3.2:1) |
| Blue text | `#1274a2` | links and selected labels (5.2:1 on white, 4.6:1 on sky) |
| Sky | `#ddf4ff` | selected tabs, menu items and filter chips; in-progress tags; and a few supporting panels (the overview's finding, info notices, the sign-up and accuracy tips) |
| Text | `#3c3c3c` | headings, main text, the wordmark, negative sentiment |
| Muted text | `#6b6b6b` | supporting text; the brief's `#777777` is 4.48:1 on white, so the nearest grey that passes AA is used |
| Lines | `#e5e5e5` | 2px card, list and divider borders, and the lower edge of outlined buttons |
| Grey | `#afafaf` | neutral sentiment, axis lines, the upload dropzone's dashed border |
| Light grey | `#f7f7f7` | hover, and inset panels such as a quoted review |

Input borders stay `#949494` at 2px (3:1). Red (`#bb3737` on `#ffdfe0`) marks only errors and delete; yellow (`#916a00` on `#fff5d3`) marks only warnings. Nothing else uses them: Importing, Analyzing and Paused are blue or grey, and "Not labeled" is grey.

**Sentiment** uses the same palette everywhere: positive lime, neutral grey, negative charcoal. Bars use the fills; trend lines use the deeper step of each (lime edge, muted grey, charcoal) with solid, dotted and dashed strokes. The icon is a small round face in the sentiment's colour, so the face is the colour key and the icon at once; it always sits next to the word.

## Type

One rounded family, Nunito, for everything (a variable font, so one file carries every weight). Body text is 17px at 600 with a 1.5 line height, so it stays comfortable in long review lists; headings run 800 to 900; labels and buttons 700 to 800. App titles 28 to 32px, section headings 19 to 24px, supporting text 15px, tags 13px. Sentence case everywhere; no uppercase labels and no labels above headings.

## Shapes and components

- **Corners:** 12px on cards, panels, buttons and fields; tags and filter chips are fully round.
- **Spacing:** a 10px rhythm. 10px and 20px inside components, 20px card padding (30px on wider screens), 30 to 50px between sections, a 20px side gutter on phones and 30px from 640px.
- **Buttons** are built like keys: 44px tall at least, in sentence case. Primary is lime on a 4px edge of the logo's green; secondary is white with a 2px grey outline that thickens to 5px at the bottom. Pressing sinks the button into its edge (150ms, so a tap feels instant); colours ease over 300ms. Text actions are blue. Disabled buttons turn grey and lose their edge.
- **Focus:** a 2px blue ring, 2px outside the control, on everything you can reach with a keyboard.
- **Stickers** (`src/components/illustrations.tsx`, all drawn for ReviewLens): four characters built the same way as the buttons, as white paper with a grey outline and a thicker grey lower edge, plus one round lime or blue badge on its own deeper edge, cut out with a white ring. From 36px up the main object has a small face; inside buttons (24px) the face is dropped so the drawing stays crisp.
  - **Sheet:** a spreadsheet with a lime header row and a blue upload badge, for Upload reviews.
  - **Lens:** a lime magnifier with a face over a review bubble, for Explore feedback and empty search results.
  - **Report:** a document with a folded corner, a small bar chart and a lime download badge, for Export report.
  - **Ready:** the happy sheet with a lime check badge and two blue sparkles, for finished analysis and "Nothing to fix here".

  They appear only beside a visible label: the Upload reviews buttons, the wizard's dropzone, the overview's finding, the report header, the finished analysis and a few empty states. Navigation and data controls keep simple line icons.
- **Tags:** soft round pills with dark text and an icon, so status never depends on colour alone. Sentiment tags are light grey with the coloured face.
- Cards, lists and tables use one 2px border; panels and notices use soft fills; nothing is nested box in box.
- Loading placeholders are still grey shapes at their final size.
- **Motion** is short and only answers something: button presses, menus opening (150ms), a 200ms fade-and-lift when a panel, folded section or notice appears, and one 300ms grow-in for the ready sticker when an analysis finishes. `prefers-reduced-motion` turns it off. No parallax.

## Navigation

- Header: the green eagle mark and the charcoal wordmark (the mark alone below 360px), an outlined Upload reviews (each page keeps its own main action) and the account menu.
- Upload pages: Overview, Reviews and Topics stay in view; Accuracy check, Export report and Data issues sit under More. On phones this is a four-item bottom bar, and More opens a menu above it. The selected item is sky with blue text, like every selected state. More closes on Escape (focus returns to it), on a tap outside and on a choice.

## Screens

- **Public welcome** (signed out, `/`): the mascots on the white page, "Make sense of every review.", one short line, Get started (to `/sign-up`) and I already have an account (to `/sign-in`).
- **Account pages:** one centered column on white with a title, a short line, the form and its links. Email, Password and Confirm password labels, with short guidance outside the labels.
- **First upload:** the "Your reviews" title stays; the first action sits where uploads will appear: "Choose a CSV to get started", Upload reviews, a sample CSV and the four steps, with the mascots beside it.
- **Your reviews:** Upload reviews as the main action, the latest upload with its status and one next step (Explore feedback, Continue analysis or Upload again), earlier uploads as compact rows.
- **Upload wizard:** a compact step path; "Choose a CSV to get started"; then "Which column has the reviews?" with one choice, and the optional columns (date, rating, product, your label) folded under "More details (optional)" with a line saying what was matched. It opens on its own when a date order needs choosing or a label column looks wrong.
- **Analysis:** what's happening and how far along, a progress bar while it runs, the counts, and the ready sticker with "Your reviews are ready" and Explore feedback when done.
- **Overview (at a glance):** a compact title area (back link, name, status, mode and file), then:
  - **How customers feel:** the biggest share as one large number with its face (for example "64% positive"), "Based on 143 reviews", one stacked bar and its key.
  - **What stands out:** one sky panel with the lens sticker, the finding worked out from the upload, and its one main action ("Read these 17 reviews").
  - **Most mentioned:** the top three topics as rows with their review counts and how they lean ("Mostly positive", "Mixed"), linking to those reviews, with See all topics.
  - Accuracy check, Export report and Data issues as quiet links at the bottom, with Delete upload.

  On wide screens the topics sit in a side column. While analysis is still running, a "Still reading your reviews" card comes first and Continue analysis takes the primary style.
- **Reviews, Topics, Accuracy, Report, Data issues:** each with one heading and a short line; filters folded behind one button with chips for what's active; CSV downloads on Reviews and on Export report. The report page opens with the report sticker, and its labeled-reviews download is the main action. It also prints or saves the summary as a PDF.
- **Mascots** appear only where someone is being welcomed or helped back: the public welcome, the first upload, and the not-found and error pages. The eagle mark is the logo in the header and nowhere else.

## Brand assets

- Square logo ("Magnifying Bird Mascot Icon"), for the browser and home screen only, resized and never cropped or recolored: `src/app/favicon.ico` (16, 32 and 48px), `src/app/icon.png` (192px), `src/app/apple-icon.png` (180px), and `public/icons/icon-192.png` and `icon-512.png` for `src/app/manifest.ts`. The manifest lists plain icons only; a maskable icon would let Android crop the logo.
- Mascots artwork, `public/brand/reviewlens-mascots.webp`: provided by Jake, byte-for-byte, on a white background so it sits straight on the white pages (an earlier copy had a sky-blue background). Drawn by `Mascots` in `src/components/brand.tsx` with empty alt text, because the words beside it carry the message.
- Eagle silhouette, `public/brand/reviewlens-mark.png`: the provided transparent PNG, byte-for-byte, drawn by `BrandMark` as the header logo. Its green (`#6ac513`) is the palette's lime edge. It is never used as a browser icon, and the square logo never appears in the header.
- Stickers and sentiment faces are original SVG drawn in code for ReviewLens; no third-party icon art or emoji is used. Line icons in navigation and controls come from Lucide (ISC license), already a dependency.
- Images load with `preload` or `loading="eager"`; Next.js 16 deprecates `priority`.
