import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export async function POST(request: NextRequest) {
  console.log('Login API called')
  try {
    const body = await request.json()
    console.log('Body:', body.email)
    const validated = loginSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    })
    console.log('User found:', user?.id)

    if (!user) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    const isValid = await verifyPassword(validated.password, user.password)
    console.log('Password valid:', isValid)

    if (!isValid) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    const token = generateToken(user.id, user.role)
    console.log('Token generated')

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar },
      token,
    })
  } catch (error) {
    console.error('Login error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al iniciar sesión: ' + (error as Error).message }, { status: 500 })
  }
}