// Shared "Editorial Light" wrapper used by every transactional email the
// app sends — picked after a side-by-side comparison of four directions
// shown to Cody. Plain divs with inline styles (no table layout) render
// correctly in Gmail, Apple Mail and Outlook.com, which covers this
// audience; color/font-size/line-height set on the body wrapper below
// cascade to plain <p>/<li>/<td> content passed in via bodyHtml, so
// per-route content blocks (lists, tables) don't need to restate them.
export function renderEmail(opts: {
  // Heading text/HTML — callers may include a manual <br/> for a two-line
  // treatment (e.g. "Your quote<br/>is ready."), left as plain text otherwise.
  heading: string
  // "Hi {name}," greeting line — optional since studio-facing notifications
  // (a new booking request, feedback assigned) don't open with one.
  intro?: string
  // Pre-built HTML (paragraphs, lists, tables) for content that doesn't
  // fit a single intro line — line items, detail rows, a change note.
  bodyHtml?: string
  cta?: { label: string; url: string }
  // Small note under a hairline divider, e.g. "No account needed".
  note?: string
}): string {
  const { heading, intro, bodyHtml, cta, note } = opts
  return `
    <div style="font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff;">
      <div style="padding: 46px 44px 0;">
        <div style="font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #8c8577; margin-bottom: 28px; font-weight: 600;">Example Content</div>
        <div style="height: 1px; background: #111111; margin-bottom: 28px;"></div>
        <div style="font-size: 26px; font-weight: 800; color: #111111; letter-spacing: -0.02em; line-height: 1.2; margin-bottom: 30px;">${heading}</div>
      </div>
      <div style="padding: 0 44px 40px; color: #3a362f; font-size: 14px; line-height: 1.75;">
        ${intro ? `<p style="margin: 0 0 14px;">${intro}</p>` : ''}
        ${bodyHtml ? `<div style="margin: 0 0 28px;">${bodyHtml}</div>` : ''}
        ${cta ? `<a href="${cta.url}" style="display: inline-block; background: #111111; color: #ffffff; text-decoration: none; padding: 15px 34px; border-radius: 2px; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 8px;">${cta.label}</a>` : ''}
        ${note ? `<div style="height: 1px; background: #ece9e3; margin: 36px 0 20px;"></div><p style="font-size: 11px; color: #a39d8e; line-height: 1.7; margin: 0;">${note}</p>` : ''}
      </div>
      <div style="text-align: center; padding: 22px; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #b8b2a3; background: #faf9f7;">Example Content · examplecontent.co.nz</div>
    </div>
  `
}
