// "Our score" for a review: the weighted average of its scored parts, to one decimal.
// Used by the site and by the editor, so both always show the same number.
export function ourScore(review) {
  const parts = (review?.breakdown || []).filter((p) => typeof p.score === 'number' && !Number.isNaN(p.score));
  if (!parts.length) return typeof review?.score === 'number' ? review.score : null;
  const weight = (p) => (typeof p.weight === 'number' && p.weight > 0 ? p.weight : 1);
  const total = parts.reduce((sum, p) => sum + weight(p), 0);
  return Math.round((parts.reduce((sum, p) => sum + p.score * weight(p), 0) / total) * 10) / 10;
}
