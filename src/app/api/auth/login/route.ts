import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createSession, setSessionCookie } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  const { username, password } = await request.json()
  if (!username || !password) {
    return Response.json({ error: 'Username and password required' }, { status: 400 })
  }

  const { data: account, error } = await supabaseAdmin
    .from('accounts')
    .select('*')
    .eq('username', username)
    .single()

  if (error || !account) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, account.password_hash)
  if (!valid) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const token = await createSession({
    id: account.id,
    username: account.username,
    displayName: account.display_name || account.username,
    role: account.role,
  })

  let response = Response.json({
    user: {
      id: account.id,
      username: account.username,
      displayName: account.display_name,
      role: account.role,
    },
  })
  response = setSessionCookie(response, token)
  return response
}
