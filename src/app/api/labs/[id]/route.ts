import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const schema = z.object({
  name:        z.string().min(1).max(100).optional(),
  openingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
})

async function requireAdmin(session: Awaited<ReturnType<typeof getServerSession>>) {
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (session.user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const denied = await requireAdmin(session)
  if (denied) return denied

  try {
    const data = schema.parse(await req.json())
    const updated = await prisma.lab.update({ where: { id: params.id }, data })
    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  const denied = await requireAdmin(session)
  if (denied) return denied

  await prisma.lab.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
