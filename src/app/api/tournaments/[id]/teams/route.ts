import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const teamSchema = z.object({
  teamId: z.string(),
})

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = getAuthToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  try {
    const teams: any = await prisma.$queryRawUnsafe(`
      SELECT tt.*, t.name as teamName, t.id as teamIdReal
      FROM TournamentTeam tt
      JOIN Team t ON tt.teamId = t.id
      WHERE tt.tournamentId = ?
    `, params.id)

    const formattedTeams = teams.map((tt: any) => ({
      id: tt.id,
      tournamentId: tt.tournamentId,
      teamId: tt.teamId,
      groupName: tt.groupName,
      order: tt.order,
      registeredAt: tt.registeredAt,
      status: tt.status,
      team: {
        id: tt.teamIdReal,
        name: tt.teamName
      }
    }))

    return NextResponse.json(formattedTeams)
  } catch (error) {
    console.error('Get tournament teams error:', error)
    return NextResponse.json({ error: 'Error al obtener equipos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const token = getAuthToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
    })

    if (!tournament || tournament.organizerId !== payload.userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const validated = teamSchema.parse(body)

    const existing = await prisma.tournamentTeam.findFirst({
      where: { tournamentId: params.id, teamId: validated.teamId },
    })

    if (existing) {
      return NextResponse.json({ error: 'El equipo ya está registrado' }, { status: 400 })
    }

    const tournamentTeam = await prisma.tournamentTeam.create({
      data: {
        tournamentId: params.id,
        teamId: validated.teamId,
      },
      include: {
        team: true,
      },
    })

    return NextResponse.json(tournamentTeam, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Add team error:', error)
    return NextResponse.json({ error: 'Error al agregar equipo' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const token = getAuthToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  try {
    const { action, teamOrders } = await request.json()

    if (action === 'reorder') {
      // Validar que el usuario sea el organizador
      const tournament = await prisma.tournament.findUnique({
        where: { id: params.id },
      })

      if (!tournament || tournament.organizerId !== payload.userId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
      }

      await Promise.all(
        teamOrders.map((to: { id: string, order: number }) =>
          prisma.$executeRawUnsafe(
            'UPDATE TournamentTeam SET `order` = ? WHERE id = ?',
            to.order, to.id
          )
        )
      )

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (error) {
    console.error('Update teams error details:', error)
    return NextResponse.json({ 
      error: 'Error al actualizar equipos', 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}