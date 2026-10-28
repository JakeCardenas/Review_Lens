-- Label check: the person's own positive, neutral or negative label for a review, from the
-- uploaded file's label column. Ratings are never stored here; rating alignment is worked out when
-- it's shown. The label is only compared with ReviewLens's label and is never sent to an AI service.

alter table public.reviews
  add column if not exists reference_label text
    check (reference_label in ('positive', 'neutral', 'negative'));
