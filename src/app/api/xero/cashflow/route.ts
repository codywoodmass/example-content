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

  let running = bank.balance ?? 0
  const weekRows = weeks.map(w => {
    const expectedIn = sumDueInRange(ar.items, w.start, w.end)
    const expectedOut = sumDueInRange(ap.items, w.start, w.end)
    const gstPeriod = gst.periods.find(p => {
      const d = new Date(p.dueDate + 'T12:00:00')
      return d >= w.start && d <= w.end
    })
    // The actual liability for a period that hasn't ended yet isn't known — this
    // reuses the most recently filed period's net figure as a rough stand-in,
    // flagged via gstEstimated rather than presented as a real number.
    const gstAmount = gstPeriod ? (gst.netEstimate || 0) : 0
    const opening = running
    const closing = opening + expectedIn - expectedOut - gstAmount
    running = closing
    return {
      weekStart: toDateStr(w.start),
      weekEnd: toDateStr(w.end),
      opening,
      expectedIn,
      expectedOut,
      gstAmount,
      gstEstimated: !!gstPeriod,
      closing,
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
