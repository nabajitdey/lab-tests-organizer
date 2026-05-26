import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const schema = z.object({
  name:     z.string().min(2).max(100).optional(),
  role:     z.enum(['USER', 'ADMIN']).optional(),
  password: z.string().min(6).max(100).optional(),
})

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), session: null }
  if (session.user.role !== 'ADMIN') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), session: null }
  return { error: null, session }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const body = schema.parse(await req.json())
    const data: Record<string, unknown> = { ...body }
    if (body.password) data.password = await bcrypt.hash(body.password, 12)

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    return NextResponse.json(updated)
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const { error, session } = await requireAdmin()
  if (error) return error

  if (session!.user.id === params.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  await prisma.user.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
