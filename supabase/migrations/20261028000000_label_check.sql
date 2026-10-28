-- Label check: the label a review is compared with. It is either the person's own positive,
-- neutral or negative label from the uploaded file, or the label its star rating suggests.
-- It is stored only to compare with ReviewLens's label and is never sent to an AI service.

alter table public.reviews
  add column if not exists reference_label text
    check (reference_label in ('positive', 'neutral', 'negative'));
