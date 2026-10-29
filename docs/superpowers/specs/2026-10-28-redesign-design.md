# ReviewLens design: friendly and simple, Duolingo-inspired

A visual and UX redesign of every screen, inspired by Duolingo's design context (https://www.designmd.co/d/duolingo) and the earlier Refero "Duolingo" board. Features, data, API behavior, auth, limits and analysis are unchanged.

## Intent

A white page with dark, readable text. Bright green marks what you can do next, what is selected and how far along you are. Each screen shows the most useful thing first and one clear next step, with detail on its own page. ReviewLens keeps its own identity: its square logo and green eagle mark, never Duolingo's name, wordmark, owl, illustrations or game features (no XP, hearts, streaks or leaderboards).

## Colors (src/app/globals.css)

| Token | Value | Used for |
| --- | --- | --- |
| Page | `#ffffff` | page and list surfaces |
| Green | `#58cc02` | primary buttons, selected tab and filter outlines, progress, positive sentiment |
| Lime | `#a5ed6e` | selected outlines, the current step of the progress path |
| Soft green | `#d7ffb8` | selected tab fill, success tags, active filter chips |
| Sky blue | `#ddf4ff` | occasional soft surfaces: the overview takeaway, "How it works", AI mode tag |
| Blue | `#1cb0f6` | secondary accents; link text uses `#1274a2` (4.6:1 on sky blue) |
| Text | `#3c3c3c` | headings and main text (11:1) |
| Supporting text | `#5f5f5f` | descriptions and meta (6.4:1); hints and placeholders `#6b6b6b` (5.3:1) |
| Light gray | `#f7f7f7` | soft panels, notices, tags |
| Line | `#e5e5e5` | the few outlines and dividers left |

Readable text: green text is `#377e01` and labels on green buttons are Night Ink `#000437` (9.4:1; white would be 2.1:1). Input borders are `#949494` (3:1). The "ReviewLens" wordmark is a logotype, so it keeps the bright green.

Charts: sentiment uses green, Faded Gray `#afafaf` and Night Ink (validated with the dataviz palette script); confidence uses an ordered gray ramp. Every chart has text values, icons and a table view.

## Type

Nunito Black for page titles and big numbers, Nunito Sans for everything else. Page titles 28 to 32px (the welcome title up to 44px), section headings 19 to 24px, body 17px, supporting text 15px. Sentence case everywhere. Uppercase is kept only for things you press (buttons and tabs). No small uppercase labels above headings.

## Shapes and layout

12px controls with 2px borders; buttons keep a 3 to 4px bottom lip that presses in. Outlines are used sparingly: the latest upload card, lists of uploads and reviews (one outline with dividers), the report page and form fields. Panels, notices and tags use soft fills instead of outlines, and nothing is nested box in box. Sections are separated by space or a single divider. Content max width 1200px.

Motion is small and purposeful: 90 to 100ms press feedback, 150ms color changes, a 500ms progress fill. `prefers-reduced-motion` turns transitions and animations off.

## Screens

- **Home, no uploads:** the eagle mark, "Let's see what your customers are saying", one Upload reviews button, a sample CSV link and the four steps on a sky-blue panel.
- **Home, with uploads:** Upload reviews is the main action. The latest upload shows its status and one next step (See insights, Continue analysis or Upload again); earlier uploads are compact rows.
- **Progress path** (`src/components/journey-path.tsx`): a short "Step 3 of 4: Analyze" line over four slim segments. It shows only while an upload is in progress (the wizard, the latest upload while analyzing, the overview while analyzing). The analysis page uses the same text line with its own progress bar; finished screens don't show the path.
- **Upload overview:** how customers feel (one headline, one labeled bar, counts), one takeaway worked out from the upload (the topic in the most negative reviews, else the most mentioned topic), compact "Keep exploring" links, and Delete upload at the bottom.
- **Detail pages, as tabs** (a bottom bar on phones; the selected tab is green): Reviews (search, filters folded behind one button with chips for what's active, CSV downloads), Topics (topic bars, timeline when dates exist, standout words), Accuracy (label or rating check, disagreements, confidence), Report (downloads, printable summary, negative reviews to read first). Data issues is linked where it matters.
- **Public welcome** (signed-out visitors at `/`, `src/components/public-welcome.tsx`): the ReviewLens mascots on the left and, on the right, "See what your reviews are really saying.", one short line, Get started (to `/sign-up`) and I already have an account (to `/sign-in`). On phones the mascots, slogan and both actions stack and fit the first screen. The proxy lets signed-out visitors open `/` only; the page shows nothing private and checks the account before showing uploads. Every other page still sends signed-out visitors to sign in.
- **Account screens:** one centered column with a title, a short line, the form and its links, and no repeated mascot (the header already has the logo). Email, Password and Confirm password labels, with short guidance outside the labels.
- **Public theme** (welcome and account pages, `[data-public-page]` in `globals.css`): closer to the DesignMD palette. The page and header are sky blue `#ddf4ff`; primary buttons are lime `#a5ed6e` with a green `#58cc02` lip and `#3c3c3c` labels (7.9:1). Field borders darken to `#858585` and focus rings to `#1274a2` so they reach 3:1 on sky blue, and supporting text stays `#5f5f5f` because `#777777` is only 3.5:1 there.
- **Footer:** a small, neutral ReviewLens footer: "Only you can see your uploads."

## Brand assets

- Square logo ("Magnifying Bird Mascot Icon"), for the browser and home screen only, resized and never cropped or recolored: `src/app/favicon.ico` (16, 32 and 48px), `src/app/icon.png` (192px), `src/app/apple-icon.png` (180px), and `public/icons/icon-192.png` and `icon-512.png` for `src/app/manifest.ts`. The manifest lists plain icons only; a maskable icon would let Android crop the logo.
- Mascots artwork, `public/brand/reviewlens-mascots.webp`: provided by Jake, byte-for-byte, on a sky-blue background that matches `#ddf4ff`. Used only on the public welcome page, with empty alt text because the slogan carries the message.
- Eagle silhouette, `public/brand/reviewlens-mark.png`: the provided transparent PNG, byte-for-byte, drawn by `BrandMark` in `src/components/brand.tsx`. It sits in the top-left of the header and is the in-app mark on the welcome screen, account screens, empty states, the analysis screen and the error page. It is never used as a browser icon, and the square logo never appears in the header.
