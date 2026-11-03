// Typo-tolerant text matching for the Projects search — substring matches
// rank highest, then individual query words are matched against candidate
// words allowing a few character edits (Levenshtein), so "propery" still
// finds "Property" or "123 Seaveiw Rd" finds "123 Seaview Road".

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[] = Array(n + 1)
  for (let j = 0; j <= n; j++) dp[j] = j
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = tmp
    }
  }
  return dp[n]
}

// Higher is better; 0 means no match at all.
export function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase()
  const t = (text || '').trim().toLowerCase()
  if (!q || !t) return 0
  // Exact substring match ranks above any fuzzy match, tighter matches first.
  if (t.includes(q)) return 100 - Math.min(40, t.length - q.length)

  const qWords = q.split(/\s+/).filter(Boolean)
  const tWords = t.split(/\s+/).filter(Boolean)
  let total = 0
  for (const qw of qWords) {
    let best = 0
    for (const tw of tWords) {
      if (tw.includes(qw) || qw.includes(tw)) { best = Math.max(best, 60); continue }
      const dist = levenshtein(qw, tw)
      const maxLen = Math.max(qw.length, tw.length)
      const similarity = maxLen === 0 ? 0 : 1 - dist / maxLen
      // Stricter tolerance on short words (one typo max), looser on long ones.
      const tolerance = qw.length <= 3 ? 1 : Math.ceil(qw.length * 0.34)
      if (similarity >= 0.6 && dist <= tolerance) best = Math.max(best, Math.round(similarity * 50))
    }
    total += best
  }
  return qWords.length ? total / qWords.length : 0
}

// Scores each item across several text fields and returns the best matches,
// highest score first.
export function fuzzySearch<T>(query: string, items: T[], getFields: (item: T) => (string | null | undefined)[], limit = 8): T[] {
  return items
    .map(item => ({ item, score: Math.max(0, ...getFields(item).map(f => fuzzyScore(query, f || ''))) }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.item)
}
