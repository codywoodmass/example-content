'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import StudioSidebar from '../StudioSidebar'
import { notify, confirmDialog, ToastHost, ConfirmHost } from '@/lib/notify'

type Drive = {
  id: string
  name: string
  volume_label: string
  capacity: string
  location: string
  notes: string
}

type Entry = {
  id: string
  drive_id: string
  project_name: string
  folder_path: string
  client: string
  notes: string
}

export default function ArchivePage() {
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
      if (profile?.role !== 'studio') { router.push('/portal/studio'); return }
      setAuthorized(true)
    })
  }, [])

  const [drives, setDrives] = useState<Drive[]>([])
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDriveId, setSelectedDriveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showNewDrive, setShowNewDrive] = useState(false)
  const [newDrive, setNewDrive] = useState({ name: '', volume_label: '', capacity: '', location: '', notes: '' })
  const [savingDrive, setSavingDrive] = useState(false)
  const [importing, setImporting] = useState(false)

  const inp: React.CSSProperties = { background: 'rgba(200,194,187,0.04)', border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: '#C8C2BB', fontFamily: 'inherit', outline: 'none', width: '100%' }
  const lbl: React.CSSProperties = { fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.4)', marginBottom: 6, display: 'block' }

  useEffect(() => { if (authorized) loadAll() }, [authorized])

  async function loadAll() {
    setLoading(true)
    const [d, e] = await Promise.all([
      supabase.from('archive_drives1').select('*').order('created_at', { ascending: true }),
      supabase.from('archive_entries1').select('*').order('created_at', { ascending: true }),
    ])
    if (d.data) { setDrives(d.data); if (!selectedDriveId && d.data.length > 0) setSelectedDriveId(d.data[0].id) }
    if (d.error) notify('Failed to load drives: ' + d.error.message, 'error')
    if (e.data) setEntries(e.data)
    if (e.error) notify('Failed to load archive entries: ' + e.error.message, 'error')
    setLoading(false)
  }

  async function addDrive() {
    if (!newDrive.name.trim()) return
    setSavingDrive(true)
    const { data, error } = await supabase.from('archive_drives1').insert([newDrive]).select().single()
    if (error) { notify('Failed to add drive: ' + error.message, 'error') }
    else if (data) {
      setDrives(p => [...p, data])
      setSelectedDriveId(data.id)
      setShowNewDrive(false)
      setNewDrive({ name: '', volume_label: '', capacity: '', location: '', notes: '' })
    }
    setSavingDrive(false)
  }

  async function updateDrive(id: string, patch: Partial<Drive>) {
    setDrives(p => p.map(d => d.id === id ? { ...d, ...patch } : d))
    const { error } = await supabase.from('archive_drives1').update(patch).eq('id', id)
    if (error) notify('Failed to save: ' + error.message, 'error')
  }

  async function deleteDrive(drive: Drive) {
    const ok = await confirmDialog(`Delete "${drive.name}" and all ${entries.filter(e => e.drive_id === drive.id).length} entries on it? This can't be undone.`)
    if (!ok) return
    const { error } = await supabase.from('archive_drives1').delete().eq('id', drive.id)
    if (error) { notify('Failed to delete: ' + error.message, 'error'); return }
    setDrives(p => p.filter(d => d.id !== drive.id))
    setEntries(p => p.filter(e => e.drive_id !== drive.id))
    if (selectedDriveId === drive.id) setSelectedDriveId(null)
  }

  async function addEntry(driveId: string) {
    const { data, error } = await supabase.from('archive_entries1').insert([{ drive_id: driveId, project_name: '', folder_path: '', client: '', notes: '' }]).select().single()
    if (error) { notify('Failed to add row: ' + error.message, 'error'); return }
    if (data) setEntries(p => [...p, data])
  }

  async function updateEntry(id: string, patch: Partial<Entry>) {
    setEntries(p => p.map(e => e.id === id ? { ...e, ...patch } : e))
    const { error } = await supabase.from('archive_entries1').update(patch).eq('id', id)
    if (error) notify('Failed to save: ' + error.message, 'error')
  }

  async function deleteEntry(id: string) {
    setEntries(p => p.filter(e => e.id !== id))
    const { error } = await supabase.from('archive_entries1').delete().eq('id', id)
    if (error) notify('Failed to delete: ' + error.message, 'error')
  }

  async function importFromSheet() {
    const ok = await confirmDialog('Import the current hard-drive scan from the studio\'s Google Sheet? This adds a drive + its project folders for each tab that isn\'t already set up — existing drives/entries are left alone.')
    if (!ok) return
    setImporting(true)
    try {
      const res = await fetch('/api/archive-import')
      const data = await res.json()
      if (!data.success) { notify('Import failed: ' + data.error, 'error'); setImporting(false); return }
      for (const d of data.drives) {
        let drive = drives.find(dr => dr.name === d.name)
        if (!drive) {
          const { data: created, error } = await supabase.from('archive_drives1').insert([{ name: d.name, volume_label: '', capacity: '', location: '', notes: '' }]).select().single()
          if (error) { notify('Failed to create ' + d.name + ': ' + error.message, 'error'); continue }
          drive = created
          setDrives(p => [...p, created])
        }
        const rows = d.entries.map((en: any) => ({ drive_id: drive!.id, project_name: en.project_name, folder_path: en.folder_path, client: '', notes: '' }))
        if (rows.length > 0) {
          const { data: inserted, error } = await supabase.from('archive_entries1').insert(rows).select()
          if (error) notify('Failed to import entries for ' + d.name + ': ' + error.message, 'error')
          else if (inserted) setEntries(p => [...p, ...inserted])
        }
      }
      notify('Import complete', 'success')
    } catch (e) {
      notify('Import failed', 'error')
    }
    setImporting(false)
  }

  if (!authorized || loading) return <main style={{ background: '#0E1014', minHeight: '100vh' }} />

  const selectedDrive = drives.find(d => d.id === selectedDriveId) || null
  const driveEntries = entries.filter(e => e.drive_id === selectedDriveId)
    .filter(e => !search.trim() || (e.project_name + ' ' + e.folder_path + ' ' + e.client).toLowerCase().includes(search.toLowerCase()))

  return (
    <main style={{ background: '#0E1014', minHeight: '100vh', fontFamily: 'Inter, sans-serif', color: '#C8C2BB', fontSize: 13, display: 'flex' }}>
      <ToastHost />
      <ConfirmHost />
      <StudioSidebar active="archive" />
      <div className="ec-studio-main" style={{ flex: 1, overflowX: 'hidden', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', height: 57, borderBottom: '0.5px solid rgba(200,194,187,0.09)', background: '#14181F', position: 'sticky', top: 0, zIndex: 20 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>Archive</div>
            <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.4)', marginTop: 1 }}>{drives.length} drive{drives.length !== 1 ? 's' : ''} · {entries.length} projects archived</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={importFromSheet} disabled={importing} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 3, background: 'transparent', color: 'rgba(200,194,187,0.6)', border: '0.5px solid rgba(200,194,187,0.2)', cursor: importing ? 'default' : 'pointer', fontFamily: 'inherit' }}>{importing ? 'Importing...' : '⇩ Import from sheet'}</button>
            <button onClick={() => setShowNewDrive(true)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 3, background: '#C8C2BB', color: '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>+ New drive</button>
          </div>
        </div>

        <div style={{ display: 'flex', minHeight: 'calc(100vh - 57px)' }}>
          {/* DRIVE LIST */}
          <div style={{ width: 260, flexShrink: 0, borderRight: '0.5px solid rgba(200,194,187,0.09)', padding: 14 }}>
            {drives.length === 0 && <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.3)', padding: '10px 6px' }}>No drives yet.</div>}
            {drives.map(d => (
              <div key={d.id} onClick={() => setSelectedDriveId(d.id)} style={{ padding: '10px 12px', borderRadius: 6, marginBottom: 4, cursor: 'pointer', background: selectedDriveId === d.id ? 'rgba(61,71,86,0.4)' : 'transparent', border: selectedDriveId === d.id ? '0.5px solid rgba(200,194,187,0.15)' : '0.5px solid transparent' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: selectedDriveId === d.id ? '#fff' : '#C8C2BB' }}>{d.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(200,194,187,0.35)', marginTop: 2 }}>{entries.filter(e => e.drive_id === d.id).length} projects{d.capacity ? ' · ' + d.capacity : ''}</div>
              </div>
            ))}
          </div>

          {/* DETAIL */}
          <div style={{ flex: 1, padding: 24, minWidth: 0 }}>
            {!selectedDrive ? (
              <div style={{ fontSize: 12, color: 'rgba(200,194,187,0.3)' }}>Select a drive, or add a new one.</div>
            ) : (
              <>
                <div className="ec-form-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 18 }}>
                  <div><label style={lbl}>Drive name</label><input style={inp} value={selectedDrive.name} onChange={e => updateDrive(selectedDrive.id, { name: e.target.value })} /></div>
                  <div><label style={lbl}>Volume label</label><input style={inp} value={selectedDrive.volume_label} onChange={e => updateDrive(selectedDrive.id, { volume_label: e.target.value })} placeholder="e.g. ExampleArch" /></div>
                  <div><label style={lbl}>Capacity</label><input style={inp} value={selectedDrive.capacity} onChange={e => updateDrive(selectedDrive.id, { capacity: e.target.value })} placeholder="e.g. 4TB" /></div>
                  <div><label style={lbl}>Physical location</label><input style={inp} value={selectedDrive.location} onChange={e => updateDrive(selectedDrive.id, { location: e.target.value })} placeholder="e.g. Studio safe" /></div>
                  <div style={{ gridColumn: 'span 3' }}><label style={lbl}>Notes</label><input style={inp} value={selectedDrive.notes} onChange={e => updateDrive(selectedDrive.id, { notes: e.target.value })} /></div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button onClick={() => deleteDrive(selectedDrive)} style={{ fontSize: 11, padding: '9px 14px', borderRadius: 4, background: 'transparent', border: '0.5px solid rgba(210,90,90,0.3)', color: 'rgba(210,90,90,0.8)', cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>Delete drive</button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <input style={{ ...inp, width: 260 }} placeholder="Search this drive's projects..." value={search} onChange={e => setSearch(e.target.value)} />
                  <button onClick={() => addEntry(selectedDrive.id)} style={{ fontSize: 11, padding: '7px 14px', borderRadius: 4, background: 'rgba(200,194,187,0.08)', border: '0.5px solid rgba(200,194,187,0.15)', color: '#C8C2BB', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add project row</button>
                </div>

                <div style={{ border: '0.5px solid rgba(200,194,187,0.09)', borderRadius: 7, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1.6fr 1fr 32px', gap: 0, padding: '8px 12px', background: 'rgba(200,194,187,0.04)', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,194,187,0.35)' }}>
                    <div>Project</div><div>Client</div><div>Folder path</div><div>Notes</div><div />
                  </div>
                  {driveEntries.length === 0 ? (
                    <div style={{ padding: '18px 12px', fontSize: 12, color: 'rgba(200,194,187,0.25)' }}>No projects on this drive yet.</div>
                  ) : driveEntries.map((e, i) => (
                    <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1.6fr 1fr 32px', gap: 0, padding: '4px 12px', borderTop: i === 0 ? 'none' : '0.5px solid rgba(200,194,187,0.06)', alignItems: 'center' }}>
                      <input style={{ ...inp, border: 'none', background: 'transparent', padding: '6px 4px' }} value={e.project_name} onChange={ev => updateEntry(e.id, { project_name: ev.target.value })} />
                      <input style={{ ...inp, border: 'none', background: 'transparent', padding: '6px 4px' }} value={e.client} onChange={ev => updateEntry(e.id, { client: ev.target.value })} placeholder="—" />
                      <input style={{ ...inp, border: 'none', background: 'transparent', padding: '6px 4px', fontSize: 11, color: 'rgba(200,194,187,0.5)' }} value={e.folder_path} onChange={ev => updateEntry(e.id, { folder_path: ev.target.value })} />
                      <input style={{ ...inp, border: 'none', background: 'transparent', padding: '6px 4px' }} value={e.notes} onChange={ev => updateEntry(e.id, { notes: ev.target.value })} placeholder="—" />
                      <button onClick={() => deleteEntry(e.id)} title="Delete row" style={{ background: 'transparent', border: 'none', color: 'rgba(210,90,90,0.6)', cursor: 'pointer', fontSize: 14 }}>×</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showNewDrive && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#1A1F28', border: '0.5px solid rgba(200,194,187,0.15)', borderRadius: 10, padding: 28, width: '100%', maxWidth: 440 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', marginBottom: 20 }}>New drive</div>
            <div style={{ marginBottom: 14 }}><label style={lbl}>Drive name</label><input style={inp} value={newDrive.name} onChange={e => setNewDrive(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Arch 4" /></div>
            <div className="ec-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <div><label style={lbl}>Volume label</label><input style={inp} value={newDrive.volume_label} onChange={e => setNewDrive(f => ({ ...f, volume_label: e.target.value }))} /></div>
              <div><label style={lbl}>Capacity</label><input style={inp} value={newDrive.capacity} onChange={e => setNewDrive(f => ({ ...f, capacity: e.target.value }))} placeholder="e.g. 4TB" /></div>
            </div>
            <div style={{ marginBottom: 20 }}><label style={lbl}>Physical location</label><input style={inp} value={newDrive.location} onChange={e => setNewDrive(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Studio safe" /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowNewDrive(false)} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: 'transparent', color: 'rgba(200,194,187,0.4)', border: '0.5px solid rgba(200,194,187,0.15)', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={addDrive} disabled={savingDrive || !newDrive.name.trim()} style={{ fontSize: 11, letterSpacing: '0.09em', textTransform: 'uppercase', padding: '8px 16px', borderRadius: 3, background: savingDrive || !newDrive.name.trim() ? 'rgba(200,194,187,0.1)' : '#C8C2BB', color: savingDrive || !newDrive.name.trim() ? 'rgba(200,194,187,0.3)' : '#111', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}>{savingDrive ? 'Adding...' : 'Add drive'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
