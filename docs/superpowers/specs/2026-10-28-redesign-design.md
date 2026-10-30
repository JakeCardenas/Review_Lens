# ReviewLens design: friendly, clear and its own

A visual and UX redesign of every screen. Duolingo (https://www.designmd.co/d/duolingo) is the inspiration for warmth, plain words and simple hierarchy, not a template: ReviewLens keeps its own name, mascots and look, with no Duolingo logo, mascot, page layout or game features (no XP, hearts, streaks or leaderboards). Features, data, API behavior, auth, limits and analysis are unchanged.

The direction follows the taste skill's app-screen rules with its "accent ladder" style: one brand green at full strength on the main action and small marks, and its pale tints on what is selected.

## Colors (src/app/globals.css)

| Token | Value | Used for |
| --- | --- | --- |
| Page | `#ffffff` | every page, signed in or not |
| Brand green | `#a5ed6e` | the one primary button per screen; labels on it are `#111111` (13:1) |
| Pale green | `#e6fad6` | selected tabs and menu items, success tags, progress tracks |
| Green ink | `#2f6b00` | text on white or on pale green (6.5:1) |
| Deeper green | `#58cc02` | progress fills and positive sentiment in charts |
| Sky blue | `#ddf4ff` | small panels: the overview's finding and the AI-mode tag |
| Blue | `#1cb0f6` | link underlines; link text uses `#1274a2` (5.2:1) |
| Text | `#3c3c3c` | headings and main text (11:1) |
| Muted text | `#6b6b6b` | supporting text; `#777777` is 4.48:1 on white and 4.2:1 on grey panels, so the nearest grey that passes on both is used |
| Lines | `#e5e5e5` | 1px card, list and divider borders |

Input borders stay `#949494` at 2px (3:1). Charts keep the validated sentiment palette: green, faded gray `#afafaf` and Night Ink `#000437`.

## Type

Nunito Black for page titles and big numbers, Nunito Sans for everything else. App titles 28 to 32px, section headings 19 to 24px, body 16 to 17px, supporting text 15px. Sentence case everywhere, buttons and tabs included; no uppercase labels and no labels above headings.

## Shapes and components

- Buttons are flat and fully round, in sentence case: lime primary (one per screen), white secondary with a grey outline, blue text actions. Press feedback is a 2% scale; there is no 3D bottom edge.
- Cards, lists and tables use one 1px border; panels and notices use soft fills instead of outlines; nothing is nested box in box.
- Tags are pale fills with dark text of the same hue.
- Loading placeholders are still grey shapes at their final size, with no pulse.
- Motion is small and only answers an action: button presses, menus opening. `prefers-reduced-motion` turns it off.

## Navigation

- Header: the eagle mark and wordmark (the mark alone below 360px), an outlined Upload reviews (each page keeps its own main action) and the account menu.
- Upload pages: Overview, Reviews and Topics stay in view; Accuracy check, Report and downloads, and Data issues sit under More. On phones this is a four-item bottom bar, and More opens a menu above it. The selected item is pale green with green ink. More closes on Escape (focus returns to it), on a tap outside and on a choice.

## Screens

- **Public welcome** (signed out, `/`): the mascots on the white page, "See what your reviews are really saying.", one short line, Get started (to `/sign-up`) and I already have an account (to `/sign-in`).
- **Account pages:** one centered column on white with a title, a short line, the form and its links. Email, Password and Confirm password labels, with short guidance outside the labels.
- **First upload:** the "Your reviews" title stays; the first action sits where uploads will appear: "Choose a CSV to get started", Upload reviews, a sample CSV and the four steps, with the mascots beside it.
- **Your reviews:** Upload reviews as the main action, the latest upload with its status and one next step (See the results, Continue analysis or Upload again), earlier uploads as compact rows.
- **Upload wizard:** a compact step path; "Choose a CSV to get started"; then "Which column has the reviews?" with one choice, and the optional columns (date, rating, product, your label) folded under "More details (optional)" with a line saying what was matched. It opens on its own when a date order needs choosing or a label column looks wrong.
- **Analysis:** what's happening and how far along, a progress bar while it runs, the counts, and See the results when done.
- **Overview:** "Here's what stands out" first, with the finding worked out from the upload and its one main action ("Read these 17 reviews"); then how customers feel; then links to the other tools; Delete upload last.
- **Reviews, Topics, Accuracy, Report, Data issues:** each with one heading and a short line; filters folded behind one button with chips for what's active; CSV downloads on Reviews and Report.
- **Mascots** appear only where someone is being welcomed or helped back: the public welcome, the first upload, and the not-found and error pages. The eagle mark is the logo in the header and nowhere else.

## Brand assets

- Square logo ("Magnifying Bird Mascot Icon"), for the browser and home screen only, resized and never cropped or recolored: `src/app/favicon.ico` (16, 32 and 48px), `src/app/icon.png` (192px), `src/app/apple-icon.png` (180px), and `public/icons/icon-192.png` and `icon-512.png` for `src/app/manifest.ts`. The manifest lists plain icons only; a maskable icon would let Android crop the logo.
- Mascots artwork, `public/brand/reviewlens-mascots.webp`: provided by Jake, byte-for-byte, on a white background so it sits straight on the white pages (an earlier copy had a sky-blue background). Drawn by `Mascots` in `src/components/brand.tsx` with empty alt text, because the words beside it carry the message.
- Eagle silhouette, `public/brand/reviewlens-mark.png`: the provided transparent PNG, byte-for-byte, drawn by `BrandMark` as the header logo. It is never used as a browser icon, and the square logo never appears in the header.
- Images load with `preload` or `loading="eager"`; Next.js 16 deprecates `priority`.
