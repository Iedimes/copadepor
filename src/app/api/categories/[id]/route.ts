import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const categoryPatchSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  sportType: z.string().optional(),
  classificationCriteria: z.string().optional(),
})

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = getAuthToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  const id = params.id

  try {
    const body = await request.json()
    const validated = categoryPatchSchema.parse(body)

    const category = await prisma.category.update({
      where: { id },
      data: validated,
    })

    return NextResponse.json(category)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Update category error:', error)
    return NextResponse.json({ error: 'Error al actualizar la categoría' }, { status: 500 })
  }
}
