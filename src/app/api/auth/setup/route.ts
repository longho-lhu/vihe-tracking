import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createSession, setSessionCookie } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  // Check if any account exists
  const { count } = await supabaseAdmin
    .from('accounts')
    .select('id', { count: 'exact', head: true })

  if (count && count > 0) {
    return Response.json({ error: 'Admin account already exists' }, { status: 400 })
  }

  const { username, password, displayName } = await request.json()
  if (!username || !password) {
    return Response.json({ error: 'Username and password required' }, { status: 400 })
  }
  if (password.length < 6) {
    return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
  }

  const password_hash = await bcrypt.hash(password, 12)

  const { data: account, error } = await supabaseAdmin
    .from('accounts')
    .insert({ username, password_hash, display_name: displayName || username, role: 'admin' })
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  const token = await createSession({
    id: account.id,
    username: account.username,
    displayName: account.display_name,
    role: account.role,
  })

  let response = Response.json({ message: 'Admin account created', user: account }, { status: 201 })
  response = setSessionCookie(response, token)
  return response
}

export async function GET() {
  const { count } = await supabaseAdmin
    .from('accounts')
    .select('id', { count: 'exact', head: true })
  return Response.json({ needsSetup: !count || count === 0 })
}
