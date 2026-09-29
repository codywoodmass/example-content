import { NextRequest, NextResponse } from 'next/server'
import { requireStudioUser, getValidXeroToken, xeroFetch } from '@/lib/xero'

const toDateStr = (d: Date) => d.toISOString().split('T')[0]

// Xero's ProfitAndLoss report defaults to the CURRENT MONTH when called with no
// date params, not the financial year to date as its own UI report implies — an
// explicit fromDate is required to get YTD. The organisation's actual financial
// year end (which isn't always 31 Mar) tells us where "year to date" starts.
async function getFinancialYearStart(accessToken: string, tenantId: string): Promise<string> {
  const now = new Date()
  try {
    const { ok, data } = await xeroFetch(accessToken, tenantId, '/api.xro/2.0/Organisation')
    const org = data?.Organisations?.[0]
    const endMonth = org?.FinancialYearEndMonth
    const endDay = org?.FinancialYearEndDay
    if (ok && endMonth && endDay) {
      const thisYearEnd = new Date(now.getFullYear(), endMonth - 1, endDay)
      const mostRecentEnd = now <= thisYearEnd ? new Date(now.getFullYear() - 1, endMonth - 1, endDay) : thisYearEnd
      const start = new Date(mostRecentEnd)
      start.setDate(start.getDate() + 1)
      return toDateStr(start)
    }
  } catch (e) {
    console.error('Xero organisation fetch error:', e)
  }
  // Fallback if the organisation lookup fails: NZ standard fiscal year, 1 Apr - 31 Mar.
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return `${year}-04-01`
}

function cellValue(cells: any[], idx: number) {
  const v = cells?.[idx]?.Value
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : v
}

function parseSection(section: any) {
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

// A multi-period report has one column per month instead of one YTD column — each
// row's Cells run [label, period1, period2, ...]. Pulls the revenue and net profit
// totals out of that shape into a simple per-month series for the monthly chart.
function parseMonthly(reportRows: any[]) {
  const header = reportRows.find((r: any) => r.RowType === 'Header')
  const periodLabels: string[] = (header?.Cells || []).slice(1).map((c: any) => {
    const d = new Date(c.Value)
    return Number.isNaN(d.getTime()) ? c.Value : d.toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' })
  })
  const toNumbers = (cells: any[]) => cells.slice(1).map((c: any) => { const n = parseFloat(c?.Value); return Number.isFinite(n) ? n : 0 })

  let revenueByPeriod: number[] = []
  let netByPeriod: number[] = []
  for (const row of reportRows) {
    if (row.RowType === 'Section') {
      const title = (row.Title || '').toLowerCase()
      if (title.includes('income') || title.includes('revenue') || title.includes('trading')) {
        const summaryRow = (row.Rows || []).find((r: any) => r.RowType === 'SummaryRow')
        if (summaryRow) revenueByPeriod = toNumbers(summaryRow.Cells)
      }
    }
    if (row.RowType === 'Row') {
      const label = (row.Cells?.[0]?.Value || '').toLowerCase()
      if (label.includes('net profit') || label.includes('net income')) netByPeriod = toNumbers(row.Cells)
    }
  }
  return periodLabels.map((label, i) => ({ label, revenue: revenueByPeriod[i] || 0, net: netByPeriod[i] || 0 }))
}

// BankSummary has no periods/timeframe param (unlike ProfitAndLoss) — only
// fromDate/toDate for a single range — so a 6-month view means one call per
// month. Its SummaryRow already totals cash received/spent across every bank
// account in the org, which is exactly what "all accounts combined" needs.
function parseBankSummaryTotals(rows: any[]): { cashIn: number; cashOut: number } {
  for (const row of rows) {
    if (row.RowType === 'Section') {
      const summaryRow = (row.Rows || []).find((r: any) => r.RowType === 'SummaryRow')
      if (summaryRow) {
        const cashIn = parseFloat(summaryRow.Cells?.[2]?.Value)
        const cashOut = parseFloat(summaryRow.Cells?.[3]?.Value)
        return { cashIn: Number.isFinite(cashIn) ? cashIn : 0, cashOut: Number.isFinite(cashOut) ? Math.abs(cashOut) : 0 }
      }
    }
  }
  return { cashIn: 0, cashOut: 0 }
}

async function getCashFlow(accessToken: string, tenantId: string, monthCount: number) {
  const now = new Date()
  const months = Array.from({ length: monthCount }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (monthCount - 1 - i), 1)
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return { label: d.toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' }), from: toDateStr(start), to: toDateStr(end) }
  })
  return Promise.all(months.map(async m => {
    try {
      const res = await xeroFetch(accessToken, tenantId, `/api.xro/2.0/Reports/BankSummary?fromDate=${m.from}&toDate=${m.to}`)
      const totals = res.ok ? parseBankSummaryTotals(res.data?.Reports?.[0]?.Rows || []) : { cashIn: 0, cashOut: 0 }
      return { label: m.label, ...totals }
    } catch {
      return { label: m.label, cashIn: 0, cashOut: 0 }
    }
  }))
}

