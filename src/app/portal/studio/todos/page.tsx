'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import StudioSidebar from '../StudioSidebar'
import { notify, confirmDialog, ToastHost, ConfirmHost } from '@/lib/notify'

type Todo = { id: string; text: string; due_date: string | null; done: boolean; created_at: string }

const BUCKET_ORDER = ['Overdue', 'Today', 'Tomorrow', 'This week', 'Later', 'No date']
const BUCKET_COLOR: Record<string, string> = {
  Overdue: 'rgba(210,90,90,0.9)',
  Today: 'rgba(210,175,80,0.9)',
  Tomorrow: 'rgba(100,150,220,0.9)',
  'This week': 'rgba(100,200,130,0.9)',
  Later: 'rgba(160,100,220,0.9)',
  'No date': 'rgba(200,194,187,0.35)',
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [newDate, setNewDate] = useState('')
  const [showDone, setShowDone] = useState(false)

  const todayStr = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]
  const weekAhead = new Date(); weekAhead.setDate(weekAhead.getDate() + 7)

  useEffect(() => { loadTodos() }, [])

  async function loadTodos() {
    setLoading(true)
    const { data } = await supabase.from('todos').select('*')
      .order('done', { ascending: true })
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
    setTodos(data || [])
    setLoading(false)
  }

  async function addTodo() {
    if (!newText.trim()) return
    const { data, error } = await supabase.from('todos').insert([{ text: newText.trim(), due_date: newDate || null }]).select().single()
    if (error) { notify('Error adding task: ' + error.message, 'error'); return }
    setTodos(p => [...p, data])
    setNewText('')
    setNewDate('')
  }

  async function toggleTodo(todo: Todo) {
    await supabase.from('todos').update({ done: !todo.done }).eq('id', todo.id)
    loadTodos()
  }

  async function updateDate(id: string, due_date: string) {
    await supabase.from('todos').update({ due_date: due_date || null }).eq('id', id)
    loadTodos()
  }

  async function deleteTodo(id: string) {
    if (!(await confirmDialog('Delete this task?'))) return
    await supabase.from('todos').delete().eq('id', id)
    setTodos(p => p.filter(t => t.id !== id))
  }

  function dateLabel(due_date: string) {
    if (due_date === todayStr) return 'Today'
    if (due_date === tomorrowStr) return 'Tomorrow'
    return new Date(due_date + 'T12:00:00').toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
  }

  function bucketOf(t: Todo): string {
    if (!t.due_date) return 'No date'
    if (t.due_date < todayStr) return 'Overdue'
    if (t.due_date === todayStr) return 'Today'
    if (t.due_date === tomorrowStr) return 'Tomorrow'
    return new Date(t.due_date + 'T12:00:00') <= weekAhead ? 'This week' : 'Later'
  }

  const active = todos.filter(t => !t.done)
  const done = todos.filter(t => t.done)
  const overdueCount = active.filter(t => t.due_date && t.due_date < todayStr).length
  const todayCount = active.filter(t => t.due_date === todayStr).length

  const buckets = BUCKET_ORDER.map(label => ({ label, items: active.filter(t => bucketOf(t) === label) })).filter(b => b.items.length > 0)

  const inp: React.CSSProperties = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 4, padding: '8px 10px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none' }
  const kpiCard = (bg: string, borderCol: string): React.CSSProperties => ({ background: `linear-gradient(135deg, ${bg} 0%, rgba(20,24,32,0.95) 100%)`, border: `0.5px solid ${borderCol}`, borderRadius: 10, padding: '14px 16px', position: 'relative', overflow: 'hidden' })
  const glow = (color: string) => <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

  function TaskRow({ t, i, total }: { t: Todo; i: number; total: number }) {
    const overdue = t.due_date && t.due_date < todayStr
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', borderBottom: i < total - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none' }}>
        <div onClick={() => toggleTodo(t)} style={{ width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${overdue ? 'rgba(210,90,90,0.5)' : 'rgba(200,194,187,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: 13, color: '#C8C2BB' }}>{t.text}</div>
        {t.due_date && <span style={{ fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase' as const, color: overdue ? 'rgba(210,90,90,0.8)' : 'rgba(200,194,187,0.35)', whiteSpace: 'nowrap' as const }}>{overdue ? '⚠ ' : ''}{dateLabel(t.due_date)}</span>}
        <input type="date" value={t.due_date || ''} onChange={e => updateDate(t.id, e.target.value)} style={{ ...inp, padding: '5px 6px', fontSize: 10, width: 96, opacity: 0.45, cursor: 'pointer', flexShrink: 0 }} title="Change date" />
        <button onClick={() => deleteTodo(t.id)} style={{ fontSize: 16, color: 'rgba(200,194,187,0.3)', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
      </div>
    )
  }

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', fontSize: 13, display: 'flex' }}>
      <ToastHost />
      <ConfirmHost />
      <StudioSidebar active="todos" />
      <div style={{ flex: 1, overflowX: 'hidden', overflowY: 'auto' }}>
        <div style={{ padding: '16px 28px', borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: 'rgba(210,175,80,0.1)', border: '0.5px solid rgba(210,175,80,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>✅</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', textTransform: 'uppercase', fontStyle: 'italic' }}>To Do List</div>
            <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 2 }}>{active.length} open · {done.length} done</div>
          </div>
        </div>
        <div style={{ padding: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
            <div style={kpiCard('rgba(25,45,80,0.6)', 'rgba(100,150,220,0.2)')}>
              {glow('rgba(100,150,220,0.5)')}
              <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 8 }}>Open</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#fff' }}>{active.length}</div>
            </div>
            <div style={kpiCard('rgba(65,52,18,0.6)', 'rgba(210,175,80,0.25)')}>
              {glow('rgba(210,175,80,0.5)')}
              <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(210,175,80,0.6)', marginBottom: 8 }}>Due today</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: 'rgba(210,175,80,0.95)' }}>{todayCount}</div>
            </div>
            <div style={kpiCard('rgba(50,30,30,0.6)', 'rgba(210,90,90,0.2)')}>
              {glow('rgba(210,90,90,0.5)')}
              <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(210,90,90,0.6)', marginBottom: 8 }}>Overdue</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: overdueCount > 0 ? 'rgba(210,90,90,0.95)' : '#fff' }}>{overdueCount}</div>
            </div>
            <div style={kpiCard('rgba(30,50,38,0.6)', 'rgba(100,200,130,0.2)')}>
              {glow('rgba(100,200,130,0.5)')}
              <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 8 }}>Completed</div>
              <div style={{ fontSize: 24, fontWeight: 600, color: '#fff' }}>{done.length}</div>
            </div>
          </div>

          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: 18, marginBottom: 28 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              <input value={newText} onChange={e => setNewText(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTodo()} placeholder="Add a task..." style={{ ...inp, flex: 1, minWidth: 220 }} />
              <button onClick={() => setNewDate(d => d === todayStr ? '' : todayStr)} style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '8px 12px', borderRadius: 4, border: `0.5px solid ${newDate === todayStr ? '#C8C2BB' : 'rgba(200,194,187,0.15)'}`, background: newDate === todayStr ? 'rgba(200,194,187,0.08)' : 'transparent', color: newDate === todayStr ? '#C8C2BB' : 'rgba(200,194,187,0.4)', cursor: 'pointer', fontFamily: 'inherit' }}>Today</button>
              <button onClick={() => setNewDate(d => d === tomorrowStr ? '' : tomorrowStr)} style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '8px 12px', borderRadius: 4, border: `0.5px solid ${newDate === tomorrowStr ? '#C8C2BB' : 'rgba(200,194,187,0.15)'}`, background: newDate === tomorrowStr ? 'rgba(200,194,187,0.08)' : 'transparent', color: newDate === tomorrowStr ? '#C8C2BB' : 'rgba(200,194,187,0.4)', cursor: 'pointer', fontFamily: 'inherit' }}>Tomorrow</button>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={inp} />
              <button onClick={addTodo} disabled={!newText.trim()} style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '8px 18px', borderRadius: 4, background: newText.trim() ? '#C8C2BB' : 'rgba(200,194,187,0.1)', color: newText.trim() ? '#111' : 'rgba(200,194,187,0.3)', border: 'none', cursor: newText.trim() ? 'pointer' : 'not-allowed', fontWeight: 500, fontFamily: 'inherit' }}>+ Add</button>
            </div>
          </div>

          {loading ? (
            <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.3)' }}>Loading...</div>
          ) : todos.length === 0 ? (
            <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '40px 28px', textAlign: 'center', color: 'rgba(200,194,187,0.3)', fontSize: 13 }}>Nothing on the list yet</div>
          ) : (
            <>
              {active.length === 0 ? (
                <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, padding: '30px 18px', textAlign: 'center', color: 'rgba(200,194,187,0.3)', fontSize: 13, marginBottom: 24 }}>Nothing open — nice work 🎉</div>
              ) : buckets.map(b => (
                <div key={b.label} style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: BUCKET_COLOR[b.label] }} />
                    <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)' }}>{b.label}</span>
                    <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.2)' }}>{b.items.length}</span>
                  </div>
                  <div style={{ background: '#1A1F28', border: `0.5px solid ${b.label === 'Overdue' ? 'rgba(210,90,90,0.2)' : 'rgba(200,194,187,0.09)'}`, borderRadius: 7, overflow: 'hidden' }}>
                    {b.items.map((t, i) => <TaskRow key={t.id} t={t} i={i} total={b.items.length} />)}
                  </div>
                </div>
              ))}

              {done.length > 0 && (
                <div>
                  <div onClick={() => setShowDone(s => !s)} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: showDone ? 10 : 0, cursor: 'pointer' }}>
                    <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.3)', transform: showDone ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>▸</span>
                    <span style={{ fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.28)' }}>Done</span>
                    <span style={{ fontSize: 10, color: 'rgba(200,194,187,0.2)' }}>{done.length}</span>
                  </div>
                  {showDone && (
                    <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                      {done.map((t, i) => (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < done.length - 1 ? '0.5px solid rgba(200,194,187,0.06)' : 'none' }}>
                          <div onClick={() => toggleTodo(t)} style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px solid rgba(100,200,130,0.5)', background: 'rgba(100,200,130,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                            <span style={{ fontSize: 11, color: 'rgba(100,200,130,0.9)' }}>✓</span>
                          </div>
                          <div style={{ flex: 1, fontSize: 13, color: 'rgba(200,194,187,0.35)', textDecoration: 'line-through' }}>{t.text}</div>
                          <button onClick={() => deleteTodo(t.id)} style={{ fontSize: 16, color: 'rgba(200,194,187,0.3)', background: 'transparent', border: 'none', cursor: 'pointer', lineHeight: 1 }}>×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
