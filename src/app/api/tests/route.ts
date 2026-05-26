import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const schema = z.object({
  name:  z.string().min(1).max(150),
  labId: z.string().cuid(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tests = await prisma.test.findMany({
    where: { isGlobal: true },
    include: { lab: { select: { id: true, name: true, closingTime: true, openingTime: true } } },
    orderBy: [{ lab: { closingTime: 'asc' } }, { name: 'asc' }],
  })

  return NextResponse.json(tests)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { name, labId } = schema.parse(await req.json())

    const lab = await prisma.lab.findUnique({ where: { id: labId } })
    if (!lab) return NextResponse.json({ error: 'Lab not found' }, { status: 404 })

    const test = await prisma.test.create({
      data: { name, labId, isGlobal: true },
      include: { lab: { select: { id: true, name: true, closingTime: true, openingTime: true } } },
    })
    return NextResponse.json(test, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
