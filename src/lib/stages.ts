// Project stage values stored in projects1.stage stay as-is (Shooting,
// Awaiting Confirmation, ...) so existing rows, filters and color maps keep
// working untouched — this only renames what's shown to people.
export function stageLabel(stage: string): string {
  if (stage === 'Shooting') return 'Awaiting Shoot'
  return stage
}
