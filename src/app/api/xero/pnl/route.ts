import { NextRequest, NextResponse } from 'next/server'
import { requireStudioUser, getValidXeroToken, xeroFetch } from '@/lib/xero'
import { toDateStr, cellValue, parseSection, getOutstandingInvoices, getRecentPayments } from '@/lib/xeroReports'

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

// A multi-period report has one column per month instead of one YTD column — each
// row's Cells run [label, period1, period2, ...]. Pulls the revenue and net profit
// totals out of that shape into a simple per-month series for the monthly chart.
function parseMonthly(reportRows: any[]) {
  const header = reportRows.find((r: any) => r.RowType === 'Header')
  const periodLabels: string[] = (header?.Cells || []).slice(1).map((c: any) => {
    const d = new Date(c.Value)
    return Number.isNaN(d.getTime()) ? c.Value : d.toLocaleDateString('en-NZ', { month: 'short', year: 'numeric' })
  })
  const toNumbers = (cells: any[]) => cells.slice(1).map((c: any) => { const raw = typeof c?.Value === 'string' ? c.Value.replace(/,/g, '') : c?.Value; const n = parseFloat(raw); return Number.isFinite(n) ? n : 0 })

  let revenueByPeriod: number[] = []
  let netByPeriod: number[] = []
  for (const row of reportRows) {
    if (row.RowType === 'Section') {
      const title = (row.Title || '').toLowerCase()
      // A P&L can have more than one income-ish section (e.g. "Trading Income"
      // plus a separate "Other Income" for interest etc) — sum every match
      // instead of letting the last one found overwrite the rest, which was
      // previously collapsing revenue down to whichever tiny section came last.
      if (title.includes('income') || title.includes('revenue') || title.includes('trading')) {
        const summaryRow = (row.Rows || []).find((r: any) => r.RowType === 'SummaryRow')
        if (summaryRow) {
          const nums = toNumbers(summaryRow.Cells)
          revenueByPeriod = revenueByPeriod.length ? revenueByPeriod.map((v, i) => v + (nums[i] || 0)) : nums
        }
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
  // Xero's ProfitAndLoss report only accepts periods 1-11 for timeframe=MONTH —
  // periods=12 (tried briefly, for a clean 13-month "same month last year"
  // lookback) gets rejected outright by Xero, which silently emptied this
  // whole panel. 11 is the real ceiling, giving 12 data points (this month +
  // 11 trailing) — one short of a full year-ago comparison, which the client
  // already guards for (n >= 13) rather than showing a wrong number.
  const monthlyPromise = xeroFetch(token.accessToken, token.tenantId, `/api.xro/2.0/Reports/ProfitAndLoss?periods=11&timeframe=MONTH`)
    .then(res => res.ok ? parseMonthly(res.data?.Reports?.[0]?.Rows || []) : [])
    .catch((e) => { console.error('Xero monthly P&L error:', e); return [] })
  const cashFlowPromise = getCashFlow(token.accessToken, token.tenantId, months)
    .catch((e) => { console.error('Xero cash flow error:', e); return [] })
  const outstandingPromise = getOutstandingInvoices(token.accessToken, token.tenantId)
  const recentPaymentsPromise = getRecentPayments(token.accessToken, token.tenantId)

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

  const [monthly, cashFlow, outstandingInvoices, recentPayments] = await Promise.all([monthlyPromise, cashFlowPromise, outstandingPromise, recentPaymentsPromise])

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
    recentPayments,
  })
}
