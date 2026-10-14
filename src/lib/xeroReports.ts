import { xeroFetch } from '@/lib/xero'

export const toDateStr = (d: Date) => d.toISOString().split('T')[0]
export const lastDayOfMonth = (y: number, m: number) => new Date(y, m + 1, 0)

// Xero stores dates as either a plain ISO string or the legacy /Date(ms+tz)/ format
// depending on the field — handle both rather than assume one.
export function parseXeroDate(value: string | undefined): Date | null {
  if (!value) return null
  const msMatch = value.match(/\/Date\((\d+)/)
  if (msMatch) return new Date(parseInt(msMatch[1], 10))
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function cellValue(cells: any[], idx: number) {
  const v = cells?.[idx]?.Value
  const raw = typeof v === 'string' ? v.replace(/,/g, '') : v
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : v
}

export function parseSection(section: any) {
  const items: { label: string; amount: number }[] = []
  let total = 0
  for (const row of section.Rows || []) {
    const label = row.Cells?.[0]?.Value
    const amount = cellValue(row.Cells, row.Cells.length - 1)
    if (row.RowType === 'Row' && typeof amount === 'number') items.push({ label, amount })
    if (row.RowType === 'SummaryRow' && typeof amount === 'number') total = amount
  }
  return { items, total }
}

// Walks any Xero "Reports" response generically (Header/Section/Row/SummaryRow is
// a shape shared across every report type) and surfaces whatever Xero itself
// labels each summary/row line as, rather than assuming specific row labels for a
// report whose exact layout hasn't been seen firsthand.
export function walkReportRows(rows: any[]): { label: string; amount: number }[] {
  const out: { label: string; amount: number }[] = []
  const walk = (list: any[]) => {
    for (const row of list || []) {
      if (row.RowType === 'SummaryRow' || row.RowType === 'Row') {
        const label = row.Cells?.[0]?.Value
        const amount = cellValue(row.Cells, row.Cells.length - 1)
        if (label && typeof amount === 'number') out.push({ label, amount })
      }
      if (row.Rows) walk(row.Rows)
    }
  }
  walk(rows)
  return out
}

// Pulls real outstanding invoices/bills straight from Xero (AUTHORISED = sent/
// received and awaiting payment in Xero's terms) rather than relying only on our
// own invoices1 tracking, which can drift out of sync if a client pays directly.
// Xero models both sales invoices (ACCREC) and bills (ACCPAY) as the same
// Invoices resource, so one function covers both directions of cash flow.
export async function getOutstandingInvoices(accessToken: string, tenantId: string, type: 'ACCREC' | 'ACCPAY' = 'ACCREC') {
  try {
    const where = encodeURIComponent(`Type=="${type}" && Status=="AUTHORISED"`)
    const res = await xeroFetch(accessToken, tenantId, `/api.xro/2.0/Invoices?where=${where}&order=DueDate ASC`)
    if (!res.ok) return { items: [], outstandingTotal: 0, overdueTotal: 0 }
    const now = new Date()
    const items = (res.data?.Invoices || [])
      .filter((inv: any) => (inv.AmountDue || 0) > 0)
      .map((inv: any) => {
        const dueDate = parseXeroDate(inv.DueDateString || inv.DueDate)
        return {
          invoiceId: inv.InvoiceID,
          invoiceNumber: inv.InvoiceNumber || '',
          contact: inv.Contact?.Name || 'Unknown',
          dueDate: dueDate ? toDateStr(dueDate) : null,
          amountDue: inv.AmountDue || 0,
          overdue: !!dueDate && dueDate < now,
        }
      })
      .sort((a: any, b: any) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))
    const outstandingTotal = items.reduce((sum: number, i: any) => sum + i.amountDue, 0)
    const overdueTotal = items.filter((i: any) => i.overdue).reduce((sum: number, i: any) => sum + i.amountDue, 0)
    return { items, outstandingTotal, overdueTotal }
  } catch (e) {
    console.error(`Xero ${type} fetch error:`, e)
    return { items: [], outstandingTotal: 0, overdueTotal: 0 }
  }
}

// The app's own invoices1 table is meant to mirror Xero but can drift out of
// sync or simply not be the path payments actually arrived through — pulling
// paid invoices straight from Xero (FullyPaidOnDate) is ground truth instead.
export async function getRecentPayments(accessToken: string, tenantId: string, limit = 6) {
  try {
    const where = encodeURIComponent('Type=="ACCREC" && Status=="PAID"')
    const res = await xeroFetch(accessToken, tenantId, `/api.xro/2.0/Invoices?where=${where}&order=UpdatedDateUTC DESC`)
    if (!res.ok) return []
    return (res.data?.Invoices || [])
      .map((inv: any) => {
        const paidDate = parseXeroDate(inv.FullyPaidOnDate) || parseXeroDate(inv.UpdatedDateUTC)
        return {
          invoiceId: inv.InvoiceID,
          invoiceNumber: inv.InvoiceNumber || '',
          contact: inv.Contact?.Name || 'Unknown',
          paidDate: paidDate ? toDateStr(paidDate) : null,
          amount: inv.Total || 0,
        }
      })
      .sort((a: any, b: any) => (b.paidDate || '').localeCompare(a.paidDate || ''))
      .slice(0, limit)
  } catch (e) {
    console.error('Xero recent payments fetch error:', e)
    return []
  }
}

// IRD only offers 1-, 2- and 6-monthly GST filing for NZ orgs; this maps Xero's
// SalesTaxPeriod values to a period length in months.
export const GST_PERIOD_MONTHS: Record<string, number> = {
  MONTHLY: 1, '1MONTHLY': 1, '2MONTHLY': 2, '6MONTHLY': 6,
  QUARTERLY1: 3, QUARTERLY2: 3, QUARTERLY3: 3, ANNUALLY: 12,
}

// IRD's GST return + payment is due on the 28th of the month after the period
// ends, with one standard exception: a period ending 30 Nov is due 15 Jan
// instead of 28 Dec (pushed past the holidays). Doesn't cover every IRD edge
// case (e.g. provisional-tax linked extensions) — treat as a guide.
export function gstDueDateFor(periodEnd: Date): Date {
  if (periodEnd.getMonth() === 10) return new Date(periodEnd.getFullYear() + 1, 0, 15)
  return new Date(periodEnd.getFullYear(), periodEnd.getMonth() + 1, 28)
}

// There's no API field for which exact months an org's periods land on (e.g. a
// 2-monthly filer could run Jan/Mar/May or Feb/Apr/Jun) — this assumes the more
// common Feb/Apr/Jun/Aug/Oct/Dec-style stagger (periods ending on the
// period-length'th calendar-month boundary). Worth confirming against myIR once;
// callers should flag this as an assumption rather than fact.
export function buildGstPeriods(periodMonths: number, count: number) {
  const now = new Date()
  let end = lastDayOfMonth(now.getFullYear(), now.getMonth())
  while (end.getMonth() % periodMonths !== periodMonths - 1 || end > now) {
    end = lastDayOfMonth(end.getFullYear(), end.getMonth() - 1)
  }
  const periods: { start: Date; end: Date }[] = []
  for (let i = 0; i < count; i++) {
    const start = new Date(end.getFullYear(), end.getMonth() - periodMonths + 1, 1)
    periods.unshift({ start, end })
    end = lastDayOfMonth(start.getFullYear(), start.getMonth() - 1)
  }
  return periods
}

export type GstPeriod = { start: string; end: string; dueDate: string; daysUntilDue: number; status: 'upcoming' | 'overdue' | 'filing_window' | 'filed' }
export type GstSchedule = {
  needsReconnect: boolean
  salesTaxBasis: string | null
  salesTaxPeriod: string | null
  periods: GstPeriod[]
  breakdown: { label: string; amount: number }[]
  netEstimate: number | null
}

// Shared by the GST tab (full schedule + breakdown) and the cash flow forecast
// (just needs due dates + a $ estimate to drop into the right week) — one Xero
// round trip for Organisation + one for TaxSummary, not duplicated per caller.
export async function getGstSchedule(accessToken: string, tenantId: string): Promise<GstSchedule> {
  const orgRes = await xeroFetch(accessToken, tenantId, '/api.xro/2.0/Organisation')
  const org = orgRes.data?.Organisations?.[0]
  const salesTaxBasis = org?.SalesTaxBasis || null
  const salesTaxPeriod = org?.SalesTaxPeriod || null
  const periodMonths = GST_PERIOD_MONTHS[salesTaxPeriod] || 2

  const periods = buildGstPeriods(periodMonths, 4)
  const now = new Date()
  // There's no "was this actually filed" signal available from Xero's public
  // API, so a past due date can't honestly be called overdue purely because
  // time has passed — a functioning business has filed its older periods by
  // the time a newer one rolls around. Only the single most recently ended
  // period (the one that could plausibly still be outstanding) gets flagged;
  // anything further back is shown as settled history instead of a false alarm.
  const mostRecentPastEnd = Math.max(...periods.filter(p => p.end <= now).map(p => p.end.getTime()), -Infinity)

  const withDue: GstPeriod[] = periods.map(p => {
    const due = gstDueDateFor(p.end)
    const daysUntilDue = Math.round((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const isMostRecentPast = p.end <= now && p.end.getTime() === mostRecentPastEnd
    const status: GstPeriod['status'] = p.end > now ? 'upcoming' : !isMostRecentPast ? 'filed' : daysUntilDue < 0 ? 'overdue' : 'filing_window'
    return {
      start: toDateStr(p.start),
      end: toDateStr(p.end),
      dueDate: toDateStr(due),
      daysUntilDue,
      status,
    }
  })

  // Only the most recently completed period's figures are worth a live Xero
  // call — older ones in the list are just schedule context.
  const mostRecentCompleted = [...periods].reverse().find(p => p.end <= now)
  let breakdown: { label: string; amount: number }[] = []
  let needsReconnect = false
  if (mostRecentCompleted) {
    const res = await xeroFetch(accessToken, tenantId, `/api.xro/2.0/Reports/TaxSummary?fromDate=${toDateStr(mostRecentCompleted.start)}&toDate=${toDateStr(mostRecentCompleted.end)}`)
    if (res.ok) breakdown = walkReportRows(res.data?.Reports?.[0]?.Rows || [])
    else if (res.status === 403 || res.status === 401) needsReconnect = true
  }

  // Best-effort pick of a single "what we owe/get back" figure: Xero's own
  // label is trusted over guessing which row is semantically "the" total —
  // prefer one that says payable/due/refund, else fall back to whichever
  // summary line came last (reports conventionally put the grand total there).
  const netRow = breakdown.find(r => /payable|due|refund/i.test(r.label)) || breakdown[breakdown.length - 1]
  const netEstimate = netRow ? netRow.amount : null

  return { needsReconnect, salesTaxBasis, salesTaxPeriod, periods: withDue, breakdown, netEstimate }
}

// BalanceSheet's "Bank" section lists each connected bank account as a Row with
// a SummaryRow totaling them — exactly the "cash on hand today" figure a cash
// flow forecast needs as its starting point. Requires the balancesheet report
// scope, which is newer than the rest of this app's Xero connection, so a
// pre-existing connection may need reconnecting before this succeeds.
export async function getBankBalance(accessToken: string, tenantId: string, asOf: string): Promise<{ balance: number | null; needsReconnect: boolean }> {
  const res = await xeroFetch(accessToken, tenantId, `/api.xro/2.0/Reports/BalanceSheet?date=${asOf}`)
  if (!res.ok) return { balance: null, needsReconnect: res.status === 403 || res.status === 401 }
  const rows: any[] = res.data?.Reports?.[0]?.Rows || []
  for (const row of rows) {
    if (row.RowType === 'Section' && /bank/i.test(row.Title || '')) {
      const summary = (row.Rows || []).find((r: any) => r.RowType === 'SummaryRow')
      if (summary) {
        const amt = cellValue(summary.Cells, summary.Cells.length - 1)
        if (typeof amt === 'number') return { balance: amt, needsReconnect: false }
      }
      const sum = (row.Rows || []).filter((r: any) => r.RowType === 'Row').reduce((s: number, r: any) => {
        const amt = cellValue(r.Cells, r.Cells.length - 1)
        return s + (typeof amt === 'number' ? amt : 0)
      }, 0)
      return { balance: sum, needsReconnect: false }
    }
  }
  return { balance: null, needsReconnect: false }
}
