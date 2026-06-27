// categoryColors.js
// Deterministically maps a category name to one of the six accent colors
// defined in styles.css (--cat-1 .. --cat-6), so the same category always
// renders the same color across the Day Ring, task list, and analytics.
export function categoryIndex(category) {
  const str = category || "Uncategorized";
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash % 6;
}

export function categoryColorVar(category) {
  return `var(--cat-${categoryIndex(category) + 1})`;
}
