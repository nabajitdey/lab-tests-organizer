import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getLabTiming, urgencyWeight } from '@/lib/utils'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // All non-DONE patient tests for this user's patients
  const patientTests = await prisma.patientTest.findMany({
    where: {
      patient: { userId: session.user.id },
    },
    include: {
      patient: { select: { id: true, name: true, wardBed: true } },
      test: {
        include: {
          lab: { select: { id: true, name: true, openingTime: true, closingTime: true } },
        },
      },
    },
  })

  // Group by lab
  const labMap = new Map<string, {
    lab: { id: string; name: string; openingTime: string; closingTime: string }
    tests: Map<string, {
      test: { id: string; name: string }
      entries: {
        patientTestId: string
        patient: { id: string; name: string; wardBed: string | null }
        status: string
        notes: string | null
      }[]
    }>
  }>()

  for (const pt of patientTests) {
    const lab = pt.test.lab
    if (!labMap.has(lab.id)) {
      labMap.set(lab.id, { lab, tests: new Map() })
    }
    const labEntry = labMap.get(lab.id)!

    const testId = pt.test.id
    if (!labEntry.tests.has(testId)) {
      labEntry.tests.set(testId, { test: { id: testId, name: pt.test.name }, entries: [] })
    }
    labEntry.tests.get(testId)!.entries.push({
      patientTestId: pt.id,
      patient: pt.patient,
      status: pt.status,
      notes: pt.notes,
    })
  }

  // Build result array and sort by urgency
  const now = new Date()
  const result = Array.from(labMap.values()).map(({ lab, tests }) => {
    const timing = getLabTiming(lab.openingTime, lab.closingTime, now)
    return {
      lab,
      timing,
      tests: Array.from(tests.values()),
    }
  })

  result.sort((a, b) => {
    const wA = urgencyWeight(a.timing.urgency)
    const wB = urgencyWeight(b.timing.urgency)
    if (wA !== wB) return wA - wB
    // Within same urgency, sort by minutes remaining ascending (least time first)
    return a.timing.minutesRemaining - b.timing.minutesRemaining
  })

  return NextResponse.json(result)
}
