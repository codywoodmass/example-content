// Per-package time/cost benchmarks to track actual logged hours against,
// so a booking that's running long on shoot or edit time is visible rather
// than only showing up after the fact in overall profitability. Keyed by
// the exact package name as it's stored in a project's deliverables text
// ("PACKAGE: <name>") — see PROPERTY_PACKAGES in the Projects page.
export type PackageEstimate = { shootHours: number; editHours: number; travelFee?: number }

export const PACKAGE_ESTIMATES: Record<string, PackageEstimate> = {
  'Content Campaign Package': { shootHours: 3, editHours: 3.5, travelFee: 80 },
  'The Walkthrough Package': { shootHours: 3, editHours: 4, travelFee: 80 },
  'Lifestyle and Living Package': { shootHours: 4, editHours: 6 },
  // Media Release Package intentionally has no fixed estimate here — scope
  // varies per job rather than following a standard shoot/edit formula.
}