// Xero stores dates as either a plain ISO string or the legacy /Date(ms+tz)/ format
// depending on the field — handle both rather than assume one.
function parseXeroDate(value: string | undefined): Date | null {
  if (!value) return null
  const msMatch = value.match(/\/Date\((\d+)/)
  if (msMatch) return new Date(parseInt(msMatch[1], 10))
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

// Pulls real outstanding/overdue invoices straight from Xero (AUTHORISED = sent
// and awaiting payment in Xero's terms) rather than relying only on our own
// invoices1 tracking, which can drift out of sync if a client pays directly.
async function getOutstandingInvoices(accessToken: string, tenantId: string) {
  try {
    const where = encodeURIComponent('Type=="ACCREC" && Status=="AUTHORISED"')
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
    console.error('Xero invoices fetch error:', e)
    return { items: [], outstandingTotal: 0, overdueTotal: 0 }
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireStudioUser(req)
  if (!auth.ok) return auth.response

  const token = await getValidXeroToken(auth.supabase)
  if (!token) return NextResponse.json({ connected: false })

  const monthsParam = parseInt(req.nextUrl.searchParams.get('months') || '6', 10)
  const months = [3, 6, 12].includes(monthsParam) ? monthsParam : 6

  // The monthly breakdown, cash flow (6 calls) and outstanding invoices don't
  // depend on the financial-year start date, so kick them off immediately instead
  // of waiting on the main YTD report — this alone roughly halves wall-clock time
  // since cash flow's 6 Xero calls were previously the slowest link in a fully
  // sequential chain.
  const monthlyPromise = xeroFetch(token.accessToken, token.tenantId, `/api.xro/2.0/Reports/ProfitAndLoss?periods=${months - 1}&timeframe=MONTH`)
    .then(res => res.ok ? parseMonthly(res.data?.Reports?.[0]?.Rows || []) : [])
    .catch((e) => { console.error('Xero monthly P&L error:', e); return [] })
  const cashFlowPromise = getCashFlow(token.accessToken, token.tenantId, months)
    .catch((e) => { console.error('Xero cash flow error:', e); return [] })
  const outstandingPromise = getOutstandingInvoices(token.accessToken, token.tenantId)

  const fyStart = await getFinancialYearStart(token.accessToken, token.tenantId)
  const todayStr = toDateStr(new Date())
  const { ok, status, data } = await xeroFetch(token.accessToken, token.tenantId, `/api.xro/2.0/Reports/ProfitAndLoss?fromDate=${fyStart}&toDate=${todayStr}`)
  if (!ok) return NextResponse.json({ connected: true, error: data?.Message || 'Xero report request failed' }, { status })

  const rows: any[] = data?.Reports?.[0]?.Rows || []
  let revenue = { items: [] as any[], total: 0 }
  let expenses = { items: [] as any[], total: 0 }
  let netProfit = 0

  for (const row of rows) {
    if (row.RowType === 'Section') {
      const title = (row.Title || '').toLowerCase()
      const parsed = parseSection(row)
      if (title.includes('income') || title.includes('revenue') || title.includes('trading')) {
        revenue.items.push(...parsed.items)
        revenue.total += parsed.total
      }
      else if (title.includes('expense') || title.includes('cost of')) {
        expenses.items.push(...parsed.items)
        expenses.total += parsed.total
      }
    }
    if (row.RowType === 'Row') {
      const label = (row.Cells?.[0]?.Value || '').toLowerCase()
      const amount = cellValue(row.Cells, row.Cells.length - 1)
      if (label.includes('net profit') || label.includes('net income') && typeof amount === 'number') netProfit = amount
    }
  }
  if (!netProfit) netProfit = revenue.total - expenses.total

  const [monthly, cashFlow, outstandingInvoices] = await Promise.all([monthlyPromise, cashFlowPromise, outstandingPromise])

  return NextResponse.json({
    connected: true,
    reportDate: data?.Reports?.[0]?.ReportDate,
    revenueTotal: revenue.total,
    expensesTotal: expenses.total,
    netProfit,
    revenueBreakdown: revenue.items,
    expensesBreakdown: expenses.items,
    monthly,
    cashFlow,
    outstandingInvoices,
  })
}
