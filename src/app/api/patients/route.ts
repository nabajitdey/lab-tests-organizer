import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const schema = z.object({
  name:    z.string().min(1).max(150),
  wardBed: z.string().max(50).optional().nullable(),
  age:     z.number().int().min(0).max(200).optional().nullable(),
  notes:   z.string().max(500).optional().nullable(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patients = await prisma.patient.findMany({
    where: { userId: session.user.id },
    include: {
      patientTests: {
        where: { status: { not: 'DONE' } },
        include: {
          test: { include: { lab: true } },
        },
      },
      _count: { select: { patientTests: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(patients)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = schema.parse(await req.json())
    const patient = await prisma.patient.create({
      data: { ...data, userId: session.user.id },
    })
    return NextResponse.json(patient, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
