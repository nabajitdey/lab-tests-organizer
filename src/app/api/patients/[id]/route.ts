import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const schema = z.object({
  name:    z.string().min(1).max(150).optional(),
  wardBed: z.string().max(50).optional().nullable(),
  age:     z.number().int().min(0).max(200).optional().nullable(),
  notes:   z.string().max(500).optional().nullable(),
})

async function ownsPatient(userId: string, patientId: string) {
  const p = await prisma.patient.findUnique({ where: { id: patientId } })
  return p?.userId === userId ? p : null
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await ownsPatient(session.user.id, params.id)
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const full = await prisma.patient.findUnique({
    where: { id: params.id },
    include: {
      patientTests: {
        include: { test: { include: { lab: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  return NextResponse.json(full)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await ownsPatient(session.user.id, params.id)
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const data = schema.parse(await req.json())
    const updated = await prisma.patient.update({ where: { id: params.id }, data })
    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patient = await ownsPatient(session.user.id, params.id)
  if (!patient) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await prisma.patient.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
