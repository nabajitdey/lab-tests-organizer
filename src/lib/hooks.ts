'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useRequireAdmin() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
    else if (status === 'authenticated' && session?.user?.role !== 'ADMIN') router.replace('/dashboard')
  }, [session, status, router])

  const ready = status === 'authenticated' && session?.user?.role === 'ADMIN'
  return { session, ready }
}

export function useRequireUser() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login')
    else if (status === 'authenticated' && session?.user?.role === 'ADMIN') router.replace('/labs')
  }, [session, status, router])

  const ready = status === 'authenticated' && session?.user?.role !== 'ADMIN'
  return { session, ready }
}
