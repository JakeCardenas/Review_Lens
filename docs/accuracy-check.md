# Accuracy check

How well ReviewLens's AI mode labels Filipino reviews, what went wrong, what changed, and how to check it fairly.

## Baseline: the 30-review pilot

Thirty Shopee reviews (6 per star level; 20 Taglish, 10 Tagalog) were labeled by hand before anyone saw ReviewLens's labels. They were run once in AI mode with `gemini-3.5-flash-lite` on October 28, 2026 (Philippine time).

ReviewLens agreed with the hand labels on **17 of 30 reviews (57%)**.

| Hand label | ReviewLens: positive | ReviewLens: neutral | ReviewLens: negative |
| --- | ---: | ---: | ---: |
| Positive (6) | 6 | 0 | 0 |
| Neutral (16) | 4 | 3 | 9 |
| Negative (8) | 0 | 0 | 8 |

| Label | Hand labels | ReviewLens labels | Precision | Recall | F1 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Positive | 6 | 10 | 0.60 | 1.00 | 0.75 |
| Neutral | 16 | 3 | 1.00 | 0.19 | 0.32 |
| Negative | 8 | 17 | 0.47 | 1.00 | 0.64 |

By confidence, High-confidence labels matched 13 of 16 (81%) and Medium matched 4 of 14 (29%). None were Low.

This is a small pilot. One review moves the agreement by about 3 points, so it isn't proof of overall accuracy.

## What the disagreements show

All 13 disagreements were reviews labeled neutral by hand. ReviewLens called 9 of them negative and 4 positive. It never mixed up positive and negative.

- **Mixed opinions (10 of 13).** These reviews praise one thing and complain about another, often with "okay naman … pero/lang" or "maganda sana … kaso". ReviewLens marked all 10 as mixed but still picked a side, at Medium confidence.
- **Lukewarm openings (4 of 13).** "Ok naman" and "okay naman" mean "it's fine", but ReviewLens read some as praise.
- **Complaints labeled neutral by hand (3 of 13).** These say the item is fake, doesn't work, or isn't worth it. Most readers would call them negative, so the hand labels need written rules more than the model needs a change.
- **Negation, Taglish and texting spellings.** No label errors came from these. Keyword grouping had one gap: "ndi" and "wg" weren't read as negations. That affects the "Words that stand out" list, not the labels.
- **Short reviews.** The pilot had none (every review was at least 25 characters), so short reviews weren't tested.

## Changes made

1. **Gemini instructions.** They now define each label by the review's main message. Lukewarm "okay naman" is not praise. "Maganda sana" means the customer was let down. A real problem (broken, fake, wrong item, doesn't work) stays negative even when the review is polite. A mixed review that could be read as neutral is marked "leaning". The examples are made up, not pilot reviews.
2. **Confidence, AI mode only.** A mixed review labeled positive or negative is now Low, not Medium, so it shows up as worth reading yourself. Basic mode is unchanged.
3. **Texting spellings.** "ndi" is read as "hindi" and "wg" as "huwag" for keywords and language detection.

Regression tests cover each change, using made-up reviews.

These changes came from studying the pilot, so the pilot can't show whether they help. Running the same 30 reviews again would be tuning and testing on the same data. There is no claim of improvement until a fresh set is checked.

## A fair check

1. **Label a fresh set.** `label-check-150.csv` has 150 Shopee reviews, 30 per star level, none from the pilot. It isn't in this repository, because it holds review text from the Shopee dataset; it was given to Jake separately. Its `my_label` column is still empty, so no fresh evaluation exists yet. Fill in the `my_label` column with the rules below. Don't look at ReviewLens's labels or the star ratings first. Label every review, even hard ones; skipping them makes agreement look better than it is.
2. **Add a second labeler if you can.** Have a teammate label the same file separately, then compare the two. How often two people agree shows how high agreement can realistically go.
3. **Run it once.** Upload the labeled file in AI mode. That takes about 6 Gemini requests. Report the Label check numbers with the sample size.
4. **Keep the check honest.** Don't change the instructions after seeing these results and then report the same 150 as improved. A further change needs another fresh set.

### Labeling rules

These are the same rules ReviewLens's instructions follow.

- **Positive:** mainly satisfied. A small complaint doesn't change that.
- **Negative:** mainly dissatisfied, or the main point is a real problem (broken, fake, missing parts, wrong item, doesn't work, rude seller), even if the review is polite.
- **Neutral:** no clear opinion; lukewarm acceptance with no real problem ("okay lang", "okay naman", "pwede na", "sakto lang"); or praise and complaints where neither side clearly outweighs the other.
