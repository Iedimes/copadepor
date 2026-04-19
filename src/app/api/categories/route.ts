import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const categorySchema = z.object({
  tournamentId: z.string(),
  name: z.string().min(2),
  description: z.string().optional(),
  minAge: z.number().optional(),
  maxAge: z.number().optional(),
})

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tournamentId = searchParams.get('tournamentId')

  const where: Record<string, unknown> = {}
  if (tournamentId) where.tournamentId = tournamentId

  const categories = await prisma.category.findMany({
    where,
    include: {
      tournament: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(categories)
}

export async function POST(request: NextRequest) {
  const token = getAuthToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const validated = categorySchema.parse(body)

    const category = await prisma.category.create({
      data: validated,
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Create category error:', error)
    return NextResponse.json({ error: 'Error al crear categoría' }, { status: 500 })
  }
}