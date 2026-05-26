import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const schema = z.object({
  patientId: z.string().cuid(),
  testId:    z.string().cuid(),
  notes:     z.string().max(500).optional().nullable(),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { patientId, testId, notes } = schema.parse(await req.json())

    // Verify the patient belongs to this user
    const patient = await prisma.patient.findFirst({
      where: { id: patientId, userId: session.user.id },
    })
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    // Verify the test is accessible to this user
    const test = await prisma.test.findFirst({
      where: {
        id: testId,
        OR: [{ isGlobal: true }, { userId: session.user.id }],
      },
    })
    if (!test) return NextResponse.json({ error: 'Test not found' }, { status: 404 })

    const pt = await prisma.patientTest.create({
      data: { patientId, testId, notes },
      include: {
        test: { include: { lab: true } },
        patient: { select: { id: true, name: true, wardBed: true } },
      },
    })
    return NextResponse.json(pt, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    // P2002 = unique constraint (test already added)
    if ((err as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Test already added for this patient' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
