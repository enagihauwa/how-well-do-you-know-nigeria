import type { CategoryId, Question } from "../types";

/**
 * Questions grouped by category, built once per content array and reused for every view and
 * match. Content is loaded once (from Postgres on the server, or the static files locally), so
 * keying the cache on the array itself is enough and lets it be garbage collected with it.
 */
const byCategory = new WeakMap<readonly Question[], Map<CategoryId, Question[]>>();

export function questionsInCategory(questions: readonly Question[], category: CategoryId): readonly Question[] {
  let index = byCategory.get(questions);
  if (!index) {
    index = new Map();
    for (const q of questions) {
      const list = index.get(q.category);
      if (list) list.push(q);
      else index.set(q.category, [q]);
    }
    byCategory.set(questions, index);
  }
  return index.get(category) ?? [];
}
