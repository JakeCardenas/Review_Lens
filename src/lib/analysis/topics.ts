export type TopicId = "delivery" | "price" | "quality" | "service" | "packaging" | "fit" | "usability" | "returns";

export type Topic = { id: TopicId; label: string; pattern: RegExp };

/** Version stored with each upload so results can be traced to the word lists that produced them. */
export const TOPIC_VERSION = "topics-v1";

export const TOPICS: Topic[] = [
  {
    id: "delivery",
    label: "Delivery & shipping",
    pattern:
      /\b(deliver(y|ies|ed|ing)?|ship(ping|ped|ment|ments)?|courier|arriv(e|ed|es|al|ing)|late|delay(s|ed)?|tracking|dispatch(ed)?|in transit|on time|took (ages|forever))\b/i,
  },
  {
    id: "price",
    label: "Price & value",
    pattern:
      /\b(price[ds]?|pricing|cost(s|ly)?|expensive|cheap(er|est)?|afford(able)?|value|worth|overpriced|bargain|discount(s|ed)?|budget|good deal)\b/i,
  },
  {
    id: "quality",
    label: "Product quality",
    pattern:
      /\b(quality|durab(le|ility)|sturdy|flimsy|broke|broken|break(s|ing)?|defect(s|ive)?|faulty|fell apart|falls apart|poorly made|well made|cheaply made|craftsmanship|materials?|stitch(ing|es)?|stopped working|malfunction(s|ed|ing)?)\b/i,
  },
  {
    id: "service",
    label: "Customer service",
    pattern:
      /\b(customer (service|support|care)|support team|seller|staff|agent|representative|rude|polite|(?<!user[- ])friendly|helpful|unhelpful|respon(se|sive|ded)|repl(y|ied|ies)|contacted|hotline|live chat|ignored)\b/i,
  },
  {
    id: "packaging",
    label: "Packaging",
    pattern: /\b(packag(e|es|ed|ing)|box(es)?|wrap(ped|ping)?|bubble wrap|parcel|sealed|dented|crushed)\b/i,
  },
  {
    id: "fit",
    label: "Size & fit",
    pattern: /\b(size[ds]?|sizing|fit(s|ting|ted)?|too (small|big|large|tight|loose|short|long)|tight|loose|runs (small|large|big))\b/i,
  },
  {
    id: "usability",
    label: "Ease of use",
    pattern:
      /\b(easy|easier|easily|intuitive|user[- ]friendly|set ?up|install(ation|ed|ing)?|instructions?|manual|confusing|complicated|difficult to use|hard to use|learning curve)\b/i,
  },
  {
    id: "returns",
    label: "Returns & refunds",
    pattern: /\b(return(s|ed|ing)?|refund(s|ed)?|exchang(e|ed|ing)|replacement|replac(e|ed)|money back|warranty)\b/i,
  },
];

const LABELS = new Map(TOPICS.map((t) => [t.id, t.label]));

export function topicLabel(id: string): string {
  return LABELS.get(id as TopicId) ?? id;
}

export function isTopicId(value: string): value is TopicId {
  return LABELS.has(value as TopicId);
}

/** Returns the topics a review mentions, in the fixed topic order. */
export function detectTopics(text: string): TopicId[] {
  return TOPICS.filter((topic) => topic.pattern.test(text)).map((topic) => topic.id);
}
