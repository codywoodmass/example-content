'use client'
import { useEffect, useState } from 'react'

// In-app replacements for the browser's native alert()/confirm() — those show as
// "localhost says..." dialogs owned by the browser chrome, not the app. Mount
// <ToastHost /> and <ConfirmHost /> once per page, then use notify()/confirmDialog()
// anywhere (event handlers, async functions) exactly like alert()/confirm().

type ToastType = 'success' | 'error' | 'info'
type Toast = { id: number; message: string; type: ToastType }
type ConfirmRequest = { id: number; message: string }

let toastSeq = 0
let confirmSeq = 0
const confirmResolvers = new Map<number, (result: boolean) => void>()

export function notify(message: string, type: ToastType = 'info') {
  window.dispatchEvent(new CustomEvent<Toast>('app-toast', { detail: { id: ++toastSeq, message, type } }))
}

export function confirmDialog(message: string): Promise<boolean> {
  return new Promise(resolve => {
    const id = ++confirmSeq
    confirmResolvers.set(id, resolve)
    window.dispatchEvent(new CustomEvent<ConfirmRequest>('app-confirm', { detail: { id, message } }))
  })
}

export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    function onToast(e: Event) {
      const toast = (e as CustomEvent<Toast>).detail
      setToasts(t => [...t, toast])
      setTimeout(() => setToasts(t => t.filter(x => x.id !== toast.id)), 5000)
    }
    window.addEventListener('app-toast', onToast)
    return () => window.removeEventListener('app-toast', onToast)
  }, [])

  if (toasts.length === 0) return null

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 20000, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340 }}>
      {toasts.map(t => {
        const c = t.type === 'error' ? { bg: 'rgba(60,20,20,0.97)', border: 'rgba(210,90,90,0.35)', text: 'rgba(240,190,190,0.95)' }
          : t.type === 'success' ? { bg: 'rgba(20,50,30,0.97)', border: 'rgba(100,200,130,0.35)', text: 'rgba(190,235,200,0.95)' }
          : { bg: '#1A1F28', border: 'rgba(200,194,187,0.15)', text: '#C8C2BB' }
        return (
          <div key={t.id} onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))} style={{ background: c.bg, border: `0.5px solid ${c.border}`, borderRadius: 7, padding: '12px 16px', color: c.text, fontSize: 12, lineHeight: 1.5, fontFamily: 'Inter, sans-serif', boxShadow: '0 10px 30px rgba(0,0,0,0.45)', cursor: 'pointer', whiteSpace: 'pre-wrap' }}>
            {t.message}
          </div>
        )
      })}
    </div>
  )
}

export function ConfirmHost() {
  const [req, setReq] = useState<ConfirmRequest | null>(null)

  useEffect(() => {
    function onConfirm(e: Event) { setReq((e as CustomEvent<ConfirmRequest>).detail) }
    window.addEventListener('app-confirm', onConfirm)
    return () => window.removeEventListener('app-confirm', onConfirm)
  }, [])

  function respond(result: boolean) {
    if (!req) return
    confirmResolvers.get(req.id)?.(result)
    confirmResolvers.delete(req.id)
    setReq(null)
  }

  if (!req) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 20001, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => respond(false)}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, padding: 24, width: 400, maxWidth: '100%', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ fontSize: 13, color: '#C8C2BB', lineHeight: 1.65, marginBottom: 22, whiteSpace: 'pre-wrap' }}>{req.message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={() => respond(false)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, border: '0.5px solid rgba(200,194,187,0.2)', color: 'rgba(200,194,187,0.5)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <button onClick={() => respond(true)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>Confirm</button>
        </div>
      </div>
    </div>
  )
}
