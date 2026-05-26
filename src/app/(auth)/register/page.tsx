'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm]       = useState({ name: '', email: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setLoading(false)

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Registration failed')
      return
    }

    router.push('/login?registered=1')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">Create account</h2>
        <p className="text-sm text-slate-500 mt-0.5">Get started with Lab Tests Organizer</p>
      </div>

      <Input
        label="Full name"
        type="text"
        value={form.name}
        onChange={(e) => update('name', e.target.value)}
        placeholder="Dr. Jane Smith"
        required
      />

      <Input
        label="Email"
        type="email"
        value={form.email}
        onChange={(e) => update('email', e.target.value)}
        placeholder="doctor@hospital.com"
        required
        autoComplete="email"
      />

      <Input
        label="Password"
        type="password"
        value={form.password}
        onChange={(e) => update('password', e.target.value)}
        placeholder="Min. 6 characters"
        required
        minLength={6}
        autoComplete="new-password"
      />

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      )}

      <Button type="submit" loading={loading} className="w-full" size="lg">
        Create Account
      </Button>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
