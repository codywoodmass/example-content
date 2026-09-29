'use client'
import StudioSidebar from '../StudioSidebar'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { xeroAuthedFetch } from '@/lib/xeroClient'
import { notify, confirmDialog, ToastHost, ConfirmHost } from '@/lib/notify'

type InvoiceProject = { id: string; title: string; address: string; amount: number | null; email: string }
type Invoice = {
  id: string
  client_email: string
  client_name: string | null
  status: 'draft' | 'sent' | 'paid'
  subtotal: number
  gst: number
  total: number
  created_at: string
  sent_at: string | null
  paid_at: string | null
  xero_invoice_id: string | null
}

async function syncXero(invoiceId: string) {
  try {
    const res = await xeroAuthedFetch('/api/xero/invoice', { method: 'POST', body: JSON.stringify({ invoiceId }) })
    return res.ok
  } catch (e) { return false }
}

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  draft: { color: 'rgba(210,175,80,0.9)', bg: 'rgba(65,52,18,0.4)' },
  sent: { color: 'rgba(100,150,220,0.9)', bg: 'rgba(25,45,80,0.4)' },
  paid: { color: 'rgba(100,200,130,0.9)', bg: 'rgba(30,70,45,0.4)' },
}

export default function InvoicesPage() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [lineItems, setLineItems] = useState<Record<string, InvoiceProject[]>>({})
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
      if (profile?.role !== 'studio') { router.push('/portal/studio'); return }
      setAllowed(true)
      loadInvoices()
    })
  }, [])

  async function loadInvoices() {
    setLoading(true)
    const { data: inv } = await supabase.from('invoices1').select('*').order('created_at', { ascending: false })
    const { data: projects } = await supabase.from('projects1').select('id, title, address, amount, email, invoice_id').not('invoice_id', 'is', null)
    const grouped: Record<string, InvoiceProject[]> = {}
    for (const p of projects || []) {
      const key = (p as any).invoice_id as string
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(p)
    }
    setInvoices(inv || [])
    setLineItems(grouped)
    setLoading(false)
  }

  function recompute(items: InvoiceProject[]) {
    const subtotal = items.reduce((sum, i) => sum + (i.amount || 0), 0)
    const gst = Math.round(subtotal * 0.15 * 100) / 100
    return { subtotal, gst, total: subtotal + gst }
  }

  function setLineAmountLocal(invoiceId: string, projectId: string, amount: number) {
    setLineItems(p => ({ ...p, [invoiceId]: (p[invoiceId] || []).map(i => i.id === projectId ? { ...i, amount } : i) }))
  }

  async function commitLineAmount(invoiceId: string, projectId: string, amount: number) {
    await supabase.from('projects1').update({ amount }).eq('id', projectId)
    const items = lineItems[invoiceId] || []
    const totals = recompute(items)
    await supabase.from('invoices1').update(totals).eq('id', invoiceId)
    setInvoices(p => p.map(inv => inv.id === invoiceId ? { ...inv, ...totals } : inv))
    syncXero(invoiceId)
  }

  async function removeLineItem(invoiceId: string, projectId: string) {
    const invoice = invoices.find(inv => inv.id === invoiceId)
    if (invoice && invoice.status !== 'draft') {
      if (!(await confirmDialog('This invoice was already marked as sent. Removing this line won\'t un-send anything already sent to the client, but it will free this project up to be invoiced separately (e.g. if it was swept onto the wrong invoice). Continue?'))) return
    }
    // Restore the project to active/visible so it can actually be re-invoiced —
    // marking an invoice sent archives every project on it, so without this the
    // project would just vanish from the normal views after being unlinked.
    await supabase.from('projects1').update({ invoice_id: null, archived: false }).eq('id', projectId)
    const items = (lineItems[invoiceId] || []).filter(i => i.id !== projectId)
    setLineItems(p => ({ ...p, [invoiceId]: items }))
    const totals = recompute(items)
    await supabase.from('invoices1').update(totals).eq('id', invoiceId)
    setInvoices(p => p.map(inv => inv.id === invoiceId ? { ...inv, ...totals } : inv))
    syncXero(invoiceId)
    notify('Project removed from invoice and restored to active', 'success')
  }

  async function markSent(invoice: Invoice) {
    setBusyId(invoice.id)
    try {
      const items = lineItems[invoice.id] || []
      const sent_at = new Date().toISOString()
      try {
        await xeroAuthedFetch('/api/send-invoice', {
          method: 'POST',
          body: JSON.stringify({
            invoiceId: invoice.id, clientEmail: invoice.client_email, clientName: invoice.client_name,
            items: items.map(i => ({ title: i.title || i.address, amount: i.amount || 0 })),
            subtotal: invoice.subtotal, gst: invoice.gst, total: invoice.total,
          }),
        })
      } catch (e) { console.error('send-invoice error:', e) }
      await supabase.from('invoices1').update({ status: 'sent', sent_at }).eq('id', invoice.id)
      await supabase.from('projects1').update({ archived: true }).in('id', items.map(i => i.id))
      setInvoices(p => p.map(inv => inv.id === invoice.id ? { ...inv, status: 'sent', sent_at } : inv))
    } finally {
      setBusyId(null)
    }
  }

  async function markPaid(invoice: Invoice) {
    const paid_at = new Date().toISOString()
    await supabase.from('invoices1').update({ status: 'paid', paid_at }).eq('id', invoice.id)
    setInvoices(p => p.map(inv => inv.id === invoice.id ? { ...inv, status: 'paid', paid_at } : inv))
  }

  function exportPdf(invoice: Invoice) {
    const items = lineItems[invoice.id] || []
    const printData = {
      invoiceNumber: invoice.id.slice(0, 8).toUpperCase(),
      clientName: invoice.client_name, clientEmail: invoice.client_email,
      createdAt: invoice.created_at, items,
      subtotal: invoice.subtotal, gst: invoice.gst, total: invoice.total,
    }
    localStorage.setItem('invoice_print_data', JSON.stringify(printData))
    window.open('/portal/studio/invoices/' + invoice.id + '/print', '_blank')
  }

  const grouped: Record<string, Invoice[]> = { draft: [], sent: [], paid: [] }
  for (const inv of invoices) grouped[inv.status]?.push(inv)

  if (loading) return (
    <main style={{ background: '#0E1014', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ color: 'rgba(200,194,187,0.4)', fontSize: 13 }}>Loading invoices...</div>
    </main>
  )

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', fontSize: 13, display: 'flex' }}>
      <ToastHost />
      <ConfirmHost />
      <StudioSidebar active="invoices" />
      <div style={{ flex: 1, overflowX: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 57, borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Invoices</div>
            <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 1 }}>{grouped.draft.length} draft · {grouped.sent.length} sent · {grouped.paid.length} paid</div>
          </div>
        </div>
        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 32 }}>
          {(['draft', 'sent', 'paid'] as const).map(status => (
            grouped[status].length > 0 && (
              <div key={status}>
                <div style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)', marginBottom: 14 }}>{status} invoices</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {grouped[status].map(invoice => {
                    const items = lineItems[invoice.id] || []
                    const sc = STATUS_COLORS[invoice.status]
                    return (
                      <div key={invoice.id} style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '18px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 2 }}>{invoice.client_name || invoice.client_email}</div>
                            <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)' }}>{invoice.client_email} · {new Date(invoice.created_at).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                          </div>
                          <span style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 2, background: sc.bg, color: sc.color, border: `0.5px solid ${sc.color}` }}>{invoice.status}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                          {items.map(item => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'rgba(200,194,187,0.03)', borderRadius: 4 }}>
                              <span style={{ flex: 1, fontSize: 12, color: '#C8C2BB' }}>{item.title || item.address || 'Untitled project'}</span>
                              {invoice.status !== 'paid' ? (
                                <>
                                  <input type="number" min="0" step="0.01" value={item.amount ?? ''} onChange={e => setLineAmountLocal(invoice.id, item.id, e.target.value === '' ? 0 : parseFloat(e.target.value))} onBlur={e => commitLineAmount(invoice.id, item.id, e.target.value === '' ? 0 : parseFloat(e.target.value))} style={{ width: 90, background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 3, padding: '5px 8px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', textAlign: 'right' }} />
                                  <button onClick={() => removeLineItem(invoice.id, item.id)} style={{ fontSize: 10, color: 'rgba(210,90,90,0.7)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                                </>
                              ) : (
                                <span style={{ fontSize: 12, color: 'rgba(200,194,187,0.6)' }}>${(item.amount || 0).toLocaleString()}</span>
                              )}
                            </div>
                          ))}
                          {items.length === 0 && <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>No line items</div>}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '0.5px solid rgba(200,194,187,0.09)' }}>
                          <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.4)' }}>Subtotal ${invoice.subtotal.toLocaleString()} + GST ${invoice.gst.toLocaleString()} = <span style={{ color: '#C8C2BB', fontWeight: 500 }}>${invoice.total.toLocaleString()}</span></div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {invoice.xero_invoice_id && (
                              <a href={`https://go.xero.com/AccountsReceivable/Edit.aspx?InvoiceID=${invoice.xero_invoice_id}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(100,150,220,0.3)', color: 'rgba(100,150,220,0.85)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>View in Xero →</a>
                            )}
                            <button onClick={() => exportPdf(invoice)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Export PDF</button>
                            {invoice.status === 'draft' && (
                              <button disabled={busyId === invoice.id || items.length === 0} onClick={() => markSent(invoice)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: busyId === invoice.id ? 'not-allowed' : 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>{busyId === invoice.id ? 'Sending...' : 'Mark as sent'}</button>
                            )}
                            {invoice.status === 'sent' && (
                              <button onClick={() => markPaid(invoice)} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 14px', borderRadius: 3, border: '0.5px solid rgba(100,200,130,0.4)', color: 'rgba(100,200,130,0.9)', background: 'rgba(100,200,130,0.08)', cursor: 'pointer', fontFamily: 'inherit' }}>Mark as paid</button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          ))}
          {invoices.length === 0 && <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>No invoices yet — send a completed project to invoice from Projects.</div>}
        </div>
      </div>
    </main>
  )
}
