'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { timeToMinutes, minutesToDisplay } from '@/lib/utils'

interface Lab {
  id: string
  name: string
  openingTime: string
  closingTime: string
  isGlobal: boolean
  _count: { tests: number }
}

const emptyForm = { name: '', openingTime: '08:00', closingTime: '12:00' }

export default function LabsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [labs, setLabs]       = useState<Lab[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [editLab, setEditLab] = useState<Lab | null>(null)
  const [form, setForm]       = useState(emptyForm)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<Lab | null>(null)
  const [deleting, setDeleting]           = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
  }, [status, router])

  const load = useCallback(async () => {
    const res = await fetch('/api/labs')
    if (res.ok) setLabs(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (status === 'authenticated') load()
  }, [load, status])

  function openAdd() {
    setEditLab(null)
    setForm(emptyForm)
    setError('')
    setModal(true)
  }

  function openEdit(lab: Lab) {
    setEditLab(lab)
    setForm({ name: lab.name, openingTime: lab.openingTime, closingTime: lab.closingTime })
    setError('')
    setModal(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = editLab
      ? await fetch(`/api/labs/${editLab.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      : await fetch('/api/labs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (!res.ok) { setError((await res.json()).error ?? 'Failed'); return }
    setModal(false)
    load()
  }

  async function deleteLab() {
    if (!deleteConfirm) return
    setDeleting(true)
    await fetch(`/api/labs/${deleteConfirm.id}`, { method: 'DELETE' })
    setDeleting(false)
    setDeleteConfirm(null)
    load()
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-500">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading...
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Labs</h1>
          <p className="text-sm text-slate-500">{labs.length} lab{labs.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <Button onClick={openAdd} size="sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Lab
          </Button>
        )}
      </div>

      {labs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-5xl mb-4">🧪</div>
          <h3 className="text-lg font-semibold text-slate-700">No labs yet</h3>
          {isAdmin && <p className="text-slate-500 text-sm mt-1">Add a lab to get started</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {labs.map((lab) => (
            <LabCard key={lab.id} lab={lab} isAdmin={isAdmin} onEdit={openEdit} onDelete={setDeleteConfirm} />
          ))}
        </div>
      )}

      {isAdmin && (
        <>
          <Modal open={modal} onClose={() => setModal(false)} title={editLab ? 'Edit Lab' : 'Add Lab'}>
            <form onSubmit={save} className="space-y-4">
              <Input
                label="Lab name *"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Coagulation Lab"
                required
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Opening time"
                  type="time"
                  value={form.openingTime}
                  onChange={(e) => setForm((f) => ({ ...f, openingTime: e.target.value }))}
                  required
                />
                <Input
                  label="Closing time"
                  type="time"
                  value={form.closingTime}
                  onChange={(e) => setForm((f) => ({ ...f, closingTime: e.target.value }))}
                  required
                />
              </div>
              <p className="text-xs text-slate-500">
                Hours: {minutesToDisplay(timeToMinutes(form.openingTime || '00:00'))} – {minutesToDisplay(timeToMinutes(form.closingTime || '00:00'))}
              </p>
              {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" type="button" onClick={() => setModal(false)}>Cancel</Button>
                <Button type="submit" loading={saving}>{editLab ? 'Save Changes' : 'Add Lab'}</Button>
              </div>
            </form>
          </Modal>

          <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Lab">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Delete <strong>{deleteConfirm?.name}</strong>? All tests in this lab will also be deleted.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button variant="danger" loading={deleting} onClick={deleteLab}>Delete</Button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  )
}

function LabCard({
  lab,
  isAdmin,
  onEdit,
  onDelete,
}: {
  lab: Lab
  isAdmin: boolean
  onEdit: (l: Lab) => void
  onDelete: (l: Lab) => void
}) {
  const open  = minutesToDisplay(timeToMinutes(lab.openingTime))
  const close = minutesToDisplay(timeToMinutes(lab.closingTime))

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <div className="min-w-0">
          <span className="font-semibold text-slate-800">{lab.name}</span>
          <div className="text-xs text-slate-500">
            {open} – {close} · {lab._count?.tests ?? 0} test{(lab._count?.tests ?? 0) !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
      {isAdmin && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(lab)}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit lab"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(lab)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete lab"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
