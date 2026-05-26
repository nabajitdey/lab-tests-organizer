'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

interface Lab  { id: string; name: string; openingTime: string; closingTime: string }
interface Test { id: string; name: string; isGlobal: boolean; lab: Lab }

const emptyForm = { name: '', labId: '' }

export default function TestsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [tests, setTests]     = useState<Test[]>([])
  const [labs, setLabs]       = useState<Lab[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [editTest, setEditTest] = useState<Test | null>(null)
  const [form, setForm]       = useState(emptyForm)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<Test | null>(null)
  const [deleting, setDeleting]           = useState(false)
  const [labFilter, setLabFilter]         = useState('all')
  const [search, setSearch]               = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
  }, [status, router])

  const load = useCallback(async () => {
    const [tRes, lRes] = await Promise.all([fetch('/api/tests'), fetch('/api/labs')])
    if (tRes.ok) setTests(await tRes.json())
    if (lRes.ok) setLabs(await lRes.json())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (status === 'authenticated') load()
  }, [load, status])

  function openAdd() {
    setEditTest(null)
    setForm(emptyForm)
    setError('')
    setModal(true)
  }

  function openEdit(t: Test) {
    setEditTest(t)
    setForm({ name: t.name, labId: t.lab.id })
    setError('')
    setModal(true)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = editTest
      ? await fetch(`/api/tests/${editTest.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      : await fetch('/api/tests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setSaving(false)
    if (!res.ok) { setError((await res.json()).error ?? 'Failed'); return }
    setModal(false)
    load()
  }

  async function deleteTest() {
    if (!deleteConfirm) return
    setDeleting(true)
    await fetch(`/api/tests/${deleteConfirm.id}`, { method: 'DELETE' })
    setDeleting(false)
    setDeleteConfirm(null)
    load()
  }

  const filtered = tests.filter((t) => {
    if (labFilter !== 'all' && t.lab.id !== labFilter) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Tests</h1>
          <p className="text-sm text-slate-500">{tests.length} test{tests.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <Button onClick={openAdd} size="sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Test
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          className="flex-1 min-w-[160px] px-3 py-2.5 md:py-2 text-base md:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Search tests..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="px-3 py-2.5 md:py-2 text-base md:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={labFilter}
          onChange={(e) => setLabFilter(e.target.value)}
        >
          <option value="all">All Labs</option>
          {labs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-12">
          {tests.length === 0 ? 'No tests available.' : 'No tests match your filters.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => (
            <TestCard key={t.id} test={t} isAdmin={isAdmin} onEdit={openEdit} onDelete={setDeleteConfirm} />
          ))}
        </div>
      )}

      {isAdmin && (
        <>
          <Modal open={modal} onClose={() => setModal(false)} title={editTest ? 'Edit Test' : 'Add Test'}>
            <form onSubmit={save} className="space-y-4">
              <Input
                label="Test name *"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Serum Ferritin"
                required
              />
              <Select
                label="Lab *"
                value={form.labId}
                onChange={(e) => setForm((f) => ({ ...f, labId: e.target.value }))}
                required
              >
                <option value="">Select a lab...</option>
                {labs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
              </Select>
              {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" type="button" onClick={() => setModal(false)}>Cancel</Button>
                <Button type="submit" loading={saving}>{editTest ? 'Save Changes' : 'Add Test'}</Button>
              </div>
            </form>
          </Modal>

          <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Test">
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Delete <strong>{deleteConfirm?.name}</strong>? It will be removed from all patients.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                <Button variant="danger" loading={deleting} onClick={deleteTest}>Delete</Button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  )
}

function TestCard({
  test,
  isAdmin,
  onEdit,
  onDelete,
}: {
  test: Test
  isAdmin: boolean
  onEdit: (t: Test) => void
  onDelete: (t: Test) => void
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3.5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <span className="font-medium text-slate-800 text-sm">{test.name}</span>
        <div className="text-xs text-slate-500 mt-0.5">
          {test.lab.name} · closes {test.lab.closingTime}
        </div>
      </div>
      {isAdmin && (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onEdit(test)}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(test)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
