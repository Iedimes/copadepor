import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function GET(request: NextRequest) {
  const token = getAuthToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('teamId')

  if (!teamId) {
    return NextResponse.json({ error: 'teamId requerido' }, { status: 400 })
  }

  try {
    const members = await prisma.teamMember.findMany({
      where: { teamId },
      orderBy: { number: 'asc' },
    })

    return NextResponse.json(members)
  } catch (error) {
    console.error('Get members error:', error)
    return NextResponse.json({ error: 'Error al obtener miembros' }, { status: 500 })
  }
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
    const { teamId, name, role, number, phone } = body

    if (!teamId || !name) {
      return NextResponse.json({ error: 'teamId y name requeridos' }, { status: 400 })
    }

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        name,
        role: role || 'PLAYER',
        number: number || null,
        phone: phone || null,
      },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    console.error('Create member error:', error)
    return NextResponse.json({ error: 'Error al crear miembro' }, { status: 500 })
  }
}