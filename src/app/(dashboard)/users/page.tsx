'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRequireAdmin } from '@/lib/hooks'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

interface User {
  id: string
  name: string
  email: string
  role: 'USER' | 'ADMIN'
  createdAt: string
}

const emptyForm = { name: '', email: '', password: '', role: 'USER' as 'USER' | 'ADMIN' }
const emptyEditForm = { name: '', role: 'USER' as 'USER' | 'ADMIN', password: '' }

export default function UsersPage() {
  const { ready, session } = useRequireAdmin()
  const [users, setUsers]       = useState<User[]>([])
  const [loading, setLoading]   = useState(true)
  const [addModal, setAddModal] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [form, setForm]         = useState(emptyForm)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null)
  const [deleting, setDeleting]           = useState(false)

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { if (ready) load() }, [load, ready])

  function openAdd() {
    setForm(emptyForm)
    setError('')
    setAddModal(true)
  }

  function openEdit(user: User) {
    setEditUser(user)
    setEditForm({ name: user.name, role: user.role, password: '' })
    setError('')
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json()).error ?? 'Failed'); return }
    setAddModal(false)
    load()
  }

  async function updateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!editUser) return
    setError('')
    setSaving(true)
    const body: Record<string, string> = { name: editForm.name, role: editForm.role }
    if (editForm.password) body.password = editForm.password
    const res = await fetch(`/api/admin/users/${editUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setSaving(false)
    if (!res.ok) { setError((await res.json()).error ?? 'Failed'); return }
    setEditUser(null)
    load()
  }

  async function deleteUser() {
    if (!deleteConfirm) return
    setDeleting(true)
    await fetch(`/api/admin/users/${deleteConfirm.id}`, { method: 'DELETE' })
    setDeleting(false)
    setDeleteConfirm(null)
    load()
  }

  if (!ready || loading) {
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
          <h1 className="text-2xl font-bold text-slate-800">Users</h1>
          <p className="text-sm text-slate-500">{users.length} user{users.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openAdd} size="sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </Button>
      </div>

      <div className="space-y-2">
        {users.map((user) => {
          const isSelf = user.id === session?.user?.id
          return (
            <div key={user.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-blue-600">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800">{user.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      user.role === 'ADMIN'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {user.role === 'ADMIN' ? 'Admin' : 'Doctor'}
                    </span>
                    {isSelf && (
                      <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">You</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 truncate">{user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => openEdit(user)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit user"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                {!isSelf && (
                  <button
                    onClick={() => setDeleteConfirm(user)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete user"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add user modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add User">
        <form onSubmit={createUser} className="space-y-4">
          <Input
            label="Full name *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Dr. Jane Smith"
            required
          />
          <Input
            label="Email *"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="jane@hospital.com"
            required
          />
          <Input
            label="Password *"
            type="password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Min. 6 characters"
            required
          />
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'USER' | 'ADMIN' }))}
          >
            <option value="USER">Doctor</option>
            <option value="ADMIN">Admin</option>
          </Select>
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add User</Button>
          </div>
        </form>
      </Modal>

      {/* Edit user modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Edit ${editUser?.name}`}>
        <form onSubmit={updateUser} className="space-y-4">
          <Input
            label="Full name *"
            value={editForm.name}
            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
          <Select
            label="Role"
            value={editForm.role}
            onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as 'USER' | 'ADMIN' }))}
          >
            <option value="USER">Doctor</option>
            <option value="ADMIN">Admin</option>
          </Select>
          <Input
            label="New password"
            type="password"
            value={editForm.password}
            onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="Leave blank to keep current"
          />
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete User">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Delete <strong>{deleteConfirm?.name}</strong>? All their patients and test records will also be deleted.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={deleteUser}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
