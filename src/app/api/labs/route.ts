import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const schema = z.object({
  name:        z.string().min(1).max(100),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:MM'),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const labs = await prisma.lab.findMany({
    where: { isGlobal: true },
    include: { _count: { select: { tests: true } } },
    orderBy: { closingTime: 'asc' },
  })

  return NextResponse.json(labs)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const data = schema.parse(await req.json())
    const lab = await prisma.lab.create({
      data: { ...data, isGlobal: true },
    })
    return NextResponse.json(lab, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
