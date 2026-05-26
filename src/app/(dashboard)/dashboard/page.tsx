'use client'

import { useEffect, useState, useCallback } from 'react'
import { urgencyStyles, statusStyles, statusLabels, UrgencyLevel } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useRequireUser } from '@/lib/hooks'

interface PatientEntry {
  patientTestId: string
  patient: { id: string; name: string; wardBed: string | null }
  status: string
  notes: string | null
}

interface TestGroup {
  test: { id: string; name: string }
  entries: PatientEntry[]
}

interface LabGroup {
  lab: { id: string; name: string; openingTime: string; closingTime: string }
  timing: {
    status: string
    urgency: UrgencyLevel
    minutesRemaining: number
    label: string
  }
  tests: TestGroup[]
}

const urgencyIcon: Record<string, string> = {
  critical: '🔴',
  high:     '🟠',
  medium:   '🟡',
  low:      '🟢',
  not_open: '🔵',
  closed:   '⚫',
}

const urgencyLabel: Record<string, string> = {
  critical: 'Critical',
  high:     'High',
  medium:   'Medium',
  low:      'Low',
  not_open: 'Not Open',
  closed:   'Closed',
}

export default function DashboardPage() {
  const { ready } = useRequireUser()
  const [data, setData]             = useState<LabGroup[]>([])
  const [loading, setLoading]       = useState(true)
  const [updating, setUpdating]     = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [printTimestamp, setPrintTimestamp] = useState('')

  const fetchData = useCallback(async () => {
    const res = await fetch('/api/dashboard')
    if (res.ok) {
      setData(await res.json())
      setLastRefresh(new Date())
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!ready) return
    fetchData()
    const interval = setInterval(fetchData, 120_000)
    return () => clearInterval(interval)
  }, [fetchData, ready])

  async function updateStatus(patientTestId: string, status: string) {
    setUpdating(patientTestId)
    const res = await fetch(`/api/patient-tests/${patientTestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) await fetchData()
    setUpdating(null)
  }

  function handlePrint() {
    setPrintTimestamp(
      new Date().toLocaleString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    )
    setTimeout(() => window.print(), 50)
  }

  // Split data into active (any non-DONE entry) and completed (all DONE) sections
  const activeData = data.map((group) => ({
    ...group,
    tests: group.tests
      .map((t) => ({ ...t, entries: t.entries.filter((e) => e.status !== 'DONE') }))
      .filter((t) => t.entries.length > 0),
  })).filter((g) => g.tests.length > 0)

  const completedData = data.map((group) => ({
    ...group,
    tests: group.tests
      .map((t) => ({ ...t, entries: t.entries.filter((e) => e.status === 'DONE') }))
      .filter((t) => t.entries.length > 0),
  })).filter((g) => g.tests.length > 0)

  const totalPending = activeData.reduce(
    (sum, g) => sum + g.tests.reduce((s, t) => s + t.entries.filter((e) => e.status === 'PENDING').length, 0),
    0
  )
  const totalSent = activeData.reduce(
    (sum, g) => sum + g.tests.reduce((s, t) => s + t.entries.filter((e) => e.status === 'SAMPLE_COLLECTED').length, 0),
    0
  )
  const totalDone = completedData.reduce(
    (sum, g) => sum + g.tests.reduce((s, t) => s + t.entries.length, 0),
    0
  )

  if (!ready || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-slate-500">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading test board...
        </div>
      </div>
    )
  }

  const hasAnyData = activeData.length > 0 || completedData.length > 0

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">

      {/* Print-only header */}
      <div className="hidden print:block mb-5 pb-4 border-b-2 border-slate-300">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Priority Board</h1>
            <p className="text-sm text-slate-600">Lab Tests Organizer · Ward test management</p>
          </div>
          {printTimestamp && (
            <p className="text-xs text-slate-500 text-right">Printed:<br />{printTimestamp}</p>
          )}
        </div>
      </div>

      {/* Screen header — hidden when printing */}
      <div className="flex items-start justify-between mb-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Priority Board</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Tests sorted by lab closing time — most urgent first
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span className="hidden sm:inline">Save PDF</span>
          </Button>
        </div>
      </div>

      {/* Summary stats */}
      {hasAnyData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-2xl font-bold text-slate-800">
              {activeData.filter((g) => g.timing.status === 'open').length}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Labs Open</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-2xl font-bold text-amber-600">{totalPending}</div>
            <div className="text-xs text-slate-500 mt-0.5">Pending</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{totalSent}</div>
            <div className="text-xs text-slate-500 mt-0.5">Sample Sent</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{totalDone}</div>
            <div className="text-xs text-slate-500 mt-0.5">Completed</div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasAnyData && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="text-5xl mb-4">🧪</div>
          <h3 className="text-lg font-semibold text-slate-700">No pending tests</h3>
          <p className="text-slate-500 text-sm mt-1">
            Add patients and assign tests to see them here
          </p>
          <div className="flex gap-2 justify-center mt-4 print:hidden">
            <Button variant="primary" size="sm" onClick={() => window.location.href = '/patients'}>
              Go to Patients
            </Button>
          </div>
        </div>
      )}

      {/* Active lab groups */}
      <div className="space-y-4">
        {activeData.map(({ lab, timing, tests }) => {
          const styles = urgencyStyles[timing.urgency]
          return (
            <div
              key={lab.id}
              className={`rounded-xl border-2 overflow-hidden break-inside-avoid ${styles.border} ${styles.bg}`}
            >
              {/* Lab header */}
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg print:hidden">{urgencyIcon[timing.urgency]}</span>
                  {/* Print-friendly urgency label */}
                  <span className="hidden print:inline text-xs font-bold uppercase tracking-wide mr-1">
                    [{urgencyLabel[timing.urgency]}]
                  </span>
                  <div>
                    <h2 className={`font-semibold text-base ${styles.text}`}>{lab.name}</h2>
                    <p className={`text-xs mt-0.5 ${styles.text} opacity-80`}>{timing.label}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${styles.badge}`}>
                  {tests.reduce((s, t) => s + t.entries.length, 0)} test{tests.reduce((s, t) => s + t.entries.length, 0) !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Tests within this lab */}
              <div className="bg-white divide-y divide-slate-100">
                {tests.map(({ test, entries }) => (
                  <div key={test.id} className="px-4 py-3">
                    <div className="text-sm font-semibold text-slate-700 mb-2">{test.name}</div>
                    <div className="space-y-1.5">
                      {entries.map((entry) => (
                        <div key={entry.patientTestId}
                          className="flex items-center justify-between gap-2 flex-wrap break-inside-avoid">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0 print:hidden">
                              <span className="text-xs font-bold text-slate-600">
                                {entry.patient.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-medium text-slate-800">{entry.patient.name}</span>
                              {entry.patient.wardBed && (
                                <span className="text-xs text-slate-400 ml-1.5">· {entry.patient.wardBed}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyles[entry.status]}`}>
                              {statusLabels[entry.status]}
                            </span>

                            {/* Action buttons — hidden in print */}
                            <div className="print:hidden flex items-center gap-1.5">
                              {entry.status === 'PENDING' && (
                                <button
                                  onClick={() => updateStatus(entry.patientTestId, 'SAMPLE_COLLECTED')}
                                  disabled={updating === entry.patientTestId}
                                  className="text-xs px-2.5 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
                                >
                                  {updating === entry.patientTestId ? '...' : 'Mark Sent'}
                                </button>
                              )}
                              {entry.status === 'SAMPLE_COLLECTED' && (
                                <>
                                  <button
                                    onClick={() => updateStatus(entry.patientTestId, 'PENDING')}
                                    disabled={updating === entry.patientTestId}
                                    className="text-xs px-2.5 py-1 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors font-medium"
                                  >
                                    {updating === entry.patientTestId ? '...' : 'Undo'}
                                  </button>
                                  <button
                                    onClick={() => updateStatus(entry.patientTestId, 'DONE')}
                                    disabled={updating === entry.patientTestId}
                                    className="text-xs px-2.5 py-1 rounded-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
                                  >
                                    {updating === entry.patientTestId ? '...' : 'Mark Done'}
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Completed section */}
      {completedData.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
              Completed · {totalDone} test{totalDone !== 1 ? 's' : ''}
            </h2>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="space-y-2">
            {completedData.map(({ lab, tests }) => (
              <div key={lab.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden break-inside-avoid">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                  <span className="text-base print:hidden">✅</span>
                  <span className="text-sm font-semibold text-slate-600">{lab.name}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {tests.map(({ test, entries }) => (
                    <div key={test.id} className="px-4 py-3">
                      <div className="text-xs font-semibold text-slate-500 mb-2">{test.name}</div>
                      <div className="space-y-1.5">
                        {entries.map((entry) => (
                          <div key={entry.patientTestId}
                            className="flex items-center justify-between gap-2 flex-wrap break-inside-avoid">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0 print:hidden">
                                <span className="text-xs font-bold text-green-600">
                                  {entry.patient.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <span className="text-sm text-slate-600">{entry.patient.name}</span>
                                {entry.patient.wardBed && (
                                  <span className="text-xs text-slate-400 ml-1.5">· {entry.patient.wardBed}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyles[entry.status]}`}>
                                {statusLabels[entry.status]}
                              </span>
                              <button
                                onClick={() => updateStatus(entry.patientTestId, 'PENDING')}
                                disabled={updating === entry.patientTestId}
                                className="print:hidden text-xs px-2.5 py-1 rounded-full border border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 transition-colors font-medium flex-shrink-0"
                              >
                                {updating === entry.patientTestId ? '...' : 'Reopen'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last refresh — hidden in print */}
      {hasAnyData && (
        <p className="print:hidden text-center text-xs text-slate-400 mt-6">
          Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 2 min
        </p>
      )}
    </div>
  )
}
