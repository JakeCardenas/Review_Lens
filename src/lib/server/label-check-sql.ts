// SQL for the agreement checks, for reviews aliased as `r`. Kept apart from reviews.ts and
// filters.ts so both can use it without importing each other.

/**
 * The label a review's rating suggests, worked out like sentimentFromRating: the rating's place on
 * its upload's scale in whole percent, with the top quarter positive and the bottom quarter negative.
 * Ratings have at most two decimals, so working in hundredths keeps the rounding exact. The null
 * check comes first because greatest() and least() skip nulls rather than returning null.
 */
export const RATING_LABEL_SQL = `(select case
    when p.percent is null then null
    when p.percent >= 75 then 'positive'
    when p.percent <= 25 then 'negative'
    else 'neutral'
  end
  from uploads u
  cross join lateral (select case when u.rating_scale = 100 then 0 else 1 end as lowest) s
  cross join lateral (
    select case when r.rating is null or u.rating_scale is null then null
      else round(least(100, greatest(0, (round(r.rating * 100) - s.lowest * 100) / (u.rating_scale - s.lowest))))
    end as percent
  ) p
  where u.id = r.upload_id)`;

const HAS_LABEL_COLUMN_SQL = `(select coalesce(u.column_map ->> 'label', '') <> '' from uploads u where u.id = r.upload_id)`;

/** What a review is checked against: the person's own label when the upload has a label column, else its rating. */
export const CHECK_REFERENCE_SQL = `(case when ${HAS_LABEL_COLUMN_SQL} then r.reference_label else ${RATING_LABEL_SQL} end)`;
