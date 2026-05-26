import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Nav } from '@/components/nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-slate-50">
      <Nav />
      {/* Desktop: offset for sidebar; Mobile: offset for bottom nav */}
      <main className="md:ml-56 pb-24 md:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}
