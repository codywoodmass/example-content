'use client'
import { useEffect, useState } from 'react'

export default function InvoicePrintPage() {
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('invoice_print_data')
      if (stored) setData(JSON.parse(stored))
    } catch (e) {}
  }, [])

  useEffect(() => {
    if (data) setTimeout(() => window.print(), 800)
  }, [data])

  if (!data) return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: 40, color: '#333' }}>
      <p>No invoice data found. Please go back and click "Export PDF" from the Invoices page.</p>
    </div>
  )

  const { invoiceNumber, clientName, clientEmail, createdAt, items, subtotal, gst, total } = data

  return (
    <>
      <style>{`
        @media print {
          @page { size: portrait; margin: 0; }
          body { margin: 0; }
        }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      `}</style>
      <div style={{ width: '100vw', minHeight: '100vh', background: '#fff', color: '#111', fontFamily: 'Inter, sans-serif', padding: '64px 72px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 56 }}>
          <img src="/images/Pale_logo_EX.png" alt="Example Content" style={{ height: 40, objectFit: 'contain', filter: 'invert(1)' }} />
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 4 }}>INVOICE</div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)' }}>#{invoiceNumber}</div>
            <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.5)' }}>{new Date(createdAt).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
        </div>
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', marginBottom: 6 }}>Bill to</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{clientName || clientEmail}</div>
          <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.5)' }}>{clientEmail}</div>
        </div>
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.12)', borderBottom: '1px solid rgba(0,0,0,0.12)', marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', padding: '10px 0', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', fontWeight: 700 }}>
            <div>Description</div>
            <div style={{ textAlign: 'right' }}>Amount</div>
          </div>
          {(items || []).map((item: any, i: number) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 140px', padding: '12px 0', borderTop: '0.5px solid rgba(0,0,0,0.08)', fontSize: 14 }}>
              <div>{item.title}</div>
              <div style={{ textAlign: 'right', fontWeight: 500 }}>${(item.amount || 0).toLocaleString()}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <div style={{ width: 260 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: 'rgba(0,0,0,0.5)' }}><span>Subtotal</span><span>${(subtotal || 0).toLocaleString()}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: 'rgba(0,0,0,0.5)' }}><span>GST (15%)</span><span>${(gst || 0).toLocaleString()}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderTop: '1px solid rgba(0,0,0,0.15)', marginTop: 6, fontSize: 18, fontWeight: 800 }}><span>Total</span><span>${(total || 0).toLocaleString()}</span></div>
          </div>
        </div>
        <div style={{ marginTop: 64, fontSize: 11, color: 'rgba(0,0,0,0.35)', lineHeight: 1.7 }}>
          Example Content · Payment due within 14 days · Bank details supplied separately
        </div>
      </div>
    </>
  )
}
