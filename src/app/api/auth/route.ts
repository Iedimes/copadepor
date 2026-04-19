import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyPassword, generateToken, hashPassword } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: z.enum(['ORGANIZER', 'TEAM_MANAGER', 'PLAYER']).optional(),
})

export async function POST(request: NextRequest) {
  const url = new URL(request.url)
  const isRegister = url.pathname.endsWith('/register') || url.pathname.includes('/auth/register')
  
  if (isRegister) {
    try {
      const body = await request.json()
      const validated = registerSchema.parse(body)

      const existing = await prisma.user.findUnique({
        where: { email: validated.email },
      })

      if (existing) {
        return NextResponse.json({ error: 'El email ya está registrado' }, { status: 400 })
      }

      const hashedPassword = await hashPassword(validated.password)

      const user = await prisma.user.create({
        data: {
          email: validated.email,
          password: hashedPassword,
          name: validated.name,
          role: validated.role || 'TEAM_MANAGER',
        },
      })

      const token = generateToken(user.id, user.role)

      return NextResponse.json({
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        token,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
      }
      console.error('Register error:', error)
      return NextResponse.json({ error: 'Error al registrar usuario' }, { status: 500 })
    }
  }

  // Login
  try {
    const body = await request.json()
    const validated = loginSchema.parse(body)

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    const isValid = await verifyPassword(validated.password, user.password)

    if (!isValid) {
      return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    const token = generateToken(user.id, user.role)

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar },
      token,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Error al iniciar sesión' }, { status: 500 })
  }
}