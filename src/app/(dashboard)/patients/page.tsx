'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRequireUser } from '@/lib/hooks'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { statusStyles, statusLabels } from '@/lib/utils'

interface Lab { id: string; name: string; openingTime: string; closingTime: string }
interface Test { id: string; name: string; lab: Lab }
interface PatientTest {
  id: string; testId: string; status: string; notes: string | null
  test: Test
}
interface Patient {
  id: string; name: string; wardBed: string | null; age: number | null; notes: string | null
  patientTests: PatientTest[]
}

const emptyPatientForm = { name: '', wardBed: '', age: '', notes: '' }

export default function PatientsPage() {
  useRequireUser()
  const [patients, setPatients]   = useState<Patient[]>([])
  const [tests, setTests]         = useState<Test[]>([])
  const [loading, setLoading]     = useState(true)
  const [expanded, setExpanded]   = useState<string | null>(null)
  const [printMode, setPrintMode] = useState(false)
  const [printTimestamp, setPrintTimestamp] = useState('')

  const [patientModal, setPatientModal] = useState(false)
  const [editPatient, setEditPatient]   = useState<Patient | null>(null)
  const [patientForm, setPatientForm]   = useState(emptyPatientForm)
  const [saving, setSaving]             = useState(false)
  const [formError, setFormError]       = useState('')

  const [addTestModal, setAddTestModal]         = useState(false)
  const [addTestPatient, setAddTestPatient]     = useState<Patient | null>(null)
  const [selectedTestIds, setSelectedTestIds]   = useState<Set<string>>(new Set())
  const [testNotes, setTestNotes]               = useState('')
  const [addingTest, setAddingTest]             = useState(false)
  const [addTestError, setAddTestError]         = useState('')
  const [testFilter, setTestFilter]             = useState('')

  const [deleteConfirm, setDeleteConfirm] = useState<Patient | null>(null)
  const [deleting, setDeleting]           = useState(false)

  const load = useCallback(async () => {
    const [pRes, tRes] = await Promise.all([fetch('/api/patients'), fetch('/api/tests')])
    if (pRes.ok) setPatients(await pRes.json())
    if (tRes.ok) setTests(await tRes.json())
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openAddPatient() {
    setEditPatient(null)
    setPatientForm(emptyPatientForm)
    setFormError('')
    setPatientModal(true)
  }

  function openEditPatient(p: Patient) {
    setEditPatient(p)
    setPatientForm({ name: p.name, wardBed: p.wardBed ?? '', age: p.age?.toString() ?? '', notes: p.notes ?? '' })
    setFormError('')
    setPatientModal(true)
  }

  async function savePatient(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    setSaving(true)
    const body = {
      name:    patientForm.name,
      wardBed: patientForm.wardBed || null,
      age:     patientForm.age ? parseInt(patientForm.age) : null,
      notes:   patientForm.notes || null,
    }
    const res = editPatient
      ? await fetch(`/api/patients/${editPatient.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/patients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (!res.ok) { setFormError((await res.json()).error ?? 'Failed'); return }
    setPatientModal(false)
    load()
  }

  async function deletePatient() {
    if (!deleteConfirm) return
    setDeleting(true)
    await fetch(`/api/patients/${deleteConfirm.id}`, { method: 'DELETE' })
    setDeleting(false)
    setDeleteConfirm(null)
    load()
  }

  function openAddTest(p: Patient) {
    setAddTestPatient(p)
    setSelectedTestIds(new Set())
    setTestNotes('')
    setAddTestError('')
    setTestFilter('')
    setAddTestModal(true)
  }

  function toggleTestId(testId: string) {
    setSelectedTestIds((prev) => {
      const next = new Set(prev)
      next.has(testId) ? next.delete(testId) : next.add(testId)
      return next
    })
  }

  async function addTest(e: React.FormEvent) {
    e.preventDefault()
    if (!addTestPatient || selectedTestIds.size === 0) { setAddTestError('Select at least one test'); return }
    setAddingTest(true)
    setAddTestError('')

    const results = await Promise.all(
      Array.from(selectedTestIds).map((testId) =>
        fetch('/api/patient-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patientId: addTestPatient.id, testId, notes: testNotes || null }),
        })
      )
    )

    setAddingTest(false)
    const failed = results.filter((r) => !r.ok).length
    if (failed > 0) { setAddTestError(`${failed} test(s) could not be added (may already be assigned)`); }
    setAddTestModal(false)
    load()
  }

  async function updateTestStatus(ptId: string, status: string) {
    await fetch(`/api/patient-tests/${ptId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    load()
  }

  async function removeTest(ptId: string) {
    await fetch(`/api/patient-tests/${ptId}`, { method: 'DELETE' })
    load()
  }

  async function handlePrint() {
    setPrintTimestamp(
      new Date().toLocaleString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    )
    setPrintMode(true)
    // Wait for React to render all expanded test sections
    await new Promise((r) => setTimeout(r, 250))
    window.print()
    setPrintMode(false)
  }

  // Tests not already assigned to the patient
  const availableTests = tests.filter((t) => {
    if (!addTestPatient) return false
    const assigned = addTestPatient.patientTests.map((pt) => pt.testId)
    if (assigned.includes(t.id)) return false
    if (testFilter) return t.name.toLowerCase().includes(testFilter.toLowerCase()) || t.lab.name.toLowerCase().includes(testFilter.toLowerCase())
    return true
  })

  if (loading) {
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

      {/* Print-only header */}
      <div className="hidden print:block mb-5 pb-4 border-b-2 border-slate-300">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Patients</h1>
            <p className="text-sm text-slate-600">Lab Tests Organizer · {patients.length} patient{patients.length !== 1 ? 's' : ''}</p>
          </div>
          {printTimestamp && (
            <p className="text-xs text-slate-500 text-right">Printed:<br />{printTimestamp}</p>
          )}
        </div>
      </div>

      {/* Screen header — buttons hidden in print */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 print:hidden">Patients</h1>
          <p className="text-sm text-slate-500">{patients.length} patient{patients.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <Button onClick={openAddPatient} size="sm" className="!px-2.5 !py-1.5 sm:!px-3 sm:!py-2 gap-1">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs sm:text-sm">Add Patient</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePrint} className="!px-2.5 !py-1.5 sm:!px-3 sm:!py-2 gap-1">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span className="text-xs sm:text-sm">Save PDF</span>
          </Button>
        </div>
      </div>

      {patients.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-5xl mb-4">👥</div>
          <h3 className="text-lg font-semibold text-slate-700">No patients yet</h3>
          <p className="text-slate-500 text-sm mt-1">Add your first patient to get started</p>
          <Button onClick={openAddPatient} className="mt-4 print:hidden" size="sm">Add Patient</Button>
        </div>
      )}

      <div className="space-y-3">
        {patients.map((patient) => {
          const pendingCount = patient.patientTests.filter((t) => t.status === 'PENDING').length
          const sentCount    = patient.patientTests.filter((t) => t.status === 'SAMPLE_COLLECTED').length
          const isExpanded   = expanded === patient.id
          const showDetails  = isExpanded || printMode

          return (
            <div key={patient.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden break-inside-avoid">
              {/* Patient header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors print:cursor-default print:hover:bg-white"
                onClick={() => !printMode && setExpanded(isExpanded ? null : patient.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 print:hidden">
                    <span className="text-sm font-bold text-blue-700">{patient.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800">{patient.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      {patient.wardBed && <span>Ward/Bed: {patient.wardBed}</span>}
                      {patient.age && <span>Age: {patient.age}y</span>}
                      {(pendingCount > 0 || sentCount > 0) && (
                        <span className="flex items-center gap-1">
                          {pendingCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                              {pendingCount} pending
                            </span>
                          )}
                          {sentCount > 0 && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                              {sentCount} sent
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Action buttons + chevron — hidden in print */}
                <div className="flex items-center gap-2 print:hidden flex-shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditPatient(patient) }}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(patient) }}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                  <svg
                    className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Expanded test list — always visible in printMode */}
              {showDetails && (
                <div className="border-t border-slate-100 p-4">
                  {patient.notes && (
                    <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 mb-3">
                      <span className="font-medium">Notes:</span> {patient.notes}
                    </p>
                  )}

                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-700">Assigned Tests</h3>
                    <Button size="sm" variant="secondary" onClick={() => openAddTest(patient)} className="print:hidden">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Test
                    </Button>
                  </div>

                  {patient.patientTests.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">No tests assigned yet</p>
                  ) : (
                    <div className="space-y-2">
                      {patient.patientTests.map((pt) => (
                        <div key={pt.id}
                          className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-lg flex-wrap break-inside-avoid">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-800">{pt.test.name}</div>
                            <div className="text-xs text-slate-500">{pt.test.lab.name} · closes {pt.test.lab.closingTime}</div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyles[pt.status]}`}>
                              {statusLabels[pt.status]}
                            </span>
                            {/* Status action buttons — hidden in print */}
                            <div className="print:hidden flex items-center gap-1.5">
                              {pt.status === 'PENDING' && (
                                <button
                                  onClick={() => updateTestStatus(pt.id, 'SAMPLE_COLLECTED')}
                                  className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium transition-colors"
                                >Mark Sent</button>
                              )}
                              {pt.status === 'SAMPLE_COLLECTED' && (
                                <button
                                  onClick={() => updateTestStatus(pt.id, 'DONE')}
                                  className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200 font-medium transition-colors"
                                >Mark Done</button>
                              )}
                              <button
                                onClick={() => removeTest(pt.id)}
                                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add/Edit patient modal */}
      <Modal open={patientModal} onClose={() => setPatientModal(false)} title={editPatient ? 'Edit Patient' : 'Add Patient'}>
        <form onSubmit={savePatient} className="space-y-4">
          <Input label="Patient name *" value={patientForm.name} onChange={(e) => setPatientForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Rahul Sharma" required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Ward / Bed" value={patientForm.wardBed} onChange={(e) => setPatientForm((f) => ({ ...f, wardBed: e.target.value }))} placeholder="e.g. W3 B12" />
            <Input label="Age (years)" type="number" min="0" max="200" value={patientForm.age} onChange={(e) => setPatientForm((f) => ({ ...f, age: e.target.value }))} placeholder="e.g. 8" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              className="w-full px-3 py-2.5 md:py-2 text-base md:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3} placeholder="Any relevant clinical notes..."
              value={patientForm.notes}
              onChange={(e) => setPatientForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          {formError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{formError}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={() => setPatientModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editPatient ? 'Save Changes' : 'Add Patient'}</Button>
          </div>
        </form>
      </Modal>

      {/* Add test modal */}
      <Modal open={addTestModal} onClose={() => setAddTestModal(false)} title={`Add Tests — ${addTestPatient?.name}`}>
        <form onSubmit={addTest} className="space-y-4">
          <Input
            label="Search tests"
            value={testFilter}
            onChange={(e) => setTestFilter(e.target.value)}
            placeholder="Type test name or lab name..."
          />
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-slate-700">Select tests *</label>
              {selectedTestIds.size > 0 && (
                <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {selectedTestIds.size} selected
                </span>
              )}
            </div>
            <div className="border border-slate-300 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              {availableTests.length === 0 ? (
                <div className="p-4 text-sm text-slate-400 text-center">
                  {testFilter ? 'No tests match your search' : 'All tests already assigned'}
                </div>
              ) : (
                availableTests.map((t) => (
                  <label
                    key={t.id}
                    className={`flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors hover:bg-slate-50 ${selectedTestIds.has(t.id) ? 'bg-blue-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedTestIds.has(t.id)}
                      onChange={() => toggleTestId(t.id)}
                      className="accent-blue-600 w-4 h-4 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800">{t.name}</div>
                      <div className="text-xs text-slate-500">{t.lab.name} · closes {t.lab.closingTime}</div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Notes (optional)</label>
            <input
              className="w-full px-3 py-2.5 md:py-2 text-base md:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any specific instructions..."
              value={testNotes}
              onChange={(e) => setTestNotes(e.target.value)}
            />
          </div>
          {addTestError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{addTestError}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={() => setAddTestModal(false)}>Cancel</Button>
            <Button type="submit" loading={addingTest} disabled={selectedTestIds.size === 0}>
              Add {selectedTestIds.size > 1 ? `${selectedTestIds.size} Tests` : 'Test'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Patient">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>?
            This will also remove all their assigned tests.
          </p>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={deletePatient}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
