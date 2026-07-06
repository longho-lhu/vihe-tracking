import { getSession, clearSessionCookie } from '@/lib/auth'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ error: 'Not authenticated' }, { status: 401 })
  }
  return Response.json({ user: session })
}

export async function DELETE() {
  let response = Response.json({ message: 'Logged out' })
  response = clearSessionCookie(response)
  return response
}
