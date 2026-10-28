import type { TopicBreakdown } from "@/lib/server/dashboard";

/**
 * Topics ranked by how many negative reviews mention them, most first; ties go to the more-mentioned topic.
 * Only topics with at least one negative mention are returned, so nothing is flagged without evidence.
 */
export function topicsNeedingAttention(topics: TopicBreakdown[], limit = 3): TopicBreakdown[] {
  return [...topics]
    .filter((t) => t.negative > 0)
    .sort((a, b) => b.negative - a.negative || b.total - a.total)
    .slice(0, limit);
}
