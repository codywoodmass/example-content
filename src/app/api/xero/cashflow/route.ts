import { NextRequest, NextResponse } from 'next/server'
import { requireStudioUser, getValidXeroToken } from '@/lib/xero'
import { toDateStr, getOutstandingInvoices, getGstSchedule, getBankBalance, getDraftInvoices } from '@/lib/xeroReports'

const DAY_MS = 24 * 60 * 60 * 1000

// Scoped down deliberately: this forecasts AR (outstanding sales invoices), AP
// (outstanding bills) and GST due dates against the real bank balance. It does
// NOT model payroll or income tax — neither is tracked anywhere this app can
// read yet (no payroll connection, no provisional tax schedule), and guessing
// at either would make the forecast look more precise than it is.
export async function GET(req: NextRequest) {
  const auth = await requireStudioUser(req)
  if (!auth.ok) return auth.response

  let token = await getValidXeroToken(auth.supabase)
  if (!token) return NextResponse.json({ connected: false })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // bank.needsReconnect below covers a 401 on this specific call (see
  // getBankBalance) — but if some other call in this batch 401s instead because
  // our cached expires_at said the token was fine when Xero disagreed (lost a
  // refresh-token rotation race, or Xero invalidated it directly), force a real
  // refresh and retry the whole batch once rather than quietly returning zeros.
  const fetchAll = (accessToken: string, tenantId: string) => Promise.all([
    getBankBalance(accessToken, tenantId, toDateStr(today)),
    getOutstandingInvoices(accessToken, tenantId, 'ACCREC'),
    getOutstandingInvoices(accessToken, tenantId, 'ACCPAY'),
    getGstSchedule(accessToken, tenantId),
    getDraftInvoices(accessToken, tenantId, 'ACCREC'),
  ])

  let [bank, ar, ap, gst, draftAr] = await fetchAll(token.accessToken, token.tenantId)
  if (bank.needsReconnect) {
    const refreshed = await getValidXeroToken(auth.supabase, true)
    if (refreshed) {
      token = refreshed
      ;[bank, ar, ap, gst, draftAr] = await fetchAll(token.accessToken, token.tenantId)
    }
  }

  // Fortnightly, not weekly — most clients pay on the 20th of the month, so a
  // weekly bucket just chopped a single payment cycle into meaningless slices.
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(today.getTime() + i * 14 * DAY_MS)
    const end = new Date(start.getTime() + 13 * DAY_MS)
    return { start, end }
  })

  // Assumes each invoice/bill is paid on its due date — the only payment-timing
  // signal Xero actually gives us. Real client/supplier behaviour will differ.
  const sumDueInRange = (items: { dueDate: string | null; amountDue: number }[], start: Date, end: Date) =>
    items.filter(it => it.dueDate && new Date(it.dueDate + 'T12:00:00') >= start && new Date(it.dueDate + 'T12:00:00') <= end)
      .reduce((s, it) => s + it.amountDue, 0)

  // Drafts often have no due date set yet — fall back to issue date so they
  // still land somewhere plausible instead of just vanishing from every week.
  const sumDraftInRange = (items: { dueDate: string | null; issueDate: string | null; total: number }[], start: Date, end: Date) =>
    items.filter(it => {
      const dateStr = it.dueDate || it.issueDate
      if (!dateStr) return false
      const d = new Date(dateStr + 'T12:00:00')
      return d >= start && d <= end
    }).reduce((s, it) => s + it.total, 0)

  // Opening balance for week 0 is the only one that matters from here — the
  // client folds in portal bookings and a recurring-expense/GST estimate
  // (computed from the P&L data it already has loaded) on top of this and
  // recomputes the running balance itself, same pattern as the "Booked"
  // column. GST's $ amount isn't computed here at all any more: there's no
  // "was this filed" or reliable net-liability signal from Xero's public
  // API, so client-side 15%-of-(revenue−expenses) against real P&L figures
  // is more honest than a figure parsed out of a report whose layout for
  // this org was never confirmed. This just flags which week a due date falls in.
  const weekRows = weeks.map(w => {
    const expectedIn = sumDueInRange(ar.items, w.start, w.end)
    const expectedInDraft = sumDraftInRange(draftAr.items, w.start, w.end)
    const expectedOut = sumDueInRange(ap.items, w.start, w.end)
    const gstPeriodDue = gst.periods.some(p => {
      const d = new Date(p.dueDate + 'T12:00:00')
      return d >= w.start && d <= w.end
    })
    return {
      weekStart: toDateStr(w.start),
      weekEnd: toDateStr(w.end),
      opening: bank.balance ?? 0,
      expectedIn,
      expectedInDraft,
      expectedOut,
      gstPeriodDue,
    }
  })

  return NextResponse.json({
    connected: true,
    needsReconnect: bank.needsReconnect,
    hasBalance: bank.balance !== null,
    asOf: toDateStr(today),
    weeks: weekRows,
    draftTotal: draftAr.draftTotal,
  })
}
