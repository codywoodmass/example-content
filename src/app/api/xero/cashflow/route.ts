import { NextRequest, NextResponse } from 'next/server'
import { requireStudioUser, getValidXeroToken } from '@/lib/xero'
import { toDateStr, getOutstandingInvoices, getGstSchedule, getBankBalance } from '@/lib/xeroReports'

const DAY_MS = 24 * 60 * 60 * 1000

// Scoped down deliberately: this forecasts AR (outstanding sales invoices), AP
// (outstanding bills) and GST due dates against the real bank balance. It does
// NOT model payroll or income tax — neither is tracked anywhere this app can
// read yet (no payroll connection, no provisional tax schedule), and guessing
// at either would make the forecast look more precise than it is.
export async function GET(req: NextRequest) {
  const auth = await requireStudioUser(req)
  if (!auth.ok) return auth.response

  const token = await getValidXeroToken(auth.supabase)
  if (!token) return NextResponse.json({ connected: false })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [bank, ar, ap, gst] = await Promise.all([
    getBankBalance(token.accessToken, token.tenantId, toDateStr(today)),
    getOutstandingInvoices(token.accessToken, token.tenantId, 'ACCREC'),
    getOutstandingInvoices(token.accessToken, token.tenantId, 'ACCPAY'),
    getGstSchedule(token.accessToken, token.tenantId),
  ])

  const weeks = Array.from({ length: 13 }, (_, i) => {
    const start = new Date(today.getTime() + i * 7 * DAY_MS)
    const end = new Date(start.getTime() + 6 * DAY_MS)
    return { start, end }
  })

  // Assumes each invoice/bill is paid on its due date — the only payment-timing
  // signal Xero actually gives us. Real client/supplier behaviour will differ.
  const sumDueInRange = (items: { dueDate: string | null; amountDue: number }[], start: Date, end: Date) =>
    items.filter(it => it.dueDate && new Date(it.dueDate + 'T12:00:00') >= start && new Date(it.dueDate + 'T12:00:00') <= end)
      .reduce((s, it) => s + it.amountDue, 0)

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
  })
}
