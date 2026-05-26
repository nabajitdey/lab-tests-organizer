import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const patchSchema = z.object({
  status: z.enum(['PENDING', 'SAMPLE_COLLECTED', 'DONE']).optional(),
  notes:  z.string().max(500).optional().nullable(),
})

async function ownsPatientTest(userId: string, id: string) {
  const pt = await prisma.patientTest.findUnique({
    where: { id },
    include: { patient: { select: { userId: true } } },
  })
  return pt?.patient.userId === userId ? pt : null
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pt = await ownsPatientTest(session.user.id, params.id)
  if (!pt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const data = patchSchema.parse(await req.json())
    const updated = await prisma.patientTest.update({
      where: { id: params.id },
      data,
      include: {
        test: { include: { lab: true } },
        patient: { select: { id: true, name: true, wardBed: true } },
      },
    })
    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const pt = await ownsPatientTest(session.user.id, params.id)
  if (!pt) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.patientTest.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
