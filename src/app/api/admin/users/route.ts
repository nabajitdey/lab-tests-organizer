import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const schema = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(6).max(100),
  role:     z.enum(['USER', 'ADMIN']).default('USER'),
})

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (session.user.role !== 'ADMIN') return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { session }
}

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: Request) {
  const { error } = await requireAdmin()
  if (error) return error

  try {
    const { name, email, password, role } = schema.parse(await req.json())

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })

    const user = await prisma.user.create({
      data: { name, email, password: await bcrypt.hash(password, 12), role },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    })
    return NextResponse.json(user, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
