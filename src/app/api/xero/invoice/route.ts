import { NextRequest, NextResponse } from 'next/server'
import { requireStudioUser, getValidXeroToken, xeroFetch } from '@/lib/xero'

// Only attaches the invoice to an existing Xero contact when we can confirm an
// exact, unambiguous match (by email first, then by exact name) — Xero's own
// invoice-creation behavior otherwise fuzzy-matches by Name and will silently
// attach to (or create a duplicate of) whatever it finds, which risks invoicing
// under the wrong client's contact with no visible warning. If nothing matches
// confidently, we deliberately don't guess: the invoice still gets created (Xero
// requires some contact), but under an unmistakably-flagged placeholder name so
// it's obvious in Xero that it needs manual relinking rather than looking correct.
async function resolveContact(accessToken: string, tenantId: string, email: string | null, name: string | null): Promise<{ ContactID: string } | { Name: string }> {
  const escape = (v: string) => v.replace(/"/g, '\\"')
  if (email) {
    try {
      const res = await xeroFetch(accessToken, tenantId, `/api.xro/2.0/Contacts?where=${encodeURIComponent(`EmailAddress=="${escape(email)}"`)}`)
      const matches = res.ok ? (res.data?.Contacts || []) : []
      if (matches.length === 1) return { ContactID: matches[0].ContactID }
    } catch (e) { console.error('Xero contact email lookup error:', e) }
  }
  if (name) {
    try {
      const res = await xeroFetch(accessToken, tenantId, `/api.xro/2.0/Contacts?where=${encodeURIComponent(`Name=="${escape(name)}"`)}`)
      const matches = res.ok ? (res.data?.Contacts || []) : []
      if (matches.length === 1) return { ContactID: matches[0].ContactID }
    } catch (e) { console.error('Xero contact name lookup error:', e) }
  }
  return { Name: `Unmatched — ${name || email || 'Unknown client'}` }
}

export async function POST(req: NextRequest) {
  const auth = await requireStudioUser(req)
  if (!auth.ok) return auth.response

  const { invoiceId } = await req.json()
  if (!invoiceId) return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })

  const token = await getValidXeroToken(auth.supabase)
  if (!token) return NextResponse.json({ error: 'Xero is not connected' }, { status: 400 })

  const { data: invoice } = await auth.supabase.from('invoices1').select('*').eq('id', invoiceId).single()
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })

  const { data: items } = await auth.supabase.from('projects1').select('id, title, address, amount').eq('invoice_id', invoiceId)
  const lineItems = (items || []).map(i => ({
    Description: i.title || i.address || 'Project',
    Quantity: 1,
    UnitAmount: i.amount || 0,
  }))
  if (lineItems.length === 0) return NextResponse.json({ error: 'No line items to send' }, { status: 400 })

  const path = invoice.xero_invoice_id ? `/api.xro/2.0/Invoices/${invoice.xero_invoice_id}` : '/api.xro/2.0/Invoices'
  const body = invoice.xero_invoice_id
    ? { Invoices: [{ InvoiceID: invoice.xero_invoice_id, LineItems: lineItems }] }
    : { Invoices: [{ Type: 'ACCREC', Contact: await resolveContact(token.accessToken, token.tenantId, invoice.client_email, invoice.client_name), LineItems: lineItems, Status: 'DRAFT' }] }

  const { ok, status, data } = await xeroFetch(token.accessToken, token.tenantId, path, { method: 'POST', body: JSON.stringify(body) })
  if (!ok) {
    const message = data?.Elements?.[0]?.ValidationErrors?.map((e: any) => e.Message).join(', ') || data?.Message || 'Xero invoice request failed'
    return NextResponse.json({ error: message }, { status })
  }

  const xeroInvoiceId = data?.Invoices?.[0]?.InvoiceID
  if (xeroInvoiceId && !invoice.xero_invoice_id) {
    await auth.supabase.from('invoices1').update({ xero_invoice_id: xeroInvoiceId }).eq('id', invoiceId)
  }

  return NextResponse.json({ success: true, xeroInvoiceId: xeroInvoiceId || invoice.xero_invoice_id })
}
